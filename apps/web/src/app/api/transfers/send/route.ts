/**
 * POST /api/transfers/send
 *
 * Transfiere MEXCOIN de un usuario LEN a otro directamente en Celo.
 * Esta es la operación core de LEN: P2P sin banco, sin intermediario.
 *
 * Flujo:
 *   Usuario A quiere enviar $100 MXN a Usuario B
 *   → Frontend llama a este endpoint con JWT del usuario
 *   → LEN verifica identidad, saldo y límites
 *   → Ejecuta transfer ERC-20 on-chain en Celo
 *   → Registra en Firestore
 *
 * Nota sobre cross-border: Si el destinatario es QUETZA (GT) o LEMPI (HN),
 * se agrega un swap automático en fase 2. Por ahora solo MEXCOIN → MEXCOIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMexcoinBalanceServer } from "@/lib/celo-admin";
import { getDb } from "@/lib/firebase";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  defineChain,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { TransferRequest, ApiResponse } from "@/types/cuenca";

// ── Config Celo ───────────────────────────────────────────────────────────────

const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "Sepolia CELO", symbol: "S-CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://celo-sepolia.drpc.org"] } },
  testnet: true,
});

const celoMainnet = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: ["https://forno.celo.org"] } },
});

// Transfer usa el contrato ERC-20 estándar (el remitente firma con su propia wallet)
// En esta versión server-side, el treasury ejecuta el transfer en nombre del usuario.
// En producción real: el usuario firma desde su wallet (MiniPay/MetaMask).
const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ── Límites de transacción (regulatorio) ─────────────────────────────────────
const LIMITS = {
  single_tx_mxn:  50_000,   // $50,000 MXN por transacción
  daily_mxn:     200_000,   // $200,000 MXN por día (umbral UIF)
};

// ── Autenticación simple por JWT ──────────────────────────────────────────────
function extractUserId(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  // TODO: verificar JWT con jose o jsonwebtoken en producción
  // Por ahora retorna el sub del payload (sin verificar para sandbox)
  try {
    const payload = auth.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    return decoded.sub ?? decoded.user_id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // ── 1. Autenticación ───────────────────────────────────────────────────────
  const userId = extractUserId(req);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Token de autenticación requerido", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  // ── 2. Parsear y validar request ───────────────────────────────────────────
  let body: TransferRequest;
  try {
    body = await req.json() as TransferRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body inválido", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const { from_address, to_address, amount_mxn } = body;

  if (!from_address || !to_address || !amount_mxn) {
    return NextResponse.json(
      { ok: false, error: "from_address, to_address y amount_mxn son requeridos", code: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  const amountNum = parseFloat(amount_mxn);
  if (isNaN(amountNum) || amountNum <= 0) {
    return NextResponse.json(
      { ok: false, error: "amount_mxn debe ser un número positivo", code: "INVALID_AMOUNT" },
      { status: 400 }
    );
  }

  // ── 3. Verificar límites ───────────────────────────────────────────────────
  if (amountNum > LIMITS.single_tx_mxn) {
    return NextResponse.json(
      { ok: false, error: `Límite por transacción: $${LIMITS.single_tx_mxn.toLocaleString()} MXN`, code: "LIMIT_EXCEEDED" },
      { status: 422 }
    );
  }

  // ── 4. Verificar saldo suficiente ──────────────────────────────────────────
  let balance: string;
  try {
    balance = await getMexcoinBalanceServer(from_address as Address);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "No se pudo verificar el saldo", code: "BALANCE_CHECK_FAILED" },
      { status: 500 }
    );
  }

  if (parseFloat(balance) < amountNum) {
    return NextResponse.json(
      { ok: false, error: `Saldo insuficiente. Disponible: ${balance} MEXCOIN`, code: "INSUFFICIENT_BALANCE" },
      { status: 422 }
    );
  }

  // ── 5. Ejecutar transfer on-chain ──────────────────────────────────────────
  // En MiniPay: el usuario firma directamente desde su browser (ver minipay.ts)
  // En este endpoint server-side: el treasury puede ejecutar en nombre del usuario
  // Requiere que el usuario haya dado allowance al treasury (approve) — fase 2.
  // Por ahora, documentamos el flujo y lo conectamos cuando el usuario firma.
  const privateKey = process.env.CELO_TREASURY_PRIVATE_KEY as `0x${string}` | undefined;
  const contractAddress = process.env.MEXCOIN_CONTRACT_ADDRESS as Address | undefined;

  if (!privateKey || !contractAddress) {
    return NextResponse.json(
      { ok: false, error: "Servidor no configurado para transfers server-side", code: "NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const chain = process.env.CELO_ENV === "mainnet" ? celoMainnet : celoSepolia;
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ chain, transport: http(), account });

  let txHash: string;
  try {
    txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [to_address as Address, parseUnits(amountNum.toFixed(2), 2)],
      account,
      chain,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { ok: false, error: `Transfer fallido: ${message}`, code: "TRANSFER_FAILED" },
      { status: 500 }
    );
  }

  // ── 6. Registrar en Firestore ──────────────────────────────────────────────
  const db = getDb();
  const txDocRef = doc(db, "len_transactions", txHash);
  await setDoc(txDocRef, {
    type:          "transfer",
    from_user_id:  userId,
    from_address,
    to_address,
    amount_mxn:    amountNum.toFixed(2),
    amount_token:  amountNum.toFixed(2),
    token:         "MEXCOIN",
    tx_hash:       txHash,
    network:       chain.name,
    status:        "completed",
    created_at:    serverTimestamp(),
  });

  console.log(`[transfer] ✓ ${amountNum.toFixed(2)} MEXCOIN | ${from_address} → ${to_address} | tx: ${txHash}`);

  return NextResponse.json({
    ok: true,
    data: {
      from_address,
      to_address,
      amount_mxn:   amountNum.toFixed(2),
      mexcoin_sent: amountNum.toFixed(2),
      celo_tx_hash: txHash,
      explorer_url: `https://celo-sepolia.blockscout.com/tx/${txHash}`,
    },
  });
}
