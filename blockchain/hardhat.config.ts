import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },

  networks: {
    // ── Celo Alfajores / Celo Sepolia (testnet) ──────────────
    // Celo migro a L2 en 2024. Alfajores URL cambia; usar el RPC actual.
    alfajores: {
      url:      "https://alfajores-forno.celo-testnet.org",
      chainId:  44787,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
    },

    // ── Celo Sepolia (nuevo testnet L2, chainId 11142220) ────
    "celo-sepolia": {
      url:      "https://celo-sepolia.drpc.org",
      chainId:  11142220,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
    },

    // ── Celo Mainnet ─────────────────────────────────────────
    celo: {
      url:      "https://forno.celo.org",
      chainId:  42220,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
    },

    // ── Polygon Amoy (testnet) — original target ─────────────
    polygon_amoy: {
      url:      "https://rpc-amoy.polygon.technology",
      chainId:  80002,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : [],
    },
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
