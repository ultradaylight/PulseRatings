try {
(function () {
  // Environment check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.error('Invalid environment: Window or Document not available');
    return;
  }

  console.log("Starting app.js execution...");

  // Constants
  const PULSE_RATINGS_ADDRESS = "0xdc1fa7F05f63cCa48b01C46E94a86D7Eeb4194C4";
  const PUP_ADDRESS = "0x92ea79Aee927653E8CB69A53bd1550F4bb358d91";
  const PDN_ADDRESS = "0x0b7b33C68fDb751B2A28ceD49B8A59C7f4B1876C";

  const PULSE_RATINGS_ABI = [
    "function createMarket(string url) external",
    "function createUpRating(tuple(string url, uint256 amount) rating) external payable",
    "function createDownRating(tuple(string url, uint256 amount) rating) external payable",
    "function previewPayment(uint256 amount) external view returns (uint256)",
    "function marketToUrl(address market) external view returns (string)",
    "function urlToMarket(string url) external view returns (address)",
    "function getMarketAddress(string url) external pure returns (address)",
    "function ratingPrice() external view returns (uint256)",
    "event MarketCreated(address indexed marketAddress, string url)",
    "event RatingUpCreated(address indexed user, address indexed market, uint256 amount)",
    "event RatingDownCreated(address indexed user, address indexed market, uint256 amount)"
  ];

  const TOKEN_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function upvotes(address user) external view returns (uint256)",
    "function downvotes(address user) external view returns (uint256)"
  ];

  // State
  let provider;
  let defaultProvider;
  let signer;
  let account;
  let ratingsContract;
  let pupContract;
  let pdnContract;
  let isWalletConnected = false;
  let isFetchingMarkets = false;
  let isFetchingLeaderboard = false;
  let isReloading = false;
  let searchQuery = '';
  let sortOrder = 'newest'; // For markets
  let leaderboardSortOrder = 'activity'; // For leaderboard
  let currentPage = 1;
  let marketsPerPage = 10;
  let usersPerPage = 10;
  let allMarkets = [];
  let allUsers = [];

  const eventHandlers = new Map();

  // DOM Elements
  const connectWalletBtn = document.getElementById("connectWallet");
  const walletStatus = document.getElementById("walletStatus");
  const urlInput = document.getElementById("urlInput");
  const createMarketBtn = document.getElementById("createMarket");
  const marketsList = document.getElementById("marketsList");
  const lowestRatedList = document.getElementById("lowestRatedList");
  const newlyAddedList = document.getElementById("newlyAddedList");
  const feedList = document.getElementById("feedList");
  const leaderboardList = document.getElementById("leaderboardList");
  const leaderboardTableBody = document.getElementById("leaderboardTableBody");
  const searchInput = document.getElementById("searchInput");
  const sortByNewest = document.getElementById("sortByNewest");
  const sortByUpvotes = document.getElementById("sortByUpvotes");
  const sortByDownvotes = document.getElementById("sortByDownvotes");
  const sortByActivity = document.getElementById("sortByActivity");
  const sortByMarkets = document.getElementById("sortByMarkets");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const backToTopBtn = document.getElementById("backToTop");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const marketLoadingSpinner = document.getElementById("marketLoadingSpinner");
  const walletPromptModal = document.getElementById("walletPromptModal");
  const closeWalletPromptBtn = document.getElementById("closeWalletPrompt");

  const SLIDER_VALUES = [
    1000, 2000, 3000, 4000, 5000, 6000, 7000,
    8000, 9000, 10000,
    15000, 20000, 25000, 30000,
    40000, 50000, 60000, 70000, 80000, 90000, 100000,
    150000,
    250000,
    500000, 750000, 1000000
  ];

  // Debounce function for search input
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    const start = url.slice(0, maxLength - 10);
    const end = url.slice(-7);
    return `${start}...${end}`;
  }

  function truncateAddress(address, maxLength = 12) {
    if (address.length <= maxLength) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function logError(message, error) {
    console.error(`${message}:`, error);
    if (walletStatus) walletStatus.textContent = `Error: ${message}`;
  }

  function initApp() {
    console.log("Initializing app...");
    try {
      if (!connectWalletBtn || (!urlInput && !createMarketBtn && !marketsList && !lowestRatedList && !newlyAddedList && !feedList && !leaderboardList) || !loadingOverlay || !marketLoadingSpinner || !walletPromptModal || !closeWalletPromptBtn) {
        throw new Error("One or more DOM elements not found");
      }

      connectWalletBtn.addEventListener("click", connectMetaMask);
      if (createMarketBtn) createMarketBtn.addEventListener("click", createMarket);
      closeWalletPromptBtn.addEventListener("click", () => {
        walletPromptModal.classList.add("hidden");
      });

      if (searchInput) {
        const debouncedSearch = debounce(() => {
          searchQuery = searchInput.value.trim().toLowerCase();
          currentPage = 1; // Reset to first page on search
          fetchMarkets();
        }, 300);
        searchInput.addEventListener("input", debouncedSearch);
      }

      if (sortByNewest) {
        sortByNewest.addEventListener("click", () => {
          sortOrder = 'newest';
          currentPage = 1; // Reset to first page on sort
          fetchMarkets();
        });
      }

      if (sortByUpvotes) {
        sortByUpvotes.addEventListener("click", () => {
          sortOrder = 'upvotes';
          currentPage = 1; // Reset to first page on sort
          fetchMarkets();
        });
      }

      if (sortByDownvotes) {
        sortByDownvotes.addEventListener("click", () => {
          sortOrder = 'downvotes';
          currentPage = 1; // Reset to first page on sort
          fetchMarkets();
        });
      }

      if (sortByActivity) {
        sortByActivity.addEventListener("click", () => {
          leaderboardSortOrder = 'activity';
          currentPage = 1; // Reset to first page on sort
          fetchLeaderboard();
        });
      }

      if (sortByMarkets) {
        sortByMarkets.addEventListener("click", () => {
          leaderboardSortOrder = 'markets';
          currentPage = 1; // Reset to first page on sort
          fetchLeaderboard();
        });
      }

      if (sortByUpvotes && leaderboardList) {
        sortByUpvotes.addEventListener("click", () => {
          leaderboardSortOrder = 'upvotes';
          currentPage = 1; // Reset to first page on sort
          fetchLeaderboard();
        });
      }

      if (sortByDownvotes && leaderboardList) {
        sortByDownvotes.addEventListener("click", () => {
          leaderboardSortOrder = 'downvotes';
          currentPage = 1; // Reset to first page on sort
          fetchLeaderboard();
        });
      }

      if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
          if (currentPage > 1) {
            currentPage--;
            if (leaderboardList) {
              fetchLeaderboard();
            } else {
              fetchMarkets();
            }
          }
        });
      }

      if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
          const totalPages = leaderboardList ? 
            Math.ceil(allUsers.length / usersPerPage) : 
            Math.ceil(filterAndSortMarkets(allMarkets).length / marketsPerPage);
          if (currentPage < totalPages) {
            currentPage++;
            if (leaderboardList) {
              fetchLeaderboard();
            } else {
              fetchMarkets();
            }
          }
        });
      }

      if (backToTopBtn) {
        window.addEventListener("scroll", () => {
          if (window.scrollY > 300) {
            backToTopBtn.classList.remove("hidden");
          } else {
            backToTopBtn.classList.add("hidden");
          }
        });
        backToTopBtn.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }

      if (!window.ethereum) {
        console.warn("No Ethereum wallet detected");
        walletPromptModal.classList.remove("hidden");
        if (walletStatus) walletStatus.textContent = "Please install MetaMask or another Ethereum wallet.";
        connectWalletBtn.disabled = true;
      }

      if (typeof ethers === "undefined") {
        throw new Error("Ethers.js not loaded");
      }

      defaultProvider = new ethers.JsonRpcProvider("https://rpc.pulsechain.com");
      console.log("Default provider initialized");

      if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        console.log("Wallet provider initialized");
      }

      // Validate and initialize contracts
      try {
        console.log(`Validating PULSE_RATINGS_ADDRESS: ${PULSE_RATINGS_ADDRESS}, isValid: ${ethers.isAddress(PULSE_RATINGS_ADDRESS)}`);
        console.log(`Validating PUP_ADDRESS: ${PUP_ADDRESS}, isValid: ${ethers.isAddress(PUP_ADDRESS)}`);
        console.log(`Validating PDN_ADDRESS: ${PDN_ADDRESS}, isValid: ${ethers.isAddress(PDN_ADDRESS)}`);

        if (!ethers.isAddress(PULSE_RATINGS_ADDRESS)) {
          console.warn("Invalid PULSE_RATINGS_ADDRESS, skipping ratings contract initialization");
        } else {
          try {
            ratingsContract = new ethers.Contract(PULSE_RATINGS_ADDRESS, PULSE_RATINGS_ABI, defaultProvider);
            console.log("Ratings contract initialized successfully");
          } catch (error) {
            console.error("Failed to initialize ratings contract:", error);
            ratingsContract = null;
          }
        }

        if (!ethers.isAddress(PUP_ADDRESS)) {
          console.warn("Invalid PUP_ADDRESS, skipping PUP contract initialization");
          pupContract = null;
        } else {
          try {
            pupContract = new ethers.Contract(PUP_ADDRESS, TOKEN_ABI, defaultProvider);
            console.log("PUP contract initialized successfully");
          } catch (error) {
            console.error("Failed to initialize PUP contract:", error);
            pupContract = null;
          }
        }

        if (!ethers.isAddress(PDN_ADDRESS)) {
          console.warn("Invalid PDN_ADDRESS, skipping PDN contract initialization");
          pdnContract = null;
        } else {
          try {
            pdnContract = new ethers.Contract(PDN_ADDRESS, TOKEN_ABI, defaultProvider);
            console.log("PDN contract initialized successfully");
          } catch (error) {
            console.error("Failed to initialize PDN contract:", error);
            pdnContract = null;
          }
        }

        if (!ratingsContract) {
          throw new Error("Ratings contract not initialized, cannot proceed");
        }
      } catch (error) {
        logError("Failed to initialize contracts", error);
        return;
      }

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
          console.log('Accounts changed:', accounts);
          if (accounts.length === 0 && !isReloading) {
            isReloading = true;
            loadingOverlay.classList.remove('hidden');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        });
        window.ethereum.on('chainChanged', (chainId) => {
          console.log('Chain changed:', chainId);
          if (!isReloading) {
            isReloading = true;
            loadingOverlay.classList.remove('hidden');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        });
      }

      if (leaderboardList) {
        fetchLeaderboard();
      } else {
        fetchMarkets();
      }
      if (window.ethereum) {
        checkForExistingConnection();
      }
    } catch (error) {
      logError("Failed to initialize app", error);
    }
  }

  async function checkForExistingConnection() {
    try {
      console.log("Checking for existing wallet connection...");
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        await connectMetaMask(false);
      }
    } catch (error) {
      logError("Error checking existing connection", error);
    }
  }

  async function connectMetaMask(fetchMarketsAfter = true) {
    try {
      console.log("Connecting MetaMask...");
      if (!window.ethereum) {
        walletPromptModal.classList.remove("hidden");
        if (walletStatus) walletStatus.textContent = "No Ethereum wallet detected. Please install MetaMask or Coinbase Wallet.";
        return;
      }

      if (!provider) {
        provider = new ethers.BrowserProvider(window.ethereum);
      }

      connectWalletBtn.textContent = "Connecting...";
      connectWalletBtn.disabled = true;

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length === 0) {
        throw new Error("No accounts returned by wallet");
      }

      account = accounts[0];
      signer = await provider.getSigner();

      await switchToPulseChainTestnet();
      if (ratingsContract && signer) {
        ratingsContract = new ethers.Contract(PULSE_RATINGS_ADDRESS, PULSE_RATINGS_ABI, signer);
      }
      if (pupContract) {
        pupContract = new ethers.Contract(PUP_ADDRESS, TOKEN_ABI, provider);
      }
      if (pdnContract) {
        pdnContract = new ethers.Contract(PDN_ADDRESS, TOKEN_ABI, provider);
      }

      const ratingPrice = ratingsContract ? await ratingsContract.ratingPrice() : ethers.parseEther("0");
      console.log("Rating price:", ethers.formatEther(ratingPrice), "PLS");

      connectWalletBtn.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
      isWalletConnected = true;
      if (walletStatus) walletStatus.textContent = "Wallet connected successfully!";

      if (fetchMarketsAfter) {
        if (leaderboardList) {
          fetchLeaderboard();
        } else {
          fetchMarkets();
        }
      }
    } catch (error) {
      logError("Error connecting to wallet", error);
      connectWalletBtn.textContent = "Connect Wallet";
      connectWalletBtn.disabled = false;
    }
  }

  async function switchToPulseChainTestnet() {
    try {
      console.log("Switching to PulseChain....");
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x171" }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x171",
            chainName: "PulseChain",
            nativeCurrency: { name: "PLS", symbol: "PLS", decimals: 18 },
            rpcUrls: ["https://rpc.pulsechain.com"],
            blockExplorerUrls: ["https://otter.pulsechain.com"]
          }]
        });
      } else {
        throw switchError;
      }
    }
  }

  async function createMarket() {
    const urlError = document.getElementById("urlError");
    try {
      console.log("Creating market...");
      if (!signer || !ratingsContract) {
        await connectMetaMask();
        if (!signer || !ratingsContract) {
          if (walletStatus) walletStatus.textContent = "Failed to connect wallet!";
          if (urlError) urlError.classList.add("hidden");
          return;
        }
      }
      let url = urlInput.value.trim();
      if (!url) {
        if (urlError) {
          urlError.classList.remove("hidden");
        }
        return;
      }
      if (urlError) urlError.classList.add("hidden");

      url = url.toLowerCase();
      createMarketBtn.textContent = "Confirm in Wallet";
      createMarketBtn.disabled = true;

      const existingMarket = await ratingsContract.urlToMarket(url);
      if (existingMarket !== "0x0000000000000000000000000000000000000000") {
        if (walletStatus) walletStatus.textContent = `Error: Market for ${url} already exists!`;
        return;
      }
      const tx = await ratingsContract.createMarket(url, { gasLimit: 300000 });
      if (walletStatus) walletStatus.textContent = `Creating market... Tx Hash: ${tx.hash}`;
      await tx.wait();
      if (walletStatus) walletStatus.textContent = "Market created successfully!";
      urlInput.value = "";
      fetchMarkets();
      if (leaderboardList) {
        fetchLeaderboard();
      }
    } catch (error) {
      logError("Error creating market", error);
    } finally {
      createMarketBtn.textContent = "Create Market";
      createMarketBtn.disabled = false;
    }
  }

  async function updateCost(marketId, section) {
    try {
      console.log(`Updating cost for market ${marketId} in section ${section}`);
      if (!ratingsContract) return;
      const slider = document.getElementById(`ratingAmount-${marketId}-${section}`);
      const amountDisplay = document.getElementById(`amountDisplay-${marketId}-${section}`);
      const costDisplay = document.getElementById(`costDisplay-${marketId}-${section}`);
      const voteAmount = SLIDER_VALUES[slider.value];
      amountDisplay.innerHTML = `<span style="color: #16a34a;">Votes: ${voteAmount.toLocaleString('en-US')}</span>`;
      const amount = ethers.parseEther(voteAmount.toString());
      const price = await ratingsContract.previewPayment(amount);
      costDisplay.textContent = `Cost: ${Number(ethers.formatEther(price)).toLocaleString('en-US')} PLS`;
    } catch (error) {
      logError(`Error updating cost for market ${marketId} in ${section}`, error);
      const costDisplay = document.getElementById(`costDisplay-${marketId}-${section}`);
      if (costDisplay) costDisplay.textContent = "Error calculating cost";
    }
  }

  async function createUpRating(marketId, url, section) {
    try {
      console.log(`Initiating up rating for ${marketId} (${url}) in section ${section}`);
      if (!signer || !ratingsContract) {
        if (walletStatus) walletStatus.textContent = "Please connect your wallet first!";
        return;
      }
      const upVoteBtn = document.getElementById(`upVote-${marketId}-${section}`);
      const slider = document.getElementById(`ratingAmount-${marketId}-${section}`);
      if (!upVoteBtn || !slider) {
        throw new Error(`Up vote button or slider not found for ${marketId} in ${section}`);
      }
      upVoteBtn.textContent = "Confirm in Wallet";
      upVoteBtn.disabled = true;
      const voteAmount = SLIDER_VALUES[slider.value];
      const amount = ethers.parseEther(voteAmount.toString());
      const price = await ratingsContract.previewPayment(amount);
      const tx = await ratingsContract.createUpRating(
        { url, amount },
        { value: price, gasLimit: 500000 }
      );
      if (walletStatus) walletStatus.textContent = `Creating up rating... Tx Hash: ${tx.hash}`;
      await tx.wait();
      if (walletStatus) walletStatus.textContent = "Up rating created successfully!";
      fetchMarkets();
      if (leaderboardList) {
        fetchLeaderboard();
      }
    } catch (error) {
      logError(`Error creating up rating for market ${marketId} in ${section}`, error);
    } finally {
      for (const s of ['highest', 'lowest', 'newly', 'feed']) {
        const upVoteBtn = document.getElementById(`upVote-${marketId}-${s}`);
        if (upVoteBtn) {
          upVoteBtn.textContent = "Up Vote";
          upVoteBtn.disabled = false;
        }
      }
    }
  }

  async function createDownRating(marketId, url, section) {
    try {
      console.log(`Initiating down rating for ${marketId} (${url}) in section ${section}`);
      if (!signer || !ratingsContract) {
        if (walletStatus) walletStatus.textContent = "Please connect your wallet first!";
        return;
      }
      const downVoteBtn = document.getElementById(`downVote-${marketId}-${section}`);
      const slider = document.getElementById(`ratingAmount-${marketId}-${section}`);
      if (!downVoteBtn || !slider) {
        throw new Error(`Down vote button or slider not found for ${marketId} in ${section}`);
      }
      downVoteBtn.textContent = "Confirm in Wallet";
      downVoteBtn.disabled = true;
      const voteAmount = SLIDER_VALUES[slider.value];
      const amount = ethers.parseEther(voteAmount.toString());
      const price = await ratingsContract.previewPayment(amount);
      const tx = await ratingsContract.createDownRating(
        { url, amount },
        { value: price, gasLimit: 500000 }
      );
      if (walletStatus) walletStatus.textContent = `Creating down rating... Tx Hash: ${tx.hash}`;
      await tx.wait();
      if (walletStatus) walletStatus.textContent = "Down rating created successfully!";
      fetchMarkets();
      if (leaderboardList) {
        fetchLeaderboard();
      }
    } catch (error) {
      logError(`Error creating down rating for market ${marketId} in ${section}`, error);
    } finally {
      for (const s of ['highest', 'lowest', 'newly', 'feed']) {
        const downVoteBtn = document.getElementById(`downVote-${marketId}-${s}`);
        if (downVoteBtn) {
          downVoteBtn.textContent = "Down Vote";
          downVoteBtn.disabled = false;
        }
      }
    }
  }

  async function renderMarketBox(container, normalizedUrl, url, marketAddress, upvotes, downvotes, isHighlighted) {
    try {
      console.log(`Rendering market: ${url} (${marketAddress}) in ${container.id}, Upvotes: ${upvotes}, Downvotes: ${downvotes}`);
      const marketId = ethers.id(normalizedUrl);
      const section = container.id === 'marketsList' ? 'highest' : container.id === 'lowestRatedList' ? 'lowest' : container.id === 'newlyAddedList' ? 'newly' : 'feed';
      const div = document.createElement("div");
      div.className = isHighlighted ? "p-4 bg-gray-100 rounded-md text-base" : "p-3 bg-gray-100 rounded-md text-sm";
      const truncatedUrl = truncateUrl(url);
      const textSize = isHighlighted ? "text-sm" : "text-xs";

      // Ensure upvotes and downvotes are numbers, default to 0 if undefined
      const formattedUpvotes = (typeof upvotes === 'number' ? upvotes : 0).toLocaleString('en-US');
      const formattedDownvotes = (typeof downvotes === 'number' ? downvotes : 0).toLocaleString('en-US');

      let votingControls = "";
      if (isWalletConnected && ratingsContract) {
        let initialCost = "Calculating...";
        try {
          const amount = ethers.parseEther(SLIDER_VALUES[0].toString());
          const price = await ratingsContract.previewPayment(amount);
          initialCost = Number(ethers.formatEther(price)).toLocaleString('en-US');
        } catch (error) {
          console.error(`Error calculating initial cost for ${url}:`, error);
          initialCost = "Error";
        }
        votingControls = `
          <div class="mt-2">
            <input type="range" id="ratingAmount-${marketId}-${section}" min="0" max="${SLIDER_VALUES.length - 1}" value="0"
                   class="w-48 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer">
            <p id="amountDisplay-${marketId}-${section}" class="${textSize}"><span style="color: #16a34a;">Votes: ${SLIDER_VALUES[0].toLocaleString('en-US')}</span></p>
            <p id="costDisplay-${marketId}-${section}" class="${textSize} text-gray-600">Cost: ${initialCost} PLS</p>
            <div class="flex space-x-4 mt-1">
              <button id="upVote-${marketId}-${section}" class="flex-1 text-white py-2 px-4 rounded-md ${textSize}" style="background-color: #16a34a; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#15803d'" onmouseout="this.style.backgroundColor='#16a34a'">Up Vote</button>
              <button id="downVote-${marketId}-${section}" class="flex-1 text-white py-2 px-4 rounded-md ${textSize}" style="background-color: #dc2626; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#b91c1c'" onmouseout="this.style.backgroundColor='#dc2626'">Down Vote</button>
            </div>
          </div>
        `;
      }

      div.innerHTML = `
        <p class="flex items-center">
          <img src="https://www.google.com/s2/favicons?domain=${url}&sz=64" alt="Favicon" class="w-16 h-16 mr-3" onerror="this.src='https://via.placeholder.com/64?text=🌐'">
          <strong>URL:</strong> <a href="${url}" target="_blank" class="text-blue-500 hover:underline ml-1 truncate">${truncatedUrl}</a>
        </p>
        <p><strong>Market Address:</strong> <a href="https://scan.mypinata.cloud/ipfs/bafybeih3olry3is4e4lzm7rus5l3h6zrphcal5a7ayfkhzm5oivjro2cp4/#/address/${marketAddress}" target="_blank" class="text-blue-500 hover:underline">${marketAddress.slice(0, 6)}...${marketAddress.slice(-4)}</a></p>
        <p><strong>Upvotes:</strong> <span style="color: #16a34a;">${formattedUpvotes}</span></p>
        <p><strong>Downvotes:</strong> <span style="color: #dc2626;">${formattedDownvotes}</span></p>
        ${votingControls}
      `;
      container.appendChild(div);
      console.log(`Appended market ${url} to ${container.id} with Upvotes: ${formattedUpvotes}, Downvotes: ${formattedDownvotes}`);

      if (isWalletConnected && ratingsContract) {
        const slider = document.getElementById(`ratingAmount-${marketId}-${section}`);
        const upVoteBtn = document.getElementById(`upVote-${marketId}-${section}`);
        const downVoteBtn = document.getElementById(`downVote-${marketId}-${section}`);

        const handlerKey = `${marketId}-${section}`;
        if (!eventHandlers.has(handlerKey)) {
          eventHandlers.set(handlerKey, {
            upVote: () => createUpRating(marketId, url, section),
            downVote: () => createDownRating(marketId, url, section)
          });
          console.log(`Created new event handlers for ${handlerKey} (${url})`);
        } else {
          console.log(`Reusing existing event handlers for ${handlerKey} (${url})`);
        }

        const { upVote, downVote } = eventHandlers.get(handlerKey);

        upVoteBtn.removeEventListener("click", upVote);
        downVoteBtn.removeEventListener("click", downVote);

        upVoteBtn.addEventListener("click", upVote);
        downVoteBtn.addEventListener("click", downVote);
        console.log(`Added event listeners for ${handlerKey} (${url}) in ${container.id}`);

        slider.addEventListener("input", () => updateCost(marketId, section));
        updateCost(marketId, section);
      }
    } catch (error) {
      logError(`Error rendering market box for ${url}`, error);
    }
  }

  async function renderUserRow(userAddress, marketsCreated, upvotes, downvotes, rank, totalActivity) {
    try {
      console.log(`Rendering user: ${userAddress}, Markets: ${marketsCreated}, Upvotes: ${upvotes}, Downvotes: ${downvotes}, Rank: ${rank}`);
      const row = document.createElement("tr");
      row.className = "border-b border-gray-200";
      const truncatedAddress = truncateAddress(userAddress);
      row.innerHTML = `
        <td class="p-2 text-sm text-gray-700">${rank}</td>
        <td class="p-2 text-sm text-gray-700">
          <a href="https://scan.mypinata.cloud/ipfs/bafybeih3olry3is4e4lzm7rus5l3h6zrphcal5a7ayfkhzm5oivjro2cp4/#/address/${userAddress}" target="_blank" class="text-blue-500 hover:underline">${truncatedAddress}</a>
        </td>
        <td class="p-2 text-sm text-gray-700">${marketsCreated.toLocaleString('en-US')}</td>
        <td class="p-2 text-sm" style="color: #16a34a;">${upvotes.toLocaleString('en-US')}</td>
        <td class="p-2 text-sm" style="color: #dc2626;">${downvotes.toLocaleString('en-US')}</td>
        <td class="p-2 text-sm text-gray-700">${totalActivity.toLocaleString('en-US')}</td>
      `;
      leaderboardTableBody.appendChild(row);
      console.log(`Appended user ${userAddress} to leaderboard`);
    } catch (error) {
      logError(`Error rendering user row for ${userAddress}`, error);
    }
  }

  function filterAndSortUsers(users) {
    let sortedUsers = [...users];
    switch (leaderboardSortOrder) {
      case 'markets':
        return sortedUsers.sort((a, b) => b.marketsCreated - a.marketsCreated);
      case 'upvotes':
        return sortedUsers.sort((a, b) => b.upvotes - a.upvotes);
      case 'downvotes':
        return sortedUsers.sort((a, b) => b.downvotes - a.downvotes);
      case 'activity':
      default:
        return sortedUsers.sort((a, b) => b.totalActivity - a.totalActivity);
    }
  }

  function filterAndSortMarkets(markets) {
    let filteredMarkets = [...markets];

    // Apply search filter
    if (searchQuery) {
      filteredMarkets = markets.filter(market =>
        market.url.toLowerCase().includes(searchQuery)
      );
    }

    // Apply sort
    switch (sortOrder) {
      case 'upvotes':
        return filteredMarkets.sort((a, b) => b.upvotes - a.upvotes);
      case 'downvotes':
        return filteredMarkets.sort((a, b) => b.downvotes - a.downvotes);
      case 'newest':
      default:
        return filteredMarkets.sort((a, b) => b.blockNumber - a.blockNumber);
    }
  }

  async function fetchLeaderboard() {
    if (isFetchingLeaderboard) {
      console.log("fetchLeaderboard already running, skipping...");
      return;
    }
    isFetchingLeaderboard = true;
    try {
      console.log("Starting fetchLeaderboard...");
      const fetchProvider = defaultProvider || provider;
      if (!fetchProvider) {
        throw new Error("No provider available");
      }
      const fetchRatingsContract = ratingsContract || new ethers.Contract(PULSE_RATINGS_ADDRESS, PULSE_RATINGS_ABI, fetchProvider);
      const fetchPupContract = pupContract ? new ethers.Contract(PUP_ADDRESS, TOKEN_ABI, fetchProvider) : null;
      const fetchPdnContract = pdnContract ? new ethers.Contract(PDN_ADDRESS, TOKEN_ABI, fetchProvider) : null;

      if (!fetchRatingsContract) {
        throw new Error("Ratings contract not initialized");
      }

      if (marketLoadingSpinner) {
        marketLoadingSpinner.classList.remove("hidden");
      }

      if (leaderboardTableBody) {
        leaderboardTableBody.innerHTML = "";
      }

      // Fetch MarketCreated events
      console.log("Fetching MarketCreated events...");
      const marketFilter = fetchRatingsContract.filters.MarketCreated();
      let marketEvents = [];
      try {
        marketEvents = await fetchRatingsContract.queryFilter(marketFilter, 0, "latest");
        console.log(`Found ${marketEvents.length} MarketCreated events`);
      } catch (queryError) {
        console.error("Error querying MarketCreated events:", queryError);
      }

      // Fetch RatingUpCreated events
      console.log("Fetching RatingUpCreated events...");
      const upRatingFilter = fetchRatingsContract.filters.RatingUpCreated();
      let upRatingEvents = [];
      try {
        upRatingEvents = await fetchRatingsContract.queryFilter(upRatingFilter, 0, "latest");
        console.log(`Found ${upRatingEvents.length} RatingUpCreated events`);
      } catch (queryError) {
        console.error("Error querying RatingUpCreated events:", queryError);
      }

      // Fetch RatingDownCreated events
      console.log("Fetching RatingDownCreated events...");
      const downRatingFilter = fetchRatingsContract.filters.RatingDownCreated();
      let downRatingEvents = [];
      try {
        downRatingEvents = await fetchRatingsContract.queryFilter(downRatingFilter, 0, "latest");
        console.log(`Found ${downRatingEvents.length} RatingDownCreated events`);
      } catch (queryError) {
        console.error("Error querying RatingDownCreated events:", queryError);
      }

      // Aggregate user data
      const userMap = new Map();
      
      // Process MarketCreated events
      for (const event of marketEvents) {
        let creatorAddress;
        try {
          const transaction = await fetchProvider.getTransaction(event.transactionHash);
          if (!transaction || !transaction.from) {
            console.error(`No transaction or from address found for MarketCreated event with tx hash: ${event.transactionHash}`);
            continue;
          }
          creatorAddress = ethers.getAddress(transaction.from);
        } catch (error) {
          console.error(`Error fetching transaction for MarketCreated event with tx hash: ${event.transactionHash}`, error);
          continue;
        }
        if (!userMap.has(creatorAddress)) {
          userMap.set(creatorAddress, {
            address: creatorAddress,
            marketsCreated: 0,
            upvotes: 0,
            downvotes: 0,
            totalActivity: 0
          });
        }
        userMap.get(creatorAddress).marketsCreated += 1;
        userMap.get(creatorAddress).totalActivity += 1;
      }

      // Process RatingUpCreated events
      for (const event of upRatingEvents) {
        let userAddress;
        try {
          userAddress = ethers.getAddress(event.args.user);
        } catch (error) {
          console.error(`Invalid user address for up rating: ${event.args.user}`, error);
          continue;
        }
        if (!userMap.has(userAddress)) {
          userMap.set(userAddress, {
            address: userAddress,
            marketsCreated: 0,
            upvotes: 0,
            downvotes: 0,
            totalActivity: 0
          });
        }
        const amount = Number(ethers.formatEther(event.args.amount));
        userMap.get(userAddress).upvotes += amount;
        userMap.get(userAddress).totalActivity += amount;
      }

      // Process RatingDownCreated events
      for (const event of downRatingEvents) {
        let userAddress;
        try {
          userAddress = ethers.getAddress(event.args.user);
        } catch (error) {
          console.error(`Invalid user address for down rating: ${event.args.user}`, error);
          continue;
        }
        if (!userMap.has(userAddress)) {
          userMap.set(userAddress, {
            address: userAddress,
            marketsCreated: 0,
            upvotes: 0,
            downvotes: 0,
            totalActivity: 0
          });
        }
        const amount = Number(ethers.formatEther(event.args.amount));
        userMap.get(userAddress).downvotes += amount;
        userMap.get(userAddress).totalActivity += amount;
      }

      // Verify with contract state
      if (fetchPupContract && fetchPdnContract) {
        for (const user of userMap.values()) {
          try {
            const upvoteBalance = await fetchPupContract.upvotes(user.address);
            const downvoteBalance = await fetchPdnContract.downvotes(user.address);
            user.upvotes = Number(ethers.formatEther(upvoteBalance));
            user.downvotes = Number(ethers.formatEther(downvoteBalance));
            user.totalActivity = user.marketsCreated + user.upvotes + user.downvotes;
          } catch (error) {
            console.error(`Error fetching contract state for user ${user.address}:`, error);
          }
        }
      }

      allUsers = Array.from(userMap.values());
      console.log(`Aggregated ${allUsers.length} unique users`);

      if (leaderboardList) {
        const sortedUsers = filterAndSortUsers(allUsers);
        const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
        const startIndex = (currentPage - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const currentUsers = sortedUsers.slice(startIndex, endIndex);

        console.log(`Leaderboard: Rendering page ${currentPage}, ${currentUsers.length} users`);
        for (let i = 0; i < currentUsers.length; i++) {
          const user = currentUsers[i];
          const rank = startIndex + i + 1;
          await renderUserRow(
            user.address,
            user.marketsCreated,
            user.upvotes,
            user.downvotes,
            rank,
            user.totalActivity
          );
        }

        if (currentUsers.length === 0) {
          leaderboardTableBody.innerHTML = `<tr><td colspan="6" class="p-2 text-gray-500 text-sm text-center">No users found.</td></tr>`;
        }

        // Update pagination controls
        if (pageInfo) {
          pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        }
        if (prevPageBtn) {
          prevPageBtn.disabled = currentPage === 1;
        }
        if (nextPageBtn) {
          nextPageBtn.disabled = currentPage >= totalPages;
        }
      }

      console.log(`Rendered ${leaderboardTableBody?.children.length || 0} users in Leaderboard`);
    } catch (error) {
      logError("Error fetching leaderboard", error);
      if (leaderboardTableBody) {
        leaderboardTableBody.innerHTML = `<tr><td colspan="6" class="p-2 text-red-500 text-sm text-center">Error fetching leaderboard: ${error.message}</td></tr>`;
      }
    } finally {
      if (marketLoadingSpinner) {
        marketLoadingSpinner.classList.add("hidden");
      }
      isFetchingLeaderboard = false;
      console.log("fetchLeaderboard completed");
    }
  }

  async function fetchMarkets() {
    if (isFetchingMarkets) {
      console.log("fetchMarkets already running, skipping...");
      return;
    }
    isFetchingMarkets = true;
    try {
      console.log("Starting fetchMarkets...");
      const fetchProvider = defaultProvider || provider;
      if (!fetchProvider) {
        throw new Error("No provider available");
      }
      const fetchRatingsContract = ratingsContract || new ethers.Contract(PULSE_RATINGS_ADDRESS, PULSE_RATINGS_ABI, fetchProvider);
      const fetchPupContract = pupContract ? new ethers.Contract(PUP_ADDRESS, TOKEN_ABI, fetchProvider) : null;
      const fetchPdnContract = pdnContract ? new ethers.Contract(PDN_ADDRESS, TOKEN_ABI, fetchProvider) : null;

      if (!fetchRatingsContract) {
        throw new Error("Ratings contract not initialized");
      }

      if (marketLoadingSpinner) {
        marketLoadingSpinner.classList.remove("hidden");
      }

      if (marketsList) marketsList.innerHTML = "";
      if (lowestRatedList) lowestRatedList.innerHTML = "";
      if (newlyAddedList) newlyAddedList.innerHTML = "";
      if (feedList) feedList.innerHTML = "";
      eventHandlers.clear();
      console.log("Cleared event handlers and market lists");

      console.log("Fetching MarketCreated events...");
      const filter = fetchRatingsContract.filters.MarketCreated();
      let events = [];
      try {
        events = await fetchRatingsContract.queryFilter(filter, 0, "latest");
        console.log(`Found ${events.length} MarketCreated events`);
      } catch (queryError) {
        console.error("Error querying MarketCreated events:", queryError);
        throw new Error("Failed to fetch market events");
      }

      const marketsMap = new Map();
      for (const event of events) {
        let marketAddress;
        try {
          marketAddress = ethers.getAddress(event.args.marketAddress);
          console.log(`Checksummed marketAddress for ${event.args.url}: ${marketAddress}`);
        } catch (error) {
          console.error(`Invalid marketAddress for ${event.args.url}: ${event.args.marketAddress}`, error);
          continue; // Skip invalid addresses
        }
        const url = event.args.url;
        const normalizedUrl = url.toLowerCase();
        if (!marketsMap.has(normalizedUrl) || event.blockNumber > marketsMap.get(normalizedUrl).blockNumber) {
          marketsMap.set(normalizedUrl, { url, marketAddress, blockNumber: event.blockNumber });
          console.log(`Keeping market for ${url} (Address: ${marketAddress}, Block: ${event.blockNumber})`);
        } else {
          console.log(`Skipping duplicate market for ${url} (Address: ${marketAddress}, Older Block: ${event.blockNumber})`);
        }
      }
      console.log(`Unique markets after deduplication: ${marketsMap.size}`);

      allMarkets = [];
      for (const [normalizedUrl, { url, marketAddress, blockNumber }] of marketsMap) {
        let upvotes = 0;
        let downvotes = 0;
        try {
          // Validate marketAddress
          if (!ethers.isAddress(marketAddress)) {
            throw new Error(`Invalid marketAddress: ${marketAddress}`);
          }
          console.log(`Fetching votes for ${url} at ${marketAddress}`);
          if (fetchPupContract) {
            try {
              const upvoteBalance = await fetchPupContract.balanceOf(marketAddress);
              upvotes = Number(ethers.formatEther(upvoteBalance));
            } catch (error) {
              console.error(`Failed to fetch upvotes for ${url} at ${marketAddress}:`, error);
              upvotes = 0;
            }
          } else {
            console.warn(`PUP contract not available, setting upvotes to 0 for ${url}`);
            upvotes = 0;
          }
          if (fetchPdnContract) {
            try {
              const downvoteBalance = await fetchPdnContract.balanceOf(marketAddress);
              downvotes = Number(ethers.formatEther(downvoteBalance));
            } catch (error) {
              console.error(`Failed to fetch downvotes for ${url} at ${marketAddress}:`, error);
              downvotes = 0;
            }
          } else {
            console.warn(`PDN contract not available, setting downvotes to 0 for ${url}`);
            downvotes = 0;
          }
          console.log(`Votes for ${url} (${marketAddress}): Upvotes=${upvotes}, Downvotes=${downvotes}`);
        } catch (error) {
          console.error(`Error fetching votes for ${url} at ${marketAddress}:`, error);
          upvotes = 0;
          downvotes = 0;
        }
        allMarkets.push({ normalizedUrl, url, marketAddress, blockNumber, upvotes, downvotes });
      }

      if (marketsList) {
        const highestRated = allMarkets
          .sort((a, b) => b.upvotes - a.upvotes)
          .slice(0, 4);
        for (const { normalizedUrl, url, marketAddress, upvotes, downvotes } of highestRated) {
          await renderMarketBox(marketsList, normalizedUrl, url, marketAddress, upvotes, downvotes, true);
        }
        if (highestRated.length === 0) {
          marketsList.innerHTML = `<p class="text-gray-500 text-sm">No markets found.</p>`;
        }
      }

      if (lowestRatedList) {
        const lowestRated = allMarkets
          .sort((a, b) => b.downvotes - a.downvotes)
          .slice(0, 4);
        for (const { normalizedUrl, url, marketAddress, upvotes, downvotes } of lowestRated) {
          await renderMarketBox(lowestRatedList, normalizedUrl, url, marketAddress, upvotes, downvotes, true);
        }
        if (lowestRated.length === 0) {
          lowestRatedList.innerHTML = `<p class="text-gray-500 text-sm">No markets found.</p>`;
        }
      }

      if (newlyAddedList) {
        const newlyAdded = allMarkets
          .sort((a, b) => b.blockNumber - a.blockNumber)
          .slice(0, 4);
        for (const { normalizedUrl, url, marketAddress, upvotes, downvotes } of newlyAdded) {
          await renderMarketBox(newlyAddedList, normalizedUrl, url, marketAddress, upvotes, downvotes, false);
        }
        if (newlyAdded.length === 0) {
          newlyAddedList.innerHTML = `<p class="text-gray-500 text-sm">No markets found.</p>`;
        }
      }

      if (feedList) {
        const filteredSortedMarkets = filterAndSortMarkets(allMarkets);
        const totalPages = Math.ceil(filteredSortedMarkets.length / marketsPerPage);
        const startIndex = (currentPage - 1) * marketsPerPage;
        const endIndex = startIndex + marketsPerPage;
        const currentMarkets = filteredSortedMarkets.slice(startIndex, endIndex);

        console.log(`Feed page: Rendering page ${currentPage}, ${currentMarkets.length} markets`);
        for (const { normalizedUrl, url, marketAddress, upvotes, downvotes } of currentMarkets) {
          await renderMarketBox(feedList, normalizedUrl, url, marketAddress, upvotes, downvotes, true);
        }

        if (currentMarkets.length === 0) {
          feedList.innerHTML = `<p class="text-gray-500 text-sm">No markets found.</p>`;
        }

        // Update pagination controls
        if (pageInfo) {
          pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        }
        if (prevPageBtn) {
          prevPageBtn.disabled = currentPage === 1;
        }
        if (nextPageBtn) {
          nextPageBtn.disabled = currentPage >= totalPages;
        }
      }

      console.log(`Rendered ${marketsList?.children.length || 0} markets in Highest Rated, ${lowestRatedList?.children.length || 0} in Lowest Rated, ${newlyAddedList?.children.length || 0} in Newly Added, ${feedList?.children.length || 0} in Feed`);
    } catch (error) {
      logError("Error fetching markets", error);
      if (marketsList) marketsList.innerHTML = `<p class="text-red-500 text-sm">Error fetching markets: ${error.message}</p>`;
      if (lowestRatedList) lowestRatedList.innerHTML = `<p class="text-red-500 text-sm">Error fetching markets: ${error.message}</p>`;
      if (newlyAddedList) newlyAddedList.innerHTML = `<p class="text-red-500 text-sm">Error fetching markets: ${error.message}</p>`;
      if (feedList) feedList.innerHTML = `<p class="text-red-500 text-sm">Error fetching markets: ${error.message}</p>`;
    } finally {
      if (marketLoadingSpinner) {
        marketLoadingSpinner.classList.add("hidden");
      }
      isFetchingMarkets = false;
      console.log("fetchMarkets completed");
    }
  }

  // Initialize app on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    try {
      console.log("DOMContentLoaded event fired");
      initApp();
    } catch (error) {
      logError("Error in DOMContentLoaded handler", error);
    }
  });
})();
} catch (error) {
  console.error("Top-level error in app.js, possibly due to SES or extension:", error);
  if (document.getElementById("walletStatus")) {
    document.getElementById("walletStatus").textContent = "Error: App failed to load, check Console for details.";
  }
}
