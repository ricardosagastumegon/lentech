// Deploy remaining coins to the already-deployed MondegaFactory
// Factory: 0x02Ec604E61c65E31618B74E47F7C861928C5AaEB

import { ethers } from "hardhat";
import { MondegaFactory } from "../typechain-types";

const FACTORY_ADDRESS = "0x02Ec604E61c65E31618B74E47F7C861928C5AaEB";

const REMAINING_COINS = [
  {
    name:      "Cori",
    symbol:    "CORI",
    code:      "CORI",
    fiatPeg:   "CRC",
    country:   "Costa Rica",
    maxSupply: ethers.parseUnits("10000000000", 2),
  },
  {
    name:      "Dolar Digital",
    symbol:    "DOLAR",
    code:      "DOLAR",
    fiatPeg:   "USD",
    country:   "Regional",
    maxSupply: ethers.parseUnits("1000000000", 2),
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("MONDEGA — Deploy remaining coins to existing Factory");
  console.log("=".repeat(60));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Factory:  ${FACTORY_ADDRESS}`);

  const factory = await ethers.getContractAt("MondegaFactory", FACTORY_ADDRESS) as MondegaFactory;

  const deployed: Record<string, string> = {
    factory:  FACTORY_ADDRESS,
    QUETZA:   "0xba45b516C4fC485231863681B5ECc4E385105a13",
    MEXCOIN:  "0xAa0fF59Bbe62373D0954801abb51331d323f41A9",
    LEMPI:    "0x7d120f4e63937e944Fa5b1Ad97D38aC1C16D2e1A",
    NICORD:   "0x19de414D35820286ff5b274c7832dc653acaC76E",
    TIKAL:    "0xF1C588c10Ad6892267d0e49E24F58169F33deb9D",
  };

  // Get COLON address from factory (was deployed in first run)
  try {
    const colonAddr = await factory.getCoin("COLON");
    deployed["COLON"] = colonAddr;
    console.log(`COLON (already deployed): ${colonAddr}`);
  } catch {
    console.log("Could not retrieve COLON address");
  }

  for (const coin of REMAINING_COINS) {
    process.stdout.write(`Deploying ${coin.code} (${coin.name})...`);
    try {
      const tx = await factory.deployCoin(
        coin.name,
        coin.symbol,
        coin.code,
        coin.fiatPeg,
        coin.country,
        coin.maxSupply,
        deployer.address,
        deployer.address,
      );
      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        console.log(` ✗ Transaction reverted`);
        continue;
      }
      // Extract address from CoinDeployed event (avoids RPC lag issue with getCoin)
      const iface = factory.interface;
      let addr = "";
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
          if (parsed?.name === "CoinDeployed") {
            addr = parsed.args[1] as string;
            break;
          }
        } catch { /* skip non-matching logs */ }
      }
      if (!addr) {
        // Fallback: wait 3s and try getCoin
        await new Promise(r => setTimeout(r, 3000));
        addr = await factory.getCoin(coin.code);
      }
      deployed[coin.code] = addr;
      console.log(` ✓ ${addr}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(` ✗ ERROR: ${msg.slice(0, 80)}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("COMPLETE — All addresses:");
  console.log("=".repeat(60));
  console.log(JSON.stringify(deployed, null, 2));

  const fs = await import("fs");
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(
    "./deployments/addresses.json",
    JSON.stringify({ ...deployed, deployedAt: new Date().toISOString() }, null, 2),
  );
  console.log("\nSaved to ./deployments/addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
