/**
 * Cliente Celo server-side — solo para API routes (NO importar en cliente)
 * Maneja: minteo y quema de MEXCOIN, QUETZA, LEMPI firmando con la
 * private key del treasury.
 *
 * Variables de entorno requeridas (sin NEXT_PUBLIC_):
 *   CELO_TREASURY_PRIVATE_KEY   — wallet con rol MINTER y BURNER
 *   MEXCOIN_CONTRACT_ADDRESS    — address del contrato MEXCOIN en Celo
 *   QUETZA_CONTRACT_ADDRESS     — address del contrato QUETZA en Celo
 *   LEMPI_CONTRACT_ADDRESS      — address del contrato LEMPI en Celo
 *   CELO_RPC_URL                — RPC de Celo (opcional, usa default si no)
 *   CELO_ENV                    — "mainnet" | "testnet" (default testnet)
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  defineChain,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ── Chain config ──────────────────────────────────────────────────────────────

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

function getChain() {
  return process.env.CELO_ENV === "mainnet" ? celoMainnet : celoSepolia;
}

// ── ABI mínimo del contrato MondegaCoin ───────────────────────────────────────

const MONDEGA_COIN_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
      { name: "txRef",  type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "burnFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from",   type: "address" },
      { name: "amount", type: "uint256" },
      { name: "txRef",  type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Token registry ────────────────────────────────────────────────────────────

export type TokenSymbol = "MEXCOIN" | "QUETZA" | "LEMPI";

interface TokenConfig {
  symbol:     TokenSymbol;
  envVarName: string;
  country:    "MX" | "GT" | "HN";
  fiatPeg:    "MXN" | "GTQ" | "HNL";
}

const TOKEN_REGISTRY: Record<TokenSymbol, TokenConfig> = {
  MEXCOIN: { symbol: "MEXCOIN", envVarName: "MEXCOIN_CONTRACT_ADDRESS", country: "MX", fiatPeg: "MXN" },
  QUETZA:  { symbol: "QUETZA",  envVarName: "QUETZA_CONTRACT_ADDRESS",  country: "GT", fiatPeg: "GTQ" },
  LEMPI:   { symbol: "LEMPI",   envVarName: "LEMPI_CONTRACT_ADDRESS",   country: "HN", fiatPeg: "HNL" },
};

// ── Validación de config ──────────────────────────────────────────────────────

function getTreasuryConfig() {
  const privateKey = process.env.CELO_TREASURY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Falta CELO_TREASURY_PRIVATE_KEY en environment");
  }
  return {
    privateKey: privateKey as `0x${string}`,
    rpcUrl:     process.env.CELO_RPC_URL,
  };
}

function getTokenAddress(token: TokenSymbol): Address {
  const cfg = TOKEN_REGISTRY[token];
  const addr = process.env[cfg.envVarName];
  if (!addr) {
    throw new Error(`Falta ${cfg.envVarName} en environment`);
  }
  return addr as Address;
}

// ── Clientes viem (server-side) ───────────────────────────────────────────────

function buildClients() {
  const { privateKey, rpcUrl } = getTreasuryConfig();
  const chain   = getChain();
  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl ?? chain.rpcUrls.default.http[0]);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ chain, transport, account });
  return { publicClient, walletClient, account };
}

// ── Operaciones genéricas ─────────────────────────────────────────────────────

/**
 * Mintea cualquier token LEN (MEXCOIN, QUETZA, LEMPI) a una wallet.
 * amount: string con 2 decimales, ej. "100.00"
 */
export async function mintToken(
  token:     TokenSymbol,
  toAddress: Address,
  amount:    string,
  txRef:     string,
): Promise<Hash> {
  const contractAddress = getTokenAddress(token);
  const { walletClient, account } = buildClients();

  const amountUnits = parseUnits(amount, 2);

  const hash = await walletClient.writeContract({
    address:      contractAddress,
    abi:          MONDEGA_COIN_ABI,
    functionName: "mint",
    args:         [toAddress, amountUnits, txRef],
    account,
    chain:        getChain(),
  });

  return hash;
}

/**
 * Quema cualquier token LEN de una wallet.
 * amount: string con 2 decimales, ej. "100.00"
 */
export async function burnToken(
  token:       TokenSymbol,
  fromAddress: Address,
  amount:      string,
  txRef:       string,
): Promise<Hash> {
  const contractAddress = getTokenAddress(token);
  const { walletClient, account } = buildClients();

  const amountUnits = parseUnits(amount, 2);

  const hash = await walletClient.writeContract({
    address:      contractAddress,
    abi:          MONDEGA_COIN_ABI,
    functionName: "burnFrom",
    args:         [fromAddress, amountUnits, txRef],
    account,
    chain:        getChain(),
  });

  return hash;
}

/**
 * Lee el balance de un token de una wallet.
 * Retorna string con 2 decimales.
 */
export async function getTokenBalance(
  token:   TokenSymbol,
  address: Address,
): Promise<string> {
  const contractAddress = getTokenAddress(token);
  const { publicClient } = buildClients();

  const raw = await publicClient.readContract({
    address:      contractAddress,
    abi:          MONDEGA_COIN_ABI,
    functionName: "balanceOf",
    args:         [address],
  });

  const str = raw.toString().padStart(3, "0");
  return str.slice(0, -2) + "." + str.slice(-2);
}

// ── Wrappers retro-compatibles (no romper webhooks existentes) ───────────────

export async function mintMexcoin(toAddress: Address, amount: string, txRef: string): Promise<Hash> {
  return mintToken("MEXCOIN", toAddress, amount, txRef);
}

export async function burnMexcoin(fromAddress: Address, amount: string, txRef: string): Promise<Hash> {
  return burnToken("MEXCOIN", fromAddress, amount, txRef);
}

export async function mintQuetza(toAddress: Address, amount: string, txRef: string): Promise<Hash> {
  return mintToken("QUETZA", toAddress, amount, txRef);
}

export async function burnQuetza(fromAddress: Address, amount: string, txRef: string): Promise<Hash> {
  return burnToken("QUETZA", fromAddress, amount, txRef);
}

export async function mintLempi(toAddress: Address, amount: string, txRef: string): Promise<Hash> {
  return mintToken("LEMPI", toAddress, amount, txRef);
}

export async function burnLempi(fromAddress: Address, amount: string, txRef: string): Promise<Hash> {
  return burnToken("LEMPI", fromAddress, amount, txRef);
}

export async function getMexcoinBalanceServer(address: Address): Promise<string> {
  return getTokenBalance("MEXCOIN", address);
}

// ── Helpers de utilidad ───────────────────────────────────────────────────────

export function getTokenForCountry(country: "MX" | "GT" | "HN"): TokenSymbol {
  switch (country) {
    case "MX": return "MEXCOIN";
    case "GT": return "QUETZA";
    case "HN": return "LEMPI";
  }
}

export function getTokenInfo(token: TokenSymbol): TokenConfig {
  return TOKEN_REGISTRY[token];
}
