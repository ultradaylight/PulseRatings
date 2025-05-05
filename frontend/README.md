# PulseRatings

**PulseRatings** is a decentralized application (dApp) built on the PulseChain Mainnet, enabling users to rate websites, profiles, posts, or any web content using upvotes and downvotes. All interactions are recorded on the PulseChain blockchain, ensuring transparency, immutability, and decentralization. Powered by Ethereum-compatible wallets (e.g., MetaMask), **PulseRatings** allows anyone to participate in a trustless, community-driven rating system directly on PulseChain Mainnet.

This repository contains the front-end code for the **PulseRatings** dApp, including HTML, JavaScript, and Tailwind CSS for styling, as well as smart contracts for deployment on PulseChain. By running this dApp locally on your computer, you contribute to the decentralized ecosystem of PulseChain, as no central server is required to interact with the blockchain’s smart contracts.

## **Features**

- **Create Markets**: Submit URLs to create new rating markets on PulseChain Mainnet.
- **Vote on Markets**: Upvote or downvote URLs with weighted votes using PLS (PulseChain’s native currency).
- **Feed**: View recent market activity with filtering by URL and sorting by newest, upvotes, or downvotes.
- **Leaderboard**: See top contributors based on markets created, upvotes, and downvotes.
- **On-Chain Transparency**: All actions (market creation, voting) are stored immutably on PulseChain Mainnet.
- **Decentralized Access**: Run the dApp locally to interact directly with PulseChain smart contracts.
- **Responsive Design**: Mobile-friendly interface styled with Tailwind CSS.

## **Prerequisites**

To run **PulseRatings** locally on the PulseChain Mainnet, you’ll need:

