// ============================================================
// MONDEGA DIGITAL — Core Transaction Engine
// Handles atomic transaction processing with double-spend prevention
// ============================================================

package engine

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/go-redis/redis/v8"
	_ "github.com/lib/pq"
	"github.com/mondega/tx-engine/internal/config"
)

const (
	MaxRetries    = 3
	RetryDelay    = 2 * time.Second
	LockTTL       = 30 * time.Second
	ConfirmBlocks = 3
)

type TransactionStatus string

const (
	StatusPending    TransactionStatus = "pending"
	StatusProcessing TransactionStatus = "processing"
	StatusConfirming TransactionStatus = "confirming"
	StatusCompleted  TransactionStatus = "completed"
	StatusFailed     TransactionStatus = "failed"
)

type ProcessRequest struct {
	TxID            string          `json:"tx_id"`
	FromAddress     string          `json:"from_address"`
	ToAddress       string          `json:"to_address"`
	AmountWei       string          `json:"amount_wei"`
	ContractAddress string          `json:"contract_address"`
	FeeWei          string          `json:"fee_wei"`
	Metadata        map[string]any  `json:"metadata"`
}

type ProcessResult struct {
	TxID        string
	TxHash      string
	BlockNumber uint64
	Status      TransactionStatus
	Error       string
}

type Engine struct {
	cfg      *config.Config
	db       *sql.DB
	redis    *redis.Client
	eth      *ethclient.Client
	mu       sync.Mutex
	inFlight map[string]bool  // in-memory guard for same-process dedup
}

func New(cfg *config.Config) (*Engine, error) {
	// PostgreSQL
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("postgres: %w", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       0,
	})

	// Polygon RPC
	eth, err := ethclient.Dial(cfg.PolygonRPCURL)
	if err != nil {
		return nil, fmt.Errorf("polygon rpc: %w", err)
	}

	return &Engine{
		cfg:      cfg,
		db:       db,
		redis:    rdb,
		eth:      eth,
		inFlight: make(map[string]bool),
	}, nil
}

// Process executes a single transaction atomically.
// Uses Redis distributed lock to prevent double-spend.
func (e *Engine) Process(ctx context.Context, req ProcessRequest) ProcessResult {
	log.Printf("TX [%s] processing: %s → %s | %s wei", req.TxID, req.FromAddress[:8], req.ToAddress[:8], req.AmountWei)

	// 1. Distributed lock — prevent concurrent processing of same tx
	lockKey := fmt.Sprintf("txlock:%s", req.TxID)
	locked, err := e.redis.SetNX(ctx, lockKey, "1", LockTTL).Result()
	if err != nil || !locked {
		return ProcessResult{TxID: req.TxID, Status: StatusFailed, Error: "could not acquire distributed lock"}
	}
	defer e.redis.Del(ctx, lockKey)

	// 2. In-memory dedup
	e.mu.Lock()
	if e.inFlight[req.TxID] {
		e.mu.Unlock()
		return ProcessResult{TxID: req.TxID, Status: StatusFailed, Error: "transaction already in flight"}
	}
	e.inFlight[req.TxID] = true
	e.mu.Unlock()
	defer func() {
		e.mu.Lock()
		delete(e.inFlight, req.TxID)
		e.mu.Unlock()
	}()

	// 3. Update status to processing
	if err := e.updateStatus(ctx, req.TxID, StatusProcessing, ""); err != nil {
		return ProcessResult{TxID: req.TxID, Status: StatusFailed, Error: err.Error()}
	}

	// 4. Execute on-chain with retries
	var txHash string
	var blockNumber uint64

	for attempt := 1; attempt <= MaxRetries; attempt++ {
		txHash, blockNumber, err = e.executeOnChain(ctx, req)
		if err == nil {
			break
		}
		log.Printf("TX [%s] attempt %d/%d failed: %v", req.TxID, attempt, MaxRetries, err)
		if attempt < MaxRetries {
			time.Sleep(RetryDelay * time.Duration(attempt)) // exponential backoff
		}
	}

	if err != nil {
		e.updateStatus(ctx, req.TxID, StatusFailed, err.Error())
		return ProcessResult{TxID: req.TxID, Status: StatusFailed, Error: err.Error()}
	}

	// 5. Update DB with tx hash + completed status
	e.updateStatusWithHash(ctx, req.TxID, StatusCompleted, txHash, blockNumber)

	// 6. Invalidate balance cache in Redis
	e.redis.Del(ctx, fmt.Sprintf("balance:%s", req.FromAddress))
	e.redis.Del(ctx, fmt.Sprintf("balance:%s", req.ToAddress))

	log.Printf("TX [%s] completed ✓ | hash=%s | block=%d", req.TxID, txHash, blockNumber)

	return ProcessResult{
		TxID:        req.TxID,
		TxHash:      txHash,
		BlockNumber: blockNumber,
		Status:      StatusCompleted,
	}
}

