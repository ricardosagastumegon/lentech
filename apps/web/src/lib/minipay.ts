/**
 * MiniPay Integration — LEN
 *
 * MiniPay inyecta window.ethereum igual que MetaMask,
 * pero con window.ethereum.isMiniPay === true.
 *
 * Flujo Mexico:
 *   Usuario tiene cUSD en MiniPay
 *   → LEN lee su address de Celo
 *   → LEN muestra balance MEXCOIN del contrato
 *   → Envio P2P via smart contract en Celo
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
  type Address,
} from "viem";
import { celo, celoAlfajores } from "viem/chains";

// ── Addresses de contratos ────────────────────────────────────────────────────
// Llenar con las direcciones reales despues del deploy en Celo
// Deploy pendiente: Alfajores deprecated → usar Celo Sepolia cuando este disponible
export const CELO_CONTRACTS = {
  alfajores: {
    factory:  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_ALFAJORES ?? "") as Address,
    MEXCOIN:  (process.env.NEXT_PUBLIC_MEXCOIN_ADDRESS ?? "") as Address,
    QUETZA:   (process.env.NEXT_PUBLIC_QUETZA_ADDRESS ?? "") as Address,
    LEMPI:    (process.env.NEXT_PUBLIC_LEMPI_ADDRESS ?? "") as Address,
  },
  mainnet: {
    factory:  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS_MAINNET ?? "") as Address,
    MEXCOIN:  (process.env.NEXT_PUBLIC_MEXCOIN_ADDRESS_MAINNET ?? "") as Address,
    QUETZA:   (process.env.NEXT_PUBLIC_QUETZA_ADDRESS_MAINNET ?? "") as Address,
    LEMPI:    (process.env.NEXT_PUBLIC_LEMPI_ADDRESS_MAINNET ?? "") as Address,
  },
} as const;

export const CELO_CHAIN_IDS = {
  alfajores: 44787,
  mainnet:   42220,
} as const;

// ── ABI minimo ERC-20 (con 2 decimals como fiat) ─────────────────────────────
export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

// ── Deteccion de entorno ──────────────────────────────────────────────────────

/** Detecta si el usuario esta dentro de MiniPay */
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as any).ethereum;
  return !!(eth && eth.isMiniPay);
}

/** Detecta si hay cualquier wallet Celo compatible */
export function hasCeloWallet(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).ethereum;
}

/** Retorna el ambiente actual (alfajores o mainnet) segun la env var */
export function getCeloEnv(): "alfajores" | "mainnet" {
  return (process.env.NEXT_PUBLIC_CELO_ENV ?? "alfajores") === "mainnet"
    ? "mainnet"
    : "alfajores";
}

export function getActiveContracts() {
  return CELO_CONTRACTS[getCeloEnv()];
}

// ── Clientes viem ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _publicClient: any = null;

/** Crea o reutiliza un publicClient para leer la chain */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPublicClient(): any {
  if (_publicClient) return _publicClient;
  const chain = getCeloEnv() === "mainnet" ? celo : celoAlfajores;
  _publicClient = createPublicClient({ chain, transport: http() });
  return _publicClient;
}

/** Crea un walletClient usando el provider de MiniPay/MetaMask */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getWalletClient(): any | null {
  if (!hasCeloWallet()) return null;
  const chain = getCeloEnv() === "mainnet" ? celo : celoAlfajores;
  return createWalletClient({
    chain,
    transport: custom((window as any).ethereum),
  });
}

// ── Wallet helpers ────────────────────────────────────────────────────────────

/** Solicita acceso a la wallet y retorna la address del usuario */
export async function connectWallet(): Promise<Address | null> {
  if (!hasCeloWallet()) return null;
  try {
    const accounts: Address[] = await (window as any).ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

/** Retorna la address conectada sin pedir permiso */
export async function getConnectedAddress(): Promise<Address | null> {
  if (!hasCeloWallet()) return null;
  try {
    const accounts: Address[] = await (window as any).ethereum.request({
      method: "eth_accounts",
    });
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

/** Obtiene el chainId actual */
export async function getCeloChainId(): Promise<number | null> {
  if (!hasCeloWallet()) return null;
  try {
    const chainId: string = await (window as any).ethereum.request({
      method: "eth_chainId",
    });
    return parseInt(chainId, 16);
  } catch {
    return null;
  }
}

/** Verifica que el usuario este en Celo (mainnet o alfajores) */
export async function isOnCelo(): Promise<boolean> {
  const chainId = await getCeloChainId();
  return (
    chainId === CELO_CHAIN_IDS.mainnet ||
    chainId === CELO_CHAIN_IDS.alfajores
  );
}

// ── Balance y transferencias ──────────────────────────────────────────────────

/** Lee el balance MEXCOIN de una address. Retorna el valor formateado (2 decimals). */
export async function getMexcoinBalance(
  userAddress: Address,
): Promise<string> {
  const contracts = getActiveContracts();
  if (!contracts.MEXCOIN) return "0.00";
  try {
    const client = getPublicClient();
    const raw = await client.readContract({
      address: contracts.MEXCOIN,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [userAddress],
    });
    return formatUnits(raw as bigint, 2); // decimals = 2
  } catch {
    return "0.00";
  }
}

/** Envia MEXCOIN de la wallet conectada a otra address.
 *  amount: string con formato "100.00"
 *  Retorna el txHash o null en error.
 */
export async function sendMexcoin(
  from: Address,
  to: Address,
  amount: string,
): Promise<`0x${string}` | null> {
  const contracts = getActiveContracts();
  if (!contracts.MEXCOIN) return null;
  const walletClient = getWalletClient();
  if (!walletClient) return null;
  try {
    const amountUnits = parseUnits(amount, 2);
    const chain = getCeloEnv() === "mainnet" ? celo : celoAlfajores;
    const hash = await walletClient.writeContract({
      address: contracts.MEXCOIN,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, amountUnits],
      account: from,
      chain,
    });
    return hash;
  } catch {
    return null;
  }
}
