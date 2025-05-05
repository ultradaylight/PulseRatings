require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Get the deployer account
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Check network configuration and PRIVATE_KEY in .env.");
  }
  const [deployer] = signers;
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "PLS");

  // Verify network (PulseChain Testnet v4: chainId 943)
  const network = await ethers.provider.getNetwork();
  console.log("Network details:", { chainId: network.chainId.toString(), name: network.name });
  const chainId = Number(network.chainId);
  if (chainId !== 943) {
    throw new Error(`Expected PulseChain Testnet v4 (chainId 943), but got chainId ${chainId}`);
  }

  // Set the fee receiver address
  const receiverAddress = "0x5Cfd8509D1c8dC26Bb567fF14D9ab1E01F5d5a32";
  console.log("Fee receiver address:", receiverAddress);

  // Deploy PUP contract
  console.log("Deploying PUP...");
  const PUP = await ethers.getContractFactory("PUP");
  const pup = await PUP.deploy();
  await pup.waitForDeployment();
  const pupAddress = await pup.getAddress();
  console.log("PUP deployed at:", pupAddress);

  // Deploy PDN contract
  console.log("Deploying PDN...");
  const PDN = await ethers.getContractFactory("PDN");
  const pdn = await PDN.deploy();
  await pdn.waitForDeployment();
  const pdnAddress = await pdn.getAddress();
  console.log("PDN deployed at:", pdnAddress);

  // Deploy PulseRatings contract
  console.log("Deploying PulseRatings...");
  const PulseRatings = await ethers.getContractFactory("PulseRatings");
  const pulseRatings = await PulseRatings.deploy(
    pupAddress,
    pdnAddress,
    receiverAddress
  );
  await pulseRatings.waitForDeployment();
  const pulseRatingsAddress = await pulseRatings.getAddress();
  console.log("PulseRatings deployed at:", pulseRatingsAddress);

  // Grant MINTER_ROLE to PulseRatings for PUP and PDN
  console.log("Granting MINTER_ROLE to PulseRatings...");
  const MINTER_ROLE = await pup.MINTER_ROLE();
  
  // Explicitly set gas price and wait for each transaction
  const gasPrice = ethers.parseUnits("50", "gwei"); // Adjust based on network conditions
  
  console.log("Granting MINTER_ROLE for PUP...");
  const pupGrantTx = await pup.grantRole(MINTER_ROLE, pulseRatingsAddress, { gasPrice });
  await pupGrantTx.wait(); // Wait for confirmation
  console.log("MINTER_ROLE granted to PulseRatings for PUP");

  console.log("Granting MINTER_ROLE for PDN...");
  const pdnGrantTx = await pdn.grantRole(MINTER_ROLE, pulseRatingsAddress, { gasPrice });
  await pdnGrantTx.wait(); // Wait for confirmation
  console.log("MINTER_ROLE granted to PulseRatings for PDN");

  // Save contract addresses to JSON file
  const contractsDir = path.join(__dirname, "../frontend/src");
  if (!fs.existsSync(contractsDir)) {
    console.log("Creating frontend/src directory...");
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  const contractAddresses = {
    PUP: pupAddress,
    PDN: pdnAddress,
    PulseRatings: pulseRatingsAddress,
    Receiver: receiverAddress
  };

  const contractsFilePath = path.join(contractsDir, "contracts.json");
  fs.writeFileSync(contractsFilePath, JSON.stringify(contractAddresses, null, 2));
  console.log(`Contract addresses saved to ${contractsFilePath}`);

  // Deployment summary
  console.log("\nDeployment Summary:");
  console.log("PUP Address:", pupAddress);
  console.log("PDN Address:", pdnAddress);
  console.log("PulseRatings Address:", pulseRatingsAddress);
  console.log("Receiver Address:", receiverAddress);
}

main()
  .then(() => {
    console.log("Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