- **Node.js (v16 or later)**: Install from [nodejs.org](https://nodejs.org).
- **npm (included with Node.js)**: Package manager for installing dependencies.
- **MetaMask or another Ethereum-compatible wallet**: Install the MetaMask browser extension from [metamask.io](https://metamask.io).
- **PulseChain Mainnet Configuration**: Add the PulseChain Mainnet to your wallet with the following details:
  - **Network Name**: PulseChain Mainnet
  - **RPC URL**: https://rpc.pulsechain.com
  - **Chain ID**: 369
  - **Currency Symbol**: PLS
  - **Block Explorer**: https://scan.pulsechain.com
- **PLS Tokens**: Obtain PLS for transaction fees on PulseChain Mainnet. You can acquire PLS through a decentralized exchange (e.g., 9inch DEX, PulseX) or by swapping assets on PulseChain. Ensure your wallet has sufficient PLS for gas fees and voting.
- **Text Editor**: Use a code editor like VS Code for making changes (optional).

## **Installation**

Follow these steps to set up and run the **PulseRatings** front-end on your computer:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ultradaylight/PulseRatings.git
   cd PulseRatings
   ```

2. **Navigate to the Front-End Directory**:
   The front-end code is located in the `frontend/app` directory. Navigate to it:
   ```bash
   cd frontend/app
   ```

3. **Install Dependencies**:
   Install the required Node.js packages using npm:
   ```bash
   npm install
   ```
   This installs:
   - `ethers` for blockchain interactions.
   - `tailwindcss`, `postcss`, `autoprefixer` for styling.
   - `serve` for running a local server.

4. **Build Tailwind CSS**:
   Generate the optimized CSS file:
   ```bash
   npm run build:css
   ```
   This processes `src/input.css` and outputs `css/output.css`.

5. **Set Up MetaMask**:
   - Open MetaMask and add the PulseChain Mainnet network using the RPC details above.
   - Import an account with PLS tokens or acquire PLS via a decentralized exchange (e.g., PulseX or 9inch DEX).
   - Ensure MetaMask is connected to PulseChain Mainnet (Chain ID: 369) before proceeding.

## **Running the dApp**

1. **Start the Local Server**:
   From the `frontend/app` directory, run the development server to serve the dApp:
   ```bash
   npm start
   ```
   This starts a server at `http://localhost:3000` (or another port if specified). The server hosts the static files (`index.html`, `pulseratings/feed.html`, `pulseratings/leaderboard.html`).

2. **Access the dApp**:
   Open your browser and navigate to:
   - **Home**: `http://localhost:3000/`
   - **Feed**: `http://localhost:3000/pulseratings/feed`
   - **Leaderboard**: `http://localhost:3000/pulseratings/leaderboard`

3. **Connect Your Wallet**:
   - Click the **Connect Wallet** button in the dApp.
   - MetaMask will prompt you to connect to PulseChain Mainnet.
   - Approve the connection to start interacting with the dApp.

4. **Interact with PulseRatings**:
   - **Create a Market**: On the home page, enter a URL (e.g., `https://example.com`) and click “Create Market”. Approve the transaction in MetaMask (requires PLS for gas).
   - **Vote**: Upvote or downvote markets using PLS. Select a vote weight and confirm transactions.
   - **View Feed**: Check recent activity, filter by URL, or sort by newest, upvotes, or downvotes.
   - **View Leaderboard**: See top contributors ranked by activity, markets created, upvotes, or downvotes.

## **Development Workflow**

For developers making changes to the dApp from the `frontend/app` directory:

1. **Watch Tailwind CSS**:
   Run the Tailwind watcher to rebuild CSS automatically during development:
   ```bash
   npm run watch:css
   ```
   This updates `css/output.css` whenever you modify `src/input.css` or HTML files.

2. **Run Server and Watcher Concurrently (Optional)**:
   Install `concurrently` to run the server and Tailwind watcher together:
   ```bash
   npm install -D concurrently
   ```
   Update `package.json` scripts:
   ```json
   "start": "concurrently \"npm run watch:css\" \"npx serve .\""
   ```
   Then run:
   ```bash
   npm start
   ```

## **Deploying Smart Contracts (Optional)**

If you need to deploy the smart contracts (e.g., `contracts/PulseRatings.sol`) to PulseChain Mainnet:

1. Navigate to the project root:
   ```bash
   cd PulseRatings
   ```

2. Install Hardhat dependencies:
   ```bash
   npm install
   ```

3. Configure `hardhat.config.js` with your PulseChain Mainnet RPC and account.

4. Deploy contracts using:
   ```bash
   npx hardhat run scripts/deploy.js --network pulsechain
   ```

5. Update `frontend/app/contracts.json` with the deployed contract addresses.

## **File Structure**

- `frontend/app/index.html`: Home page (create markets, view highest/lowest/newly rated).
- `frontend/app/pulseratings/feed.html`: Feed page (recent activity, filtering/sorting).
- `frontend/app/pulseratings/leaderboard.html`: Leaderboard page (top contributors).
- `frontend/app/app.js`: Core logic for blockchain interactions and DOM manipulation.
- `frontend/app/navigation/nav.js`: Navigation logic (mobile menu, link handling).
- `frontend/app/src/input.css`: Tailwind CSS input file with custom styles.
- `frontend/app/css/output.css`: Generated CSS file.
- `frontend/app/contracts.json`: Contract addresses and ABIs for PulseChain Mainnet.
- `contracts/*.sol`: Smart contracts (e.g., `PulseRatings.sol`) for deployment on PulseChain.

## **Troubleshooting**

- **Incorrect Directory**:
  Ensure you’re in the `frontend/app` directory when running `npm install`, `npm run build:css`, or `npm start`. If you’re in the project root (`PulseRatings`), navigate to `frontend/app` first:
  ```bash
  cd frontend/app
  ```

- **Tailwind CSS Issues**:
  - If styles don’t apply, run `npm run build:css` and verify `css/output.css` exists in `frontend/app`.
  - Ensure `tailwind.config.js` includes all HTML files (`index.html`, `pulseratings/feed.html`, `pulseratings/leaderboard.html`).
  - Check the browser console for errors loading `/css/output.css`.

- **Wallet Connection Issues**:
  - Confirm MetaMask is on PulseChain Mainnet (Chain ID: 369).
  - Ensure your account has sufficient PLS for gas fees (acquire via PulseX or 9inch DEX).

- **Page Not Loading**:
  - Verify `pulseratings/feed.html` and `pulseratings/leaderboard.html` exist in `frontend/app`.
  - Check the browser’s network tab for 404 errors and ensure `npx serve .` is run from `frontend/app`.

- **Blockchain Errors**:
  - Ensure `contracts.json` contains valid contract addresses for PulseChain Mainnet.
  - Check that the PulseChain Mainnet RPC (https://rpc.pulsechain.com) is accessible.
  - Verify you have enough PLS for transaction fees.

If you encounter issues, open an issue on this repository with details, or contact the team via X.

## **Contributing**

We welcome contributions to improve **PulseRatings**! To contribute:
- Fork the repository.
- Create a new branch (`git checkout -b feature/your-feature`).
- Make your changes and commit (`git commit -m "Add your feature"`).
- Push to your branch (`git push origin feature/your-feature`).
- Open a pull request on this repository.

Please include a clear description of your changes and ensure your code follows the existing style (e.g., Tailwind CSS for styling, ethers.js for blockchain interactions).

## **License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## **Contact**

- **GitHub**: [ultradaylight](https://github.com/ultradaylight)
- **X**: [@ultradaylight](https://x.com/ultradaylight)
- **Website**: [aurelips.com](https://aurelips.com)

Built with ❤️ on PulseChain.




