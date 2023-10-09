import { ethers } from "hardhat";
import { setBalance, loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const ercAbi = require("./abis/erc20.json");
import { expect } from "chai";
import { ERC20__factory } from '../typechain-types'; // https://github.com/ethers-io/ethers.js/discussions/2417
//const {deployMockContract} = require('@ethereum-waffle/mock-contract'); // tutorial: https://npmjs.com/package/@ethereum-waffle/mock-contract "@ethereum-waffle/mock-contract": "4.0.3",

const DAI_PARTS_EXCHANGE_RATE = 1;
const DAI_MINT_PARTS_EXCHANGE_RATE = 1;
const USDC_PARTS_EXCHANGE_RATE = 2;
const USDC_MINT_PARTS_EXCHANGE_RATE = 5;
const USDT_PARTS_EXCHANGE_RATE = 3;
const USDT_MINT_PARTS_EXCHANGE_RATE = 7;

const DAI_MAINNET_CONTRACT_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f";
const USDC_MAINNET_CONTRACT_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT_MAINNET_CONTRACT_ADDRESS = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const WETH_MAINNET_CONTRACT_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";


describe ("Token Sales Test", function() {

  async function deployContracts() {
    // Is it OK to use ether units in place of number of tokens?
    const [ owner ] = await ethers.getSigners();
    const cap = ethers.parseEther("2000000");
    const saleDurationDays = 60;
    const meetupToken = await ethers.deployContract("MeetupERC20Token", [cap]);
    const salesContract = await ethers.deployContract("SimpleSaleContract", [await meetupToken.getAddress(), saleDurationDays]);

    await meetupToken.transferOwnership(await salesContract.getAddress());

    await salesContract.setPaymentTokenExchangeRate(DAI_MAINNET_CONTRACT_ADDRESS, DAI_PARTS_EXCHANGE_RATE, DAI_MINT_PARTS_EXCHANGE_RATE); // DAI
    await salesContract.setPaymentTokenExchangeRate(USDC_MAINNET_CONTRACT_ADDRESS, USDC_PARTS_EXCHANGE_RATE, USDC_MINT_PARTS_EXCHANGE_RATE); // USDC
    await salesContract.setPaymentTokenExchangeRate(USDT_MAINNET_CONTRACT_ADDRESS, USDT_PARTS_EXCHANGE_RATE, USDT_MINT_PARTS_EXCHANGE_RATE); // USDT

    const dai = ERC20__factory.connect(DAI_MAINNET_CONTRACT_ADDRESS, ethers.provider);
    const usdc = ERC20__factory.connect(USDC_MAINNET_CONTRACT_ADDRESS, ethers.provider);
    const usdt = ERC20__factory.connect(USDT_MAINNET_CONTRACT_ADDRESS, ethers.provider);
    const weth = ERC20__factory.connect(WETH_MAINNET_CONTRACT_ADDRESS, ethers.provider);

    // const mockWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    // await setBalance(mockWallet.address, 10000000000000000000);
    // const mockContract = await deployMockContract(mockWallet, ercAbi);
    // await salesContract.setPaymentTokenExchangeRate(mockContract.address, 1, MOCK_EXCHANGE_RATE); // MOCK
    
    return {
      owner,
      cap,
      saleDurationDays,
      meetupToken,
      salesContract,
      usdt,
      usdc,
      dai,
      weth,
      // mockContract,
    };
  }

  describe("Token exchange rate", () => {
    it("Should set token exchange rate", async () => {
      const { salesContract } = await loadFixture(deployContracts);

      const golem = "0xa74476443119A942dE498590Fe1f2454d7D4aC0d";
      const partsSell = ethers.toBigInt(4);
      const partsMint = ethers.toBigInt(11);
      await salesContract.setPaymentTokenExchangeRate(golem, partsSell, partsMint);
      expect(await salesContract.paymentTokensExchangeRate(golem)).to.contain(partsSell).and.to.contain(partsMint);
    });

    it("Should revert when the token address is 0x0", async () => {
      const { salesContract } = await loadFixture(deployContracts);

      const token = "0x0000000000000000000000000000000000000000";
      const partsSell = ethers.toBigInt(4);
      const partsMint = ethers.toBigInt(11);
      await expect(salesContract.setPaymentTokenExchangeRate(token, partsSell, partsMint))
        .to.be.revertedWith("Payment token is invalid");
    });

    it("Should revert when parts sell is invalid", async () => {
      const { salesContract } = await loadFixture(deployContracts);

      const golem = "0xa74476443119A942dE498590Fe1f2454d7D4aC0d";
      const partsSell = ethers.toBigInt(0);
      const partsMint = ethers.toBigInt(11);
      await expect(salesContract.setPaymentTokenExchangeRate(golem, partsSell, partsMint))
        .to.be.revertedWith("Invalid exchange rate");
    });

    it("Should revert when parts mint is invalid", async () => {
      const { salesContract } = await loadFixture(deployContracts);

      const golem = "0xa74476443119A942dE498590Fe1f2454d7D4aC0d";
      const partsSell = ethers.toBigInt(14);
      const partsMint = ethers.toBigInt(0);
      await expect(salesContract.setPaymentTokenExchangeRate(golem, partsSell, partsMint))
        .to.be.revertedWith("Invalid exchange rate");
    });
  });

  describe("Unset token exchange rate", () => {
    it("Should unset token exchange rate", async () => {
      const { salesContract } = await loadFixture(deployContracts);

      const golem = "0xa74476443119A942dE498590Fe1f2454d7D4aC0d";
      const partsSell = ethers.toBigInt(4);
      const partsMint = ethers.toBigInt(11);
      await salesContract.setPaymentTokenExchangeRate(golem, partsSell, partsMint);
      await salesContract.unsetPaymentTokenExchangeRate(golem);
      expect(await salesContract.paymentTokensExchangeRate(golem)).to.contain(ethers.toBigInt(0)).and.to.contain(ethers.toBigInt(0));
    });

    it("Should unset token exchange rate even if it was not set", async () => {
      const { salesContract } = await loadFixture(deployContracts);

      const golem = "0xa74476443119A942dE498590Fe1f2454d7D4aC0d";
      await salesContract.unsetPaymentTokenExchangeRate(golem);
      expect(await salesContract.paymentTokensExchangeRate(golem)).to.contain(ethers.toBigInt(0)).and.to.contain(ethers.toBigInt(0));
    });

    it("Should revoke if not the owner is calling", async () => {
      const { salesContract } = await loadFixture(deployContracts);

      const [, notOwner] = await ethers.getSigners();
      const golem = "0xa74476443119A942dE498590Fe1f2454d7D4aC0d";
      await expect(salesContract.connect(notOwner).unsetPaymentTokenExchangeRate(golem)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Buy tokens for tokens", function () {
    it("Should buy test token for DAI", async function () {
      const tokensToBuy = 5;

      const { meetupToken, salesContract, dai, } = await loadFixture(deployContracts);

      const daiOwner = await ethers.getImpersonatedSigner("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F");
      await setBalance("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F", 10000000000000000000);

      // buy procedure 
      await dai.connect(daiOwner).approve(await salesContract.getAddress(), 10000000);
      await salesContract.connect(daiOwner).buyTokens(tokensToBuy, await dai.getAddress(), {});

      expect(await meetupToken.balanceOf(daiOwner.address)).to.equal(tokensToBuy);
      expect(await dai.balanceOf(await salesContract.getAddress())).to.equal(tokensToBuy * DAI_PARTS_EXCHANGE_RATE / DAI_MINT_PARTS_EXCHANGE_RATE);
    })

    it("Should buy test token for USDC", async function () {
      const tokensToBuy = 5;

      const { meetupToken, salesContract, usdc, } = await loadFixture(deployContracts);

      const usdcOwner = await ethers.getImpersonatedSigner("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49");
      await setBalance("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49", 10000000000000000000);

      // buy procedure 
      await usdc.connect(usdcOwner).approve(await salesContract.getAddress(), 10000000);
      await salesContract.connect(usdcOwner).buyTokens(tokensToBuy, await usdc.getAddress(), {});

      expect(await meetupToken.balanceOf(usdcOwner.address)).to.equal(tokensToBuy);
      expect(await usdc.balanceOf(await salesContract.getAddress())).to.equal(tokensToBuy * USDC_PARTS_EXCHANGE_RATE / USDC_MINT_PARTS_EXCHANGE_RATE);
    })

    it("Should buy test token for USDT", async function () {
      const tokensToBuy = 5;
      const { meetupToken, salesContract, usdt, } = await loadFixture(deployContracts);
      
      const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
      await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

      // buy procedure 
      await usdt.connect(usdtOwner).approve(await salesContract.getAddress(), 10000000);
      await salesContract.connect(usdtOwner).buyTokens(tokensToBuy, await usdt.getAddress(), {});

      const contractExpectedUsdtBalance = Math.floor(tokensToBuy * USDT_PARTS_EXCHANGE_RATE / USDT_MINT_PARTS_EXCHANGE_RATE);
      expect(await meetupToken.balanceOf(usdtOwner.address)).to.equal(tokensToBuy);
      expect(await usdt.balanceOf(await salesContract.getAddress())).to.equal(contractExpectedUsdtBalance);
    })

    it("Should revert when the amount to buy is zero", async () => {
      const tokensToBuy = 0;
      const { salesContract, usdt, } = await loadFixture(deployContracts);
      
      const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
      await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

      // buy procedure 
      await usdt.connect(usdtOwner).approve(await salesContract.getAddress(), 10000000);
      await expect(salesContract.connect(usdtOwner).buyTokens(tokensToBuy, await usdt.getAddress(), {}))
        .to.be.revertedWith("Tokens value should be positive");
    });

    it("Should revert when the exchange rate is not set", async () => {
      const tokensToBuy = 10;
      const unsetPaymentTokenAddress = "0x60FaAe176336dAb62e284Fe19B885B095d29fB7F";
      const { salesContract, usdt, } = await loadFixture(deployContracts);
      
      const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
      await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

      // buy procedure
      await usdt.connect(usdtOwner).approve(await salesContract.getAddress(), 10000000);
      await expect(salesContract.connect(usdtOwner).buyTokens(tokensToBuy, unsetPaymentTokenAddress, {}))
        .to.be.revertedWith("Payment token not allowed");
    });

    it("Should revert when the owner did not approve the tokens transfer", async () => {
      const tokensToBuy = 10;
      const { salesContract, usdt, } = await loadFixture(deployContracts);
      
      const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
      await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

      // buy procedure
      await expect(salesContract.connect(usdtOwner).buyTokens(tokensToBuy, usdt, {}))
        .to.be.revertedWith("SafeERC20: low-level call failed");
    });

    // it("Should revert when the owner is 0x0", async function () {
    //   const tokensToBuy = 10;
    //   const { salesContract, usdt, mockContract } = await loadFixture(deployContracts);
      
    //   const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
    //   await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

    //   // const usdt0x0Owner = await ethers.getImpersonatedSigner("0x0000000000000000000000000000000000000000");
    //   // await setBalance(usdt0x0Owner.address, 10000000000000000000);

    //   await mockContract.mock.transferFrom.returns("false");

    //   // buy procedure
    //   await expect(salesContract.connect(usdt0x0Owner).buyTokens(tokensToBuy, mockContract.address))
    //     .to.be.revertedWith("ERC20: mint to the zero address");
    // });

    it("Should revert if sales contract is not the owner of the token contract", async () => {
      const tokensToBuy = 10;
      const { salesContract, usdt, meetupToken, owner } = await loadFixture(deployContracts);
      
      const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
      await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);
      
      const salesContractSigner = await ethers.getImpersonatedSigner(await salesContract.getAddress());
      await setBalance(salesContractSigner.address, 10000000000000000000);
      await meetupToken.connect(salesContractSigner).transferOwnership(usdtOwner);

      // buy procedure 
      await usdt.connect(usdtOwner).approve(await salesContract.getAddress(), 10000000);

      // FAILS with the following error
      // Error: VM Exception while processing transaction: reverted with reason string 'Ownable: caller is not the owner'
      // Which is exactly what I'm expecting in my test 
      await expect(salesContract.connect(usdtOwner).buyTokens(tokensToBuy, await usdt.getAddress(), {}))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert when buying after the end of the sale", async () => {
      const tokensToBuy = 1;
      const { salesContract, usdt, saleDurationDays: saleDurationDays} = await loadFixture(deployContracts);
      
      const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
      await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

      // buy procedure 
      await usdt.connect(usdtOwner).approve(await salesContract.getAddress(), 10000000);
      await time.increase(saleDurationDays * 24 * 60 * 60);
      await expect(salesContract.connect(usdtOwner).buyTokens(tokensToBuy, await usdt.getAddress(), {}))
        .to.be.revertedWith("Sale is not possible anymore");
    });
  })

  describe("Buy tokens for ether", () => {
    it("Should buy tokens", async () => {
      const tokensToBuy = 15;

      const { meetupToken, salesContract, weth, } = await loadFixture(deployContracts);

      const owner = await ethers.getImpersonatedSigner("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49");
      await setBalance("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49", 10000000000000000000);

      const partsEther = 2;
      const partsToken = 3;
      await salesContract.setPaymentTokenExchangeRate(weth, partsEther, partsToken);

      const tokensPrice = tokensToBuy / partsToken * partsEther;
      await salesContract.connect(owner)
        .buyTokensForEther(tokensToBuy, { value: tokensPrice});

      expect(await meetupToken.balanceOf(owner)).to.equal(tokensToBuy, "Buyer doesn't have sufficient number of minter tokens");
      expect(await weth.balanceOf(salesContract)).to.equal(tokensPrice, "Sales contract doesn't have sufficient amount of WETH");
    });

    it("Should revert when the number to buy is zero", async () => {
      const tokensToBuy = 0;

      const { salesContract, weth, } = await loadFixture(deployContracts);

      const owner = await ethers.getImpersonatedSigner("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49");
      await setBalance("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49", 10000000000000000000);

      const partsEther = 2;
      const partsToken = 3;
      await salesContract.setPaymentTokenExchangeRate(await weth.getAddress(), partsEther, partsToken);

      const tokensPrice = tokensToBuy / partsToken * partsEther;

      await expect(salesContract.connect(owner)
          .buyTokensForEther(tokensToBuy, { value: tokensPrice}))
        .to.be.revertedWith("Tokens value should be positive");
    });

    it("Should revert when payment with ether is not allowed", async () => {
      const tokensToBuy = 15;

      const { salesContract } = await loadFixture(deployContracts);

      const owner = await ethers.getImpersonatedSigner("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49");
      await setBalance("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49", 10000000000000000000);

      const partsEther = 2;
      const partsToken = 3;

      const tokensPrice = tokensToBuy / partsToken * partsEther;

      await expect(salesContract.connect(owner)
          .buyTokensForEther(tokensToBuy, { value: tokensPrice}))
        .to.be.revertedWith("Payment token not allowed");
    });

    it("Should revert when the sale has ended", async () => {
      const tokensToBuy = 15;

      const { salesContract, saleDurationDays: saleDurationDays, weth, } = await loadFixture(deployContracts);

      const owner = await ethers.getImpersonatedSigner("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49");
      await setBalance("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49", 10000000000000000000);

      const partsEther = 2;
      const partsToken = 3;
      await salesContract.setPaymentTokenExchangeRate(weth, partsEther, partsToken);

      const tokensPrice = tokensToBuy / partsToken * partsEther;

      time.increase(saleDurationDays * 24 * 60 * 60);

      await expect(salesContract.connect(owner)
          .buyTokensForEther(tokensToBuy, { value: tokensPrice}))
        .to.be.revertedWith("Sale is not possible anymore");
    });

    it("Should revert when the number of ether does not correspond the price of the tokens", async () => {
      const tokensToBuy = 15;

      const { salesContract, weth, } = await loadFixture(deployContracts);

      const owner = await ethers.getImpersonatedSigner("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49");
      await setBalance("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49", 10000000000000000000);

      const partsEther = 2;
      const partsToken = 3;
      await salesContract.setPaymentTokenExchangeRate(weth, partsEther, partsToken);

      const tokensPrice = tokensToBuy / partsToken * partsEther + 1;

      await expect(salesContract.connect(owner)
          .buyTokensForEther(tokensToBuy, { value: tokensPrice}))
        .to.be.revertedWithCustomError(salesContract, "BadEthValue");
    });
  });

  describe("Withdraw", () => {
    it ("Should withdraw USDT", async () => {
      const tokensToBuy = 5;
      const { owner, salesContract, usdt, saleDurationDays, } = await loadFixture(deployContracts);
      
      const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
      await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

      // buy procedure 
      await usdt.connect(usdtOwner).approve(salesContract, 10000000);
      await salesContract.connect(usdtOwner).buyTokens(tokensToBuy, usdt, {});
      await time.increase(saleDurationDays * 24 * 3600);
      await salesContract.withdraw(usdt);

      const contractExpectedUsdtBalance = Math.floor(tokensToBuy * USDT_PARTS_EXCHANGE_RATE / USDT_MINT_PARTS_EXCHANGE_RATE);
      expect(await usdt.balanceOf(owner.address)).to.equal(contractExpectedUsdtBalance);
    })

    it ("Should revert if the contract's token balance is zero", async () => {
      const { salesContract, saleDurationDays, } = await loadFixture(deployContracts);
      const golem = "0xa74476443119A942dE498590Fe1f2454d7D4aC0d";
      
      await time.increase(saleDurationDays * 24 * 3600);
      
      await expect(salesContract.withdraw(golem)).to.be.revertedWith("SafeERC20: ERC20 operation did not succeed");
    })

    it ("Should revert when the sale is still ongoing", async () => {
      const { salesContract, usdt, } = await loadFixture(deployContracts);
      
      await expect(salesContract.withdraw(usdt)).to.be.revertedWith("Sale is still ongoing");
    })
  })
})
