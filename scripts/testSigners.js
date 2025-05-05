// scripts/testSigners.js
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Set" : "Not set");
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Check PRIVATE_KEY in .env");
  }
  console.log("Deployer address:", signers[0].address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