func (e *Engine) executeOnChain(ctx context.Context, req ProcessRequest) (string, uint64, error) {
	// Parse signer private key
	privateKey, err := crypto.HexToECDSA(e.cfg.SignerPrivateKey)
	if err != nil {
		return "", 0, fmt.Errorf("invalid signer key: %w", err)
	}

	chainID, err := e.eth.ChainID(ctx)
	if err != nil {
		return "", 0, fmt.Errorf("get chain ID: %w", err)
	}

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return "", 0, fmt.Errorf("create transactor: %w", err)
	}

	// Get nonce
	nonce, err := e.eth.PendingNonceAt(ctx, auth.From)
	if err != nil {
		return "", 0, fmt.Errorf("get nonce: %w", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))

	// Get gas price with 20% bump for faster inclusion
	gasPrice, err := e.eth.SuggestGasPrice(ctx)
	if err != nil {
		return "", 0, fmt.Errorf("gas price: %w", err)
	}
	auth.GasPrice = new(big.Int).Mul(gasPrice, big.NewInt(120))
	auth.GasPrice.Div(auth.GasPrice, big.NewInt(100)) // +20%
	auth.GasLimit = 100000                             // ERC-20 transfer

	// Parse amount
	amount, ok := new(big.Int).SetString(req.AmountWei, 10)
	if !ok {
		return "", 0, fmt.Errorf("invalid amount: %s", req.AmountWei)
	}

	// Build ERC-20 transfer calldata manually (no ABI binding needed for standard transfer)
	toAddr := common.HexToAddress(req.ToAddress)
	contractAddr := common.HexToAddress(req.ContractAddress)

	// transfer(address,uint256) selector = 0xa9059cbb
	transferSelector := []byte{0xa9, 0x05, 0x9c, 0xbb}
	paddedAddr := common.LeftPadBytes(toAddr.Bytes(), 32)
	paddedAmount := common.LeftPadBytes(amount.Bytes(), 32)

	calldata := append(transferSelector, append(paddedAddr, paddedAmount...)...)

	tx := e.buildTx(auth, contractAddr, calldata)

	// Sign and send
	signedTx, err := auth.Signer(auth.From, tx)
	if err != nil {
		return "", 0, fmt.Errorf("sign tx: %w", err)
	}

	if err := e.eth.SendTransaction(ctx, signedTx); err != nil {
		return "", 0, fmt.Errorf("send tx: %w", err)
	}

	// Wait for confirmations
	receipt, err := bind.WaitMined(ctx, e.eth, signedTx)
	if err != nil {
		return "", 0, fmt.Errorf("wait mined: %w", err)
	}

	if receipt.Status == 0 {
		return "", 0, fmt.Errorf("transaction reverted on-chain")
	}

	return signedTx.Hash().Hex(), receipt.BlockNumber.Uint64(), nil
}

func (e *Engine) buildTx(auth *bind.TransactOpts, to common.Address, data []byte) *types.Transaction {
	return types.NewTransaction(
		auth.Nonce.Uint64(),
		to,
		big.NewInt(0), // ETH value = 0 (ERC-20 transfer)
		auth.GasLimit,
		auth.GasPrice,
		data,
	)
}

func (e *Engine) updateStatus(ctx context.Context, txID string, status TransactionStatus, reason string) error {
	_, err := e.db.ExecContext(ctx,
		`UPDATE transactions SET status=$1, failed_reason=$2, updated_at=NOW() WHERE id=$3`,
		string(status), reason, txID,
	)
	return err
}

func (e *Engine) updateStatusWithHash(ctx context.Context, txID string, status TransactionStatus, txHash string, blockNumber uint64) {
	e.db.ExecContext(ctx,
		`UPDATE transactions SET status=$1, tx_hash=$2, block_number=$3, confirmations=3, completed_at=NOW(), updated_at=NOW() WHERE id=$4`,
		string(status), txHash, blockNumber, txID,
	)
}

func (e *Engine) Health() map[string]string {
	status := map[string]string{
		"service":  "tx-engine",
		"database": "ok",
		"redis":    "ok",
		"polygon":  "ok",
	}

	if err := e.db.Ping(); err != nil {
		status["database"] = "error: " + err.Error()
	}

	if err := e.redis.Ping(context.Background()).Err(); err != nil {
		status["redis"] = "error: " + err.Error()
	}

	if _, err := e.eth.ChainID(context.Background()); err != nil {
		status["polygon"] = "error: " + err.Error()
	}

	return status
}
