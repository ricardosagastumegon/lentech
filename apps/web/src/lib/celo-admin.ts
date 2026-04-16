/**
 * Cliente Celo server-side — solo para API routes (NO importar en cliente)
 * Maneja: minteo y quema de MEXCOIN firmando con la private key del treasury.
 *
 * Variables de entorno requeridas (sin NEXT_PUBLIC_):
 *   CELO_TREASURY_PRIVATE_KEY   — wallet con rol MINTER y BURNER
 *   MEXCOIN_CONTRACT_ADDRESS    — address del contrato MEXCOIN en Celo
 *   CELO_RPC_URL                — RPC de Celo (mainnet o testnet)
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

// ── Validación de config ──────────────────────────────────────────────────────

function getConfig() {
  const privateKey = process.env.CELO_TREASURY_PRIVATE_KEY;
  const contractAddress = process.env.MEXCOIN_CONTRACT_ADDRESS;
  const rpcUrl = process.env.CELO_RPC_URL;

  if (!privateKey || !contractAddress) {
    throw new Error(
      "Faltan variables de entorno: CELO_TREASURY_PRIVATE_KEY, MEXCOIN_CONTRACT_ADDRESS"
    );
  }

  return {
    privateKey: privateKey as `0x${string}`,
    contractAddress: contractAddress as Address,
    rpcUrl,
  };
}

// ── Clientes viem (server-side) ───────────────────────────────────────────────

function buildClients() {
  const { privateKey, rpcUrl } = getConfig();
  const chain = getChain();
  const account = privateKeyToAccount(privateKey);

  const transport = http(rpcUrl ?? chain.rpcUrls.default.http[0]);

  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ chain, transport, account });

  return { publicClient, walletClient, account };
}

// ── Operaciones públicas ──────────────────────────────────────────────────────

/**
 * Mintea MEXCOIN a una wallet cuando el usuario deposita MXN.
 * amount_mxn: string con 2 decimales, ej. "100.00"
 * Retorna el txHash de la transacción en Celo.
 */
export async function mintMexcoin(
  toAddress: Address,
  amount_mxn: string,
  txRef: string
): Promise<Hash> {
  const { contractAddress } = getConfig();
  const { walletClient, account } = buildClients();

  // MEXCOIN usa 2 decimales (como fiat, no 18 como ETH)
  const amount = parseUnits(amount_mxn, 2);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: MONDEGA_COIN_ABI,
    functionName: "mint",
    args: [toAddress, amount, txRef],
    account,
    chain: getChain(),
  });

  return hash;
}

/**
 * Quema MEXCOIN de una wallet cuando el usuario retira o paga con tarjeta.
 * amount_mxn: string con 2 decimales, ej. "100.00"
 */
export async function burnMexcoin(
  fromAddress: Address,
  amount_mxn: string,
  txRef: string
): Promise<Hash> {
  const { contractAddress } = getConfig();
  const { walletClient, account } = buildClients();

  const amount = parseUnits(amount_mxn, 2);

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: MONDEGA_COIN_ABI,
    functionName: "burnFrom",
    args: [fromAddress, amount, txRef],
    account,
    chain: getChain(),
  });

  return hash;
}

/**
 * Lee el balance MEXCOIN de una wallet (server-side).
 * Retorna string con 2 decimales, ej. "250.00"
 */
export async function getMexcoinBalanceServer(
  address: Address
): Promise<string> {
  const { contractAddress } = getConfig();
  const { publicClient } = buildClients();

  const raw = await publicClient.readContract({
    address: contractAddress,
    abi: MONDEGA_COIN_ABI,
    functionName: "balanceOf",
    args: [address],
  });

  // raw es bigint con 2 decimales: 10000 = 100.00
  const str = raw.toString().padStart(3, "0");
  return str.slice(0, -2) + "." + str.slice(-2);
}
