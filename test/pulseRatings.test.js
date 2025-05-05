const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Pulse Ratings System", function () {
  async function deployContractsFixture() {
    const [owner, minter, user1, user2, receiver] = await ethers.getSigners();

    console.log("Deploying contracts with owner:", owner.address);

    // Deploy PUP contract
    const PUP = await ethers.getContractFactory("PUP");
    let pup;
    try {
      pup = await PUP.deploy();
      await pup.waitForDeployment();
      const pupAddress = await pup.getAddress();
      console.log("PUP deployed at:", pupAddress);
    } catch (error) {
      console.error("Error deploying PUP:", error);
      throw error;
    }

    // Deploy PDN contract
    const PDN = await ethers.getContractFactory("PDN");
    let pdn;
    try {
      pdn = await PDN.deploy();
      await pdn.waitForDeployment();
      const pdnAddress = await pdn.getAddress();
      console.log("PDN deployed at:", pdnAddress);
    } catch (error) {
      console.error("Error deploying PDN:", error);
      throw error;
    }

    // Deploy PulseRatings contract
    const PulseRatings = await ethers.getContractFactory("PulseRatings");
    let pulseRatings;
    try {
      pulseRatings = await PulseRatings.deploy(
        await pup.getAddress(),
        await pdn.getAddress(),
        receiver.address
      );
      await pulseRatings.waitForDeployment();
      const pulseRatingsAddress = await pulseRatings.getAddress();
      console.log("PulseRatings deployed at:", pulseRatingsAddress);
    } catch (error) {
      console.error("Error deploying PulseRatings:", error);
      throw error;
    }

    // Grant MINTER_ROLE to PulseRatings contract
    const MINTER_ROLE = await pup.MINTER_ROLE();
    try {
      await pup.grantRole(MINTER_ROLE, await pulseRatings.getAddress());
      await pdn.grantRole(MINTER_ROLE, await pulseRatings.getAddress());
      console.log("MINTER_ROLE granted to PulseRatings");
    } catch (error) {
      console.error("Error granting MINTER_ROLE:", error);
      throw error;
    }

    return { pup, pdn, pulseRatings, owner, minter, user1, user2, receiver };
  }

  describe("PUP Contract", function () {
    it("should deploy with correct name and symbol", async function () {
      const { pup } = await loadFixture(deployContractsFixture);
      expect(await pup.getAddress()).to.not.equal(ethers.ZeroAddress, "PUP address is zero");
      expect(await pup.name()).to.equal("Pulse Thumbs Up");
      expect(await pup.symbol()).to.equal("PUP");
    });

    it("should assign DEFAULT_ADMIN_ROLE to deployer", async function () {
      const { pup, owner } = await loadFixture(deployContractsFixture);
      const DEFAULT_ADMIN_ROLE = await pup.DEFAULT_ADMIN_ROLE();
      expect(await pup.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("should allow minter to mint tokens and update upvotes", async function () {
      const { pup, pulseRatings, user1 } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("1000");
      const url = "test.com";
      const marketAddress = await pulseRatings.getMarketAddress(url);
      const price = await pulseRatings.previewPayment(amount);
      await expect(pulseRatings.connect(user1).createUpRating({ url, amount }, { value: price }))
        .to.emit(pup, "Transfer")
        .withArgs(ethers.ZeroAddress, marketAddress, amount);
      expect(await pup.upvotes(user1.address)).to.equal(amount);
      expect(await pup.balanceOf(marketAddress)).to.equal(amount);
    });

    it("should revert if non-minter tries to mint", async function () {
      const { pup, user1 } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("1000");
      await expect(pup.connect(user1).mint(user1.address, user1.address, amount)).to.be.revertedWithCustomError(
        pup,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("should allow admin to recover ERC20 tokens", async function () {
      const { pup, owner, receiver } = await loadFixture(deployContractsFixture);
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000"));
      await mockToken.waitForDeployment();
      await mockToken.transfer(await pup.getAddress(), ethers.parseEther("500"));
      await expect(pup.recoverERC20(await mockToken.getAddress(), receiver.address))
        .to.emit(mockToken, "Transfer")
        .withArgs(await pup.getAddress(), receiver.address, ethers.parseEther("500"));
    });

    describe("Recover ERC20", function () {
      it("should revert if token address is zero", async function () {
        const { pup, owner } = await loadFixture(deployContractsFixture);
        await expect(
          pup.recoverERC20(ethers.ZeroAddress, owner.address)
        ).to.be.revertedWithCustomError(pup, "ZeroAddress");
      });

      it("should revert if recipient is zero address", async function () {
        const { pup, owner } = await loadFixture(deployContractsFixture);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000"));
        await mockToken.waitForDeployment();
        await expect(
          pup.recoverERC20(await mockToken.getAddress(), ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(pup, "ZeroAddress");
      });

      it("should revert if non-admin tries to recover ERC20", async function () {
        const { pup, user1, receiver } = await loadFixture(deployContractsFixture);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000"));
        await mockToken.waitForDeployment();
        await expect(
          pup.connect(user1).recoverERC20(await mockToken.getAddress(), receiver.address)
        ).to.be.revertedWithCustomError(pup, "AccessControlUnauthorizedAccount");
      });
    });
  });

  describe("PDN Contract", function () {
    it("should deploy with correct name and symbol", async function () {
      const { pdn } = await loadFixture(deployContractsFixture);
      expect(await pdn.getAddress()).to.not.equal(ethers.ZeroAddress, "PDN address is zero");
      expect(await pdn.name()).to.equal("Pulse Thumbs Down");
      expect(await pdn.symbol()).to.equal("PDN");
    });

    it("should allow minter to mint tokens and update downvotes", async function () {
      const { pdn, pulseRatings, user1 } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("1000");
      const url = "test.com";
      const marketAddress = await pulseRatings.getMarketAddress(url);
      const price = await pulseRatings.previewPayment(amount);
      await expect(pulseRatings.connect(user1).createDownRating({ url, amount }, { value: price }))
        .to.emit(pdn, "Transfer")
        .withArgs(ethers.ZeroAddress, marketAddress, amount);
      expect(await pdn.downvotes(user1.address)).to.equal(amount);
      expect(await pdn.balanceOf(marketAddress)).to.equal(amount);
    });

    it("should revert if non-minter tries to mint", async function () {
      const { pdn, user1 } = await loadFixture(deployContractsFixture);
      const amount = ethers.parseEther("1000");
      await expect(pdn.connect(user1).mint(user1.address, user1.address, amount)).to.be.revertedWithCustomError(
        pdn,
        "AccessControlUnauthorizedAccount"
      );
    });

    describe("Recover ERC20", function () {
      it("should revert if token address is zero", async function () {
        const { pdn, owner } = await loadFixture(deployContractsFixture);
        await expect(
          pdn.recoverERC20(ethers.ZeroAddress, owner.address)
        ).to.be.revertedWithCustomError(pdn, "ZeroAddress");
      });

      it("should revert if recipient is zero address", async function () {
        const { pdn, owner } = await loadFixture(deployContractsFixture);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000"));
        await mockToken.waitForDeployment();
        await expect(
          pdn.recoverERC20(await mockToken.getAddress(), ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(pdn, "ZeroAddress");
      });

      it("should revert if non-admin tries to recover ERC20", async function () {
        const { pdn, user1, receiver } = await loadFixture(deployContractsFixture);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000"));
        await mockToken.waitForDeployment();
        await expect(
          pdn.connect(user1).recoverERC20(await mockToken.getAddress(), receiver.address)
        ).to.be.revertedWithCustomError(pdn, "AccessControlUnauthorizedAccount");
      });
    });
  });

  describe("PulseRatings Contract", function () {
    describe("Deployment", function () {
      it("should deploy with correct initial state", async function () {
        const { pulseRatings, pup, pdn, receiver } = await loadFixture(deployContractsFixture);
        expect(await pulseRatings.getAddress()).to.not.equal(ethers.ZeroAddress, "PulseRatings address is zero");
        expect(await pulseRatings.tokenUp()).to.equal(await pup.getAddress());
        expect(await pulseRatings.tokenDown()).to.equal(await pdn.getAddress());
        expect(await pulseRatings.receiver()).to.equal(receiver.address);
        expect(await pulseRatings.VERSION()).to.equal("1.0.0");
        expect(await pulseRatings.SEED()).to.equal("Pulse_Ratings_by_UDL_PC_AL");
        expect(await pulseRatings.MIN_RATING_AMOUNT()).to.equal(ethers.parseEther("1000"));
        expect(await pulseRatings.ratingPrice()).to.equal(ethers.parseEther("0.7"));
        expect(await pulseRatings.isPaused()).to.be.false;
      });

      it("should revert if tokenUp is zero address", async function () {
        const { pdn, receiver } = await loadFixture(deployContractsFixture);
        const PulseRatings = await ethers.getContractFactory("PulseRatings");
        await expect(
          PulseRatings.deploy(ethers.ZeroAddress, await pdn.getAddress(), receiver.address)
        ).to.be.revertedWithCustomError(PulseRatings, "ZeroAddress");
      });

      it("should revert if tokenDown is zero address", async function () {
        const { pup, receiver } = await loadFixture(deployContractsFixture);
        const PulseRatings = await ethers.getContractFactory("PulseRatings");
        await expect(
          PulseRatings.deploy(await pup.getAddress(), ethers.ZeroAddress, receiver.address)
        ).to.be.revertedWithCustomError(PulseRatings, "ZeroAddress");
      });

      it("should revert if receiver is zero address", async function () {
        const { pup, pdn } = await loadFixture(deployContractsFixture);
        const PulseRatings = await ethers.getContractFactory("PulseRatings");
        await expect(
          PulseRatings.deploy(await pup.getAddress(), await pdn.getAddress(), ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(PulseRatings, "ZeroAddress");
      });
    });

    describe("Ownership", function () {
      it("should transfer ownership and allow acceptance", async function () {
        const { pulseRatings, owner, user1 } = await loadFixture(deployContractsFixture);
        expect(await pulseRatings.owner()).to.equal(owner.address);
        await pulseRatings.connect(owner).transferOwnership(user1.address);
        expect(await pulseRatings.pendingOwner()).to.equal(user1.address);
        await pulseRatings.connect(user1).acceptOwnership();
        expect(await pulseRatings.owner()).to.equal(user1.address);
      });

      it("should revert if non-pending owner tries to accept ownership", async function () {
        const { pulseRatings, owner, user1, user2 } = await loadFixture(deployContractsFixture);
        await pulseRatings.connect(owner).transferOwnership(user1.address);
        await expect(
          pulseRatings.connect(user2).acceptOwnership()
        ).to.be.revertedWithCustomError(pulseRatings, "OwnableUnauthorizedAccount");
      });

      it("should revert if non-owner tries to transfer ownership", async function () {
        const { pulseRatings, user1, user2 } = await loadFixture(deployContractsFixture);
        await expect(
          pulseRatings.connect(user1).transferOwnership(user2.address)
        ).to.be.revertedWithCustomError(pulseRatings, "OwnableUnauthorizedAccount");
      });
    });

    describe("Pausing", function () {
      it("should set paused state to true and emit Paused event", async function () {
        const { pulseRatings, owner } = await loadFixture(deployContractsFixture);
        await expect(pulseRatings.connect(owner).setIsPaused(true))
          .to.emit(pulseRatings, "Paused")
          .withArgs(true);
        expect(await pulseRatings.isPaused()).to.be.true;
      });

      it("should set paused state to false and emit Paused event", async function () {
        const { pulseRatings, owner } = await loadFixture(deployContractsFixture);
        await pulseRatings.connect(owner).setIsPaused(true);
        await expect(pulseRatings.connect(owner).setIsPaused(false))
          .to.emit(pulseRatings, "Paused")
          .withArgs(false);
        expect(await pulseRatings.isPaused()).to.be.false;
      });

      it("should revert if non-owner tries to pause", async function () {
        const { pulseRatings, user1 } = await loadFixture(deployContractsFixture);
        await expect(
          pulseRatings.connect(user1).setIsPaused(true)
        ).to.be.revertedWithCustomError(pulseRatings, "OwnableUnauthorizedAccount");
      });
    });

    describe("Preview Payment", function () {
      it("should correctly preview payment for different amounts", async function () {
        const { pulseRatings } = await loadFixture(deployContractsFixture);
        expect(await pulseRatings.previewPayment(ethers.parseEther("1000"))).to.equal(ethers.parseEther("700"));
        expect(await pulseRatings.previewPayment(ethers.parseEther("2000"))).to.equal(ethers.parseEther("1400"));
        expect(await pulseRatings.previewPayment(ethers.parseEther("3000"))).to.equal(ethers.parseEther("2100"));
        expect(await pulseRatings.previewPayment(ethers.parseEther("4000"))).to.equal(ethers.parseEther("2800"));
      });
    });

    describe("Create Market", function () {
      it("should create a market and emit event", async function () {
        const { pulseRatings } = await loadFixture(deployContractsFixture);
        const url = "test.com";
        await expect(pulseRatings.createMarket(url))
          .to.emit(pulseRatings, "MarketCreated")
          .withArgs(await pulseRatings.getMarketAddress(url), url);
        expect(await pulseRatings.urlToMarket(url)).to.equal(await pulseRatings.getMarketAddress(url));
      });

      it("should revert if market already exists", async function () {
        const { pulseRatings } = await loadFixture(deployContractsFixture);
        const url = "test.com";
        await pulseRatings.createMarket(url);
        await expect(pulseRatings.createMarket(url)).to.be.revertedWithCustomError(pulseRatings, "MarketAlreadyExists");
      });

      it("should revert if URL is empty", async function () {
        const { pulseRatings } = await loadFixture(deployContractsFixture);
        await expect(pulseRatings.createMarket("")).to.be.revertedWithCustomError(pulseRatings, "EmptyURL");
      });
    });

    describe("Bulk Ratings", function () {
      it("should create multiple up and down ratings in sequence", async function () {
        const { pulseRatings, user1, pup, pdn } = await loadFixture(deployContractsFixture);
        const ratings = [
          { url: "test1.com", amount: ethers.parseEther("1000") },
          { url: "test2.com", amount: ethers.parseEther("1000") },
        ];
        const totalAmount = ratings.reduce((sum, r) => sum + r.amount, 0n);
        const totalPrice = await pulseRatings.previewPayment(totalAmount);

        for (const rating of ratings) {
          const price = await pulseRatings.previewPayment(rating.amount);
          await pulseRatings.connect(user1).createUpRating(rating, { value: price });
          await pulseRatings.connect(user1).createDownRating(rating, { value: price });
        }

        for (const rating of ratings) {
          const marketAddress = await pulseRatings.getMarketAddress(rating.url);
          expect(await pup.balanceOf(marketAddress)).to.equal(rating.amount);
          expect(await pdn.balanceOf(marketAddress)).to.equal(rating.amount);
        }
        expect(await pulseRatings.getUserRatings(user1.address)).to.equal(totalAmount * 2n);
      });

      it("should distribute total payment to receiver for multiple ratings", async function () {
        const { pulseRatings, user1, receiver } = await loadFixture(deployContractsFixture);
        const ratings = [
          { url: "test1.com", amount: ethers.parseEther("1000") },
          { url: "test2.com", amount: ethers.parseEther("1000") },
        ];
        const totalAmount = ratings.reduce((sum, r) => sum + r.amount, 0n);
        const totalPrice = await pulseRatings.previewPayment(totalAmount);

        const initialBalance = await ethers.provider.getBalance(receiver.address);
        for (const rating of ratings) {
          const price = await pulseRatings.previewPayment(rating.amount);
          await pulseRatings.connect(user1).createUpRating(rating, { value: price });
        }
        const finalBalance = await ethers.provider.getBalance(receiver.address);
        expect(finalBalance - initialBalance).to.equal(totalPrice);
      });
    });

    describe("Create Ratings", function () {
      it("should create up rating and emit event", async function () {
        const { pulseRatings, user1 } = await loadFixture(deployContractsFixture);
        const rating = { url: "test.com", amount: ethers.parseEther("1000") };
        const price = await pulseRatings.previewPayment(rating.amount);
        await expect(pulseRatings.connect(user1).createUpRating(rating, { value: price }))
          .to.emit(pulseRatings, "RatingUpCreated")
          .withArgs(user1.address, await pulseRatings.getMarketAddress(rating.url), rating.amount);
      });

      it("should create down rating and emit event", async function () {
        const { pulseRatings, user1 } = await loadFixture(deployContractsFixture);
        const rating = { url: "test.com", amount: ethers.parseEther("1000") };
        const price = await pulseRatings.previewPayment(rating.amount);
        await expect(pulseRatings.connect(user1).createDownRating(rating, { value: price }))
          .to.emit(pulseRatings, "RatingDownCreated")
          .withArgs(user1.address, await pulseRatings.getMarketAddress(rating.url), rating.amount);
      });

      it("should revert rating if contract is paused", async function () {
        const { pulseRatings, owner } = await loadFixture(deployContractsFixture);
        await pulseRatings.connect(owner).setIsPaused(true);
        const rating = { url: "test.com", amount: ethers.parseEther("1000") };
        const price = await pulseRatings.previewPayment(rating.amount);
        await expect(pulseRatings.createUpRating(rating, { value: price })).to.be.revertedWithCustomError(
          pulseRatings,
          "ContractPaused"
        );
      });

      it("should revert if rating amount is invalid", async function () {
        const { pulseRatings } = await loadFixture(deployContractsFixture);
        const rating = { url: "test.com", amount: ethers.parseEther("500") }; // Below MIN_RATING_AMOUNT
        const price = await pulseRatings.previewPayment(rating.amount);
        await expect(pulseRatings.createUpRating(rating, { value: price })).to.be.revertedWithCustomError(
          pulseRatings,
          "InvalidRatingAmount"
        );
      });

      it("should revert if payment is insufficient", async function () {
        const { pulseRatings } = await loadFixture(deployContractsFixture);
        const rating = { url: "test.com", amount: ethers.parseEther("1000") };
        const price = await pulseRatings.previewPayment(rating.amount);
        await expect(pulseRatings.createUpRating(rating, { value: price / 2n })).to.be.revertedWithCustomError(
          pulseRatings,
          "InsufficientPayment"
        );
      });

      it("should refund excess payment", async function () {
        const { pulseRatings, user1 } = await loadFixture(deployContractsFixture);
        const rating = { url: "test.com", amount: ethers.parseEther("1000") };
        const price = await pulseRatings.previewPayment(rating.amount);
        const excess = ethers.parseEther("100");
        const initialBalance = await ethers.provider.getBalance(user1.address);
        const tx = await pulseRatings.connect(user1).createUpRating(rating, { value: price + excess });
        const receipt = await tx.wait();
        const gasPrice = receipt.effectiveGasPrice ? BigInt(receipt.effectiveGasPrice) : BigInt(receipt.gasPrice);
        const gasUsed = BigInt(receipt.gasUsed) * gasPrice;
        const finalBalance = await ethers.provider.getBalance(user1.address);
        expect(finalBalance).to.equal(initialBalance - price - gasUsed);
      });
    });

    describe("Receiver Management", function () {
      it("should allow owner to set receiver", async function () {
        const { pulseRatings, owner, user1 } = await loadFixture(deployContractsFixture);
        await expect(pulseRatings.connect(owner).setReceiver(user1.address))
          .to.emit(pulseRatings, "ReceiverUpdated")
          .withArgs(user1.address);
        expect(await pulseRatings.receiver()).to.equal(user1.address);
      });

      it("should revert if non-owner tries to set receiver", async function () {
        const { pulseRatings, user1, user2 } = await loadFixture(deployContractsFixture);
        await expect(
          pulseRatings.connect(user1).setReceiver(user2.address)
        ).to.be.revertedWithCustomError(pulseRatings, "OwnableUnauthorizedAccount");
      });
    });

    describe("Recover ERC20", function () {
      it("should allow owner to recover ERC20 tokens", async function () {
        const { pulseRatings, owner, receiver } = await loadFixture(deployContractsFixture);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000"));
        await mockToken.waitForDeployment();
        await mockToken.transfer(await pulseRatings.getAddress(), ethers.parseEther("500"));
        await expect(pulseRatings.recoverERC20(await mockToken.getAddress(), receiver.address))
          .to.emit(mockToken, "Transfer")
          .withArgs(await pulseRatings.getAddress(), receiver.address, ethers.parseEther("500"));
      });

      it("should revert if token address is zero", async function () {
        const { pulseRatings, owner } = await loadFixture(deployContractsFixture);
        await expect(
          pulseRatings.recoverERC20(ethers.ZeroAddress, owner.address)
        ).to.be.revertedWithCustomError(pulseRatings, "ZeroAddress");
      });

      it("should revert if recipient is zero address", async function () {
        const { pulseRatings, owner } = await loadFixture(deployContractsFixture);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000"));
        await mockToken.waitForDeployment();
        await expect(
          pulseRatings.recoverERC20(await mockToken.getAddress(), ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(pulseRatings, "ZeroAddress");
      });

      it("should revert if non-owner tries to recover ERC20", async function () {
        const { pulseRatings, user1, receiver } = await loadFixture(deployContractsFixture);
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Mock Token", "MOCK", ethers.parseEther("1000"));
        await mockToken.waitForDeployment();
        await expect(
          pulseRatings.connect(user1).recoverERC20(await mockToken.getAddress(), receiver.address)
        ).to.be.revertedWithCustomError(pulseRatings, "OwnableUnauthorizedAccount");
      });
    });

    describe("User Ratings", function () {
      it("should return total user ratings", async function () {
        const { pulseRatings, user1 } = await loadFixture(deployContractsFixture);
        const rating = { url: "test.com", amount: ethers.parseEther("1000") };
        const price = await pulseRatings.previewPayment(rating.amount);
        await pulseRatings.connect(user1).createUpRating(rating, { value: price });
        await pulseRatings.connect(user1).createDownRating(rating, { value: price });
        expect(await pulseRatings.getUserRatings(user1.address)).to.equal(ethers.parseEther("2000"));
      });
    });
  });
});
