// ============================================================
// MONDEGA — Resume deployment on Celo Mainnet
// Reads existing Factory state and deploys only missing coins
// for Phase 1 (MEXCOIN, QUETZA, LEMPI).
// Uses CoinDeployed event log to extract addresses.
// ============================================================

import { ethers } from "hardhat";
import { MondegaFactory } from "../typechain-types";

const FACTORY_ADDRESS = "0xf1B15A9DB771c83c8C7197f5A9fC703b16FC70f3";

const PHASE_1_COINS = [
  {
    name:      "Quetzal Digital",
    symbol:    "QUETZA",
    code:      "QUETZA",
    fiatPeg:   "GTQ",
    country:   "Guatemala",
    maxSupply: ethers.parseUnits("500000000", 2),
  },
  {
    name:      "MexCoin",
    symbol:    "MEXCOIN",
    code:      "MEXCOIN",
    fiatPeg:   "MXN",
    country:   "Mexico",
    maxSupply: ethers.parseUnits("5000000000", 2),
  },
  {
    name:      "Lempi",
    symbol:    "LEMPI",
    code:      "LEMPI",
    fiatPeg:   "HNL",
    country:   "Honduras",
    maxSupply: ethers.parseUnits("500000000", 2),
  },
];

async function tryGetCoin(factory: MondegaFactory, code: string): Promise<string | null> {
  try {
    return await factory.getCoin(code);
  } catch {
    return null;
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasuryAddr   = deployer.address;
  const complianceAddr = deployer.address;

  console.log("=".repeat(60));
  console.log("MONDEGA — Resume Mainnet Deploy");
  console.log("=".repeat(60));
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Factory:   ${FACTORY_ADDRESS}`);
  console.log(`Network:   celo mainnet`);

  const factory = (await ethers.getContractAt(
    "MondegaFactory",
    FACTORY_ADDRESS,
  )) as unknown as MondegaFactory;

  const deployed: Record<string, string> = { factory: FACTORY_ADDRESS };

  for (const coin of PHASE_1_COINS) {
    process.stdout.write(`\n  ${coin.code} (${coin.fiatPeg}): `);

    const existing = await tryGetCoin(factory, coin.code);
    if (existing && existing !== ethers.ZeroAddress) {
      console.log(`already deployed → ${existing}`);
      deployed[coin.code] = existing;
      continue;
    }

    process.stdout.write("deploying... ");
    const tx = await factory.deployCoin(
      coin.name,
      coin.symbol,
      coin.code,
      coin.fiatPeg,
      coin.country,
      coin.maxSupply,
      treasuryAddr,
      complianceAddr,
    );
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      console.log("FAILED");
      throw new Error(`Deploy ${coin.code} failed: status ${receipt?.status}`);
    }

    // Extract address from CoinDeployed event log
    const factoryIface = factory.interface;
    let coinAddr: string | null = null;
    for (const log of receipt.logs) {
      try {
        const parsed = factoryIface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "CoinDeployed") {
          coinAddr = parsed.args.contractAddress as string;
          break;
        }
      } catch {
        // not our event, skip
      }
    }

    if (!coinAddr) {
      // fallback: query factory after small delay
      await new Promise(r => setTimeout(r, 3000));
      coinAddr = await tryGetCoin(factory, coin.code);
    }

    if (!coinAddr || coinAddr === ethers.ZeroAddress) {
      throw new Error(`Could not retrieve address for ${coin.code}`);
    }

    console.log(`✓ ${coinAddr} (gas: ${receipt.gasUsed.toString()})`);
    deployed[coin.code] = coinAddr;
  }

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOY COMPLETE — Phase 1 coins on Celo Mainnet");
  console.log("=".repeat(60));
  console.log(JSON.stringify(deployed, null, 2));

  const fs = await import("fs");
  fs.writeFileSync(
    "./deployments/addresses.celo-mainnet.json",
    JSON.stringify({
      network:    "celo-mainnet",
      chainId:    42220,
      ...deployed,
      deployedAt: new Date().toISOString(),
    }, null, 2),
  );
  console.log("\n✓ Saved to ./deployments/addresses.celo-mainnet.json");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Resume failed:", err);
    process.exit(1);
  });
