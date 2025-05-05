// scripts/validateKey.js
require("dotenv").config();
const { Wallet } = require("ethers");

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not set in .env");
  }
  try {
    const wallet = new Wallet(privateKey);
    console.log("Valid Private Key. Wallet Address:", wallet.address);
  } catch (error) {
    throw new Error(`Invalid PRIVATE_KEY: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
