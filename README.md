
# PulseRatings Smart Contracts

PulseRatings is a decentralized application (dApp) enabling users to rate websites, profiles, posts, or any web content using upvotes (PUP tokens) and downvotes (PDN tokens) on the PulseChain Mainnet. This repository contains the smart contracts powering the PulseRatings platform, built with Solidity and deployed on PulseChain. The contracts handle market creation, voting, and payment distribution, ensuring transparency and immutability via blockchain technology.

The frontend dApp, available in a separate repository ([PulseRatings-Frontend](https://github.com/ultradaylight/PulseRatings/tree/main/frontend)), provides a user interface for interacting with these contracts. Together, they form a trustless, community-driven rating system running on PulseChain.

## Features

- **Market Creation**: Create rating markets for URLs, uniquely identified on-chain.
- **Upvote/Downvote System**: Users can upvote (PUP) or downvote (PDN) markets using PLS, PulseChain's native currency.
- **Payment Processing**: Handles payments for votes, distributing fees to a designated receiver and refunding excess.
- **Access Control**: Utilizes OpenZeppelin's `Ownable2Step` and `AccessControl` for secure ownership and minter roles.
- **Pausable**: Contract owner can pause rating and market creation for maintenance or upgrades.
- **Token Recovery**: Allows the owner to recover ERC20 tokens accidentally sent to the contract.
- **On-Chain Transparency**: All actions are recorded immutably on PulseChain Mainnet.

## Smart Contracts

- **PulseRatings.sol**: Core controller contract managing market creation, voting, and payments.
- **PUP.sol**: ERC20 token representing upvotes, with minter role for controlled minting.
- **PDN.sol**: ERC20 token representing downvotes, with minter role for controlled minting.
- **MockERC20.sol**: Utility contract for testing token recovery scenarios.

## Prerequisites

To work with the PulseRatings smart contracts, you'll need:

- **Node.js (v16 or later)**: Install from [nodejs.org](https://nodejs.org).
- **Hardhat**: Ethereum development environment for compiling, testing, and deploying contracts.
- **MetaMask**: Ethereum-compatible wallet for interacting with PulseChain ([metamask.io](https://metamask.io)).
- **PulseChain Mainnet/Testnet Configuration**:
  - **Mainnet**:
    - Network Name: PulseChain Mainnet
    - RPC URL: https://rpc.pulsechain.com
    - Chain ID: 369
    - Currency Symbol: PLS
    - Block Explorer: https://scan.pulsechain.com
  - **Testnet (v4)**:
    - Network Name: PulseChain Testnet v4
    - RPC URL: https://pulsechain-testnet-rpc.publicnode.com
    - Chain ID: 943
    - Block Explorer: https://scan.v4.testnet.pulsechain.com
- **PLS Tokens**: Obtain PLS for transaction fees on PulseChain Mainnet or via decentralized exchanges (e.g., PulseX, 9inch DEX).
- **Text Editor**: Use a code editor like VS Code for editing contracts and scripts.

## Installation

Follow these steps to set up the PulseRatings smart contracts locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ultradaylight/PulseRatings-Contracts.git
   cd PulseRatings-Contracts
   ```

2. **Install Dependencies**:
   Install the required Node.js packages using npm:
   ```bash
   npm install
   ```
   This installs Hardhat, OpenZeppelin contracts, ethers.js, and other dependencies listed in `package.json`.

3. **Configure Environment**:
   Create a `.env` file in the project root and add your private key for deployment:
   ```
   PRIVATE_KEY=your_private_key_here
   ```
   > **Warning**: Never commit your `.env` file or share your private key. Ensure `.env` is listed in `.gitignore`.

4. **Validate Private Key**:
   Verify your private key is correctly configured:
   ```bash
   npx hardhat run scripts/validateKey.js
   ```

## Usage

### Compiling Contracts

Compile the Solidity contracts to generate artifacts:
```bash
npx hardhat compile
```
This creates the `artifacts/` directory with contract ABIs and bytecode.

### Running Tests

Run the test suite to verify contract functionality:
```bash
npx hardhat test
```
The tests in `test/pulseRatings.test.js` cover:
- Contract deployment and initialization.
- PUP/PDN token minting and access control.
- Market creation and voting mechanics.
- Payment processing and token recovery.
- Ownership and pausing functionality.

### Deploying Contracts

Deploy the contracts to PulseChain Testnet v4 or Mainnet:

- **Testnet Deployment**:
  ```bash
  npx hardhat run scripts/deploy.js --network pulsechainTestnetV4
  ```
  This deploys `PUP`, `PDN`, and `PulseRatings`, grants minter roles, and saves contract addresses to `frontend/src/contracts.json`.

- **Mainnet Deployment**:
  ```bash
  npx hardhat run scripts/deploy.js --network pulsechain
  ```
  Ensure your wallet has sufficient PLS for gas fees.

The deployment script logs contract addresses and saves them to `frontend/src/contracts.json` for frontend integration.

### Hardhat Configuration

The `hardhat.config.js` file configures:
- Solidity version: 0.8.22
- Networks: Hardhat (local), PulseChain Testnet v4 (chainId 943), PulseChain Mainnet (chainId 369)
- Etherscan: Custom configuration for PulseChain Testnet v4 verification

To verify contracts on PulseChain Testnet v4:
```bash
npx hardhat verify --network pulsechainTestnetV4 <contract_address> <constructor_args>
```
Replace `<contract_address>` and `<constructor_args>` with the deployed address and constructor parameters.

## File Structure

- **contracts/**:
  - `PulseRatings.sol`: Main contract for market and rating management.
  - `PUP.sol`: Upvote token contract.
  - `PDN.sol`: Downvote token contract.
  - `MockERC20.sol`: Mock token for testing.
- **scripts/**:
  - `deploy.js`: Deployment script for PulseChain.
  - `testSigners.js`: Utility to check available signers.
  - `validateKey.js`: Validates private key configuration.
- **test/**:
  - `pulseRatings.test.js`: Comprehensive test suite for all contracts.
- `hardhat.config.js`: Hardhat configuration for compilation, testing, and deployment.
- `package.json`: Project dependencies and scripts.

## Integration with Frontend

The smart contracts are designed to work with the PulseRatings frontend dApp ([PulseRatings-Frontend](https://github.com/ultradaylight/PulseRatings-Frontend)). After deployment, the `contracts.json` file is generated in `frontend/src/` with contract addresses for:
- PUP
- PDN
- PulseRatings
- Receiver

The frontend uses ethers.js to interact with these contracts via MetaMask, enabling users to create markets, vote, and view ratings.

## Troubleshooting

- **Deployment Fails**:
  - Verify `PRIVATE_KEY` is set in `.env` and valid (`npx hardhat run scripts/validateKey.js`).
  - Ensure sufficient PLS in your deployer wallet for gas fees.
  - Confirm the correct network is selected (`pulsechainTestnetV4` or `pulsechain`).
- **Test Failures**:
  - Check that `npx hardhat compile` runs without errors.
  - Ensure Hardhat network is configured with sufficient accounts and balance in `hardhat.config.js`.
- **Contract Verification Issues**:
  - Obtain a PulseScan API key and update `hardhat.config.js` with `apiKey.pulsechainTestnetV4`.
  - Verify constructor arguments match those used during deployment.
- **Frontend Integration**:
  - Ensure `contracts.json` is correctly generated in `frontend/src/` after deployment.
  - Verify MetaMask is connected to PulseChain Mainnet (chainId 369) or Testnet (chainId 943).

If issues persist, open an issue on this repository with details or contact the team via X.

## Contributing

We welcome contributions to enhance the PulseRatings smart contracts! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature`).
3. Make changes and commit (`git commit -m "Add your feature"`).
4. Push to your branch (`git push origin feature/your-feature`).
5. Open a pull request on this repository.

Please include a clear description of your changes and ensure tests pass (`npx hardhat test`).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

- **GitHub**: [ultradaylight](https://github.com/ultradaylight)
- **X**: [@ultradaylight](https://x.com/ultradaylight)
- **Website**: [aurelips.com](https://aurelips.com)

Built with ❤ on PulseChain.
