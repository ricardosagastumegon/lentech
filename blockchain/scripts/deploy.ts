// ============================================================
// MONDEGA DIGITAL — Deployment Script
// Deploys MondegaFactory and all 8 digital coins to Polygon
// Usage: npx hardhat run scripts/deploy.ts --network polygon_amoy
// ============================================================

import { ethers } from "hardhat";
import { MondegaFactory } from "../typechain-types";

const COINS = [
  {
    name:      "Quetzal Digital",
    symbol:    "QUETZA",
    code:      "QUETZA",
    fiatPeg:   "GTQ",
    country:   "Guatemala",
    maxSupply: ethers.parseUnits("500000000", 2),  // 500M initial cap (2 decimals)
  },
  {
    name:      "MexCoin",
    symbol:    "MEXCOIN",
    code:      "MEXCOIN",
    fiatPeg:   "MXN",
    country:   "Mexico",
    maxSupply: ethers.parseUnits("5000000000", 2), // 5B (larger economy)
  },
  {
    name:      "Lempi",
    symbol:    "LEMPI",
    code:      "LEMPI",
    fiatPeg:   "HNL",
    country:   "Honduras",
    maxSupply: ethers.parseUnits("500000000", 2),
  },
  {
    name:      "Colon Digital",
    symbol:    "COLON",
    code:      "COLON",
    fiatPeg:   "SVC",
    country:   "El Salvador",
    maxSupply: ethers.parseUnits("100000000", 2),
  },
  {
    name:      "NiCord",
    symbol:    "NICORD",
    code:      "NICORD",
    fiatPeg:   "NIO",
    country:   "Nicaragua",
    maxSupply: ethers.parseUnits("200000000", 2),
  },
  {
    name:      "Tikal",
    symbol:    "TIKAL",
    code:      "TIKAL",
    fiatPeg:   "BZD",
    country:   "Belize",
    maxSupply: ethers.parseUnits("50000000", 2),
  },
  {
    name:      "Cori",
    symbol:    "CORI",
    code:      "CORI",
    fiatPeg:   "CRC",
    country:   "Costa Rica",
    maxSupply: ethers.parseUnits("10000000000", 2), // 10B (CRC is low-value currency)
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
  const [deployer, treasury, compliance] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("MONDEGA DIGITAL — Deployment");
  console.log("=".repeat(60));
  console.log(`Deployer:   ${deployer.address}`);
  console.log(`Treasury:   ${treasury?.address ?? deployer.address}`);
  console.log(`Compliance: ${compliance?.address ?? deployer.address}`);
  console.log(`Network:    ${(await ethers.provider.getNetwork()).name}`);

  const treasuryAddr   = treasury?.address   ?? deployer.address;
  const complianceAddr = compliance?.address ?? deployer.address;

  // 1. Deploy Factory
  console.log("\n[1/2] Deploying MondegaFactory...");
  const Factory = await ethers.getContractFactory("MondegaFactory");
  const factory = await Factory.deploy(deployer.address) as MondegaFactory;
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log(`      ✓ MondegaFactory: ${factoryAddr}`);

  // 2. Deploy each coin
  console.log("\n[2/2] Deploying digital coins...");
  const deployed: Record<string, string> = { factory: factoryAddr };

  for (const coin of COINS) {
    process.stdout.write(`      Deploying ${coin.code} (${coin.name})...`);
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
    await tx.wait();
    const addr = await factory.getCoin(coin.code);
    deployed[coin.code] = addr;
    console.log(` ✓ ${addr}`);
  }

  // 3. Print deployment summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE — Save these addresses!");
  console.log("=".repeat(60));
  console.log(JSON.stringify(deployed, null, 2));
  console.log("=".repeat(60));

  // 4. Write addresses to file for other services to use
  const fs = await import("fs");
  fs.writeFileSync(
    "./deployments/addresses.json",
    JSON.stringify({ ...deployed, deployedAt: new Date().toISOString() }, null, 2),
  );
  console.log("\nAddresses saved to ./deployments/addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  });
