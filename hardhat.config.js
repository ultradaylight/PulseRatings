require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

if (!PRIVATE_KEY) {
  console.warn("Warning: PRIVATE_KEY not set in .env file");
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.22",
  networks: {
    hardhat: {
      accounts: {
        count: 10,
        accountsBalance: "10000000000000000000000000" // 10,000,000 ETH in wei
      }
    },
    pulsechainTestnetV4: {
      url: "https://pulsechain-testnet-rpc.publicnode.com",
      chainId: 943,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    },
    pulsechain: {
      url: "https://rpc.pulsechain.com",
      chainId: 369,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      pulsechainTestnetV4: "YOUR_PULSESCAN_API_KEY"
    },
    customChains: [
      {
        network: "pulsechainTestnetV4",
        chainId: 943,
        urls: {
          apiURL: "https://scan.v4.testnet.pulsechain.com/api",
          browserURL: "https://scan.v4.testnet.pulsechain.com/"
        }
      }
    ]
  }
};
