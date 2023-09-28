import { ethers } from "hardhat";
import { setBalance } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const ercAbi = require("./abis/erc20.json");
import { expect } from "chai";

const DAI_EXCHANGE_RATE = 1;
const USDC_EXCHANGE_RATE = 2;
const USDT_EXCHANGE_RATE = 3;

const DAI_MAINNET_CONTRACT_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f";
const USDC_MAINNET_CONTRACT_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT_MAINNET_CONTRACT_ADDRESS = "0xdac17f958d2ee523a2206206994597c13d831ec7";


describe ("Token Sales Test", function() {

  async function deployContracts() {
    const [owner] = await ethers.getSigners();

    const meetupToken = await ethers.deployContract("MeetupERC20Token");
    const salesContract = await ethers.deployContract("SimpleSaleContract", [await meetupToken.getAddress()]);

    await meetupToken.transferOwnership(await salesContract.getAddress());

    await salesContract.setPaymentTokenExchangeRate(DAI_MAINNET_CONTRACT_ADDRESS,DAI_EXCHANGE_RATE); // DAI
    await salesContract.setPaymentTokenExchangeRate(USDC_MAINNET_CONTRACT_ADDRESS,USDC_EXCHANGE_RATE); // USDC
    await salesContract.setPaymentTokenExchangeRate(USDT_MAINNET_CONTRACT_ADDRESS,USDT_EXCHANGE_RATE); // USDT

    const usdt = new ethers.Contract("0xdac17f958d2ee523a2206206994597c13d831ec7", ercAbi, ethers.provider);
    const usdc = new ethers.Contract("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", ercAbi, ethers.provider);
    const dai = new ethers.Contract("0x6b175474e89094c44da98b954eedeac495271d0f", ercAbi, ethers.provider);
    
    return {
      meetupToken,
      salesContract,
      usdt,
      usdc,
      dai
    }
  }

  describe("Buy tokens cases", function () {
    it ("Should buy test token for DAI", async function () {
      const tokensToBuy = 5;

      let { meetupToken, salesContract, usdt, usdc, dai } = await deployContracts();

      const daiOwner = await ethers.getImpersonatedSigner("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F");
      await setBalance("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F", 10000000000000000000);

      // buy procedure 
      await dai.connect(daiOwner).approve(salesContract.getAddress(), 10000000);
      await salesContract.connect(daiOwner).buyTokens(tokensToBuy, dai.getAddress());

      expect(await meetupToken.balanceOf(daiOwner.address)).to.equal(tokensToBuy);
      expect(await dai.balanceOf(salesContract.getAddress())).to.equal(tokensToBuy * DAI_EXCHANGE_RATE);

      console.log("MintableToken Balance of the account: ", await meetupToken.balanceOf(daiOwner.address));
      console.log("Dai balance of Sales Contract       : ", await dai.balanceOf(salesContract.getAddress()));
    })

    it ("Should buy test token for USDC", async function () {
      const tokensToBuy = 5;

      let { meetupToken, salesContract, usdt, usdc, dai } = await deployContracts();

      const usdcOwner = await ethers.getImpersonatedSigner("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49");
      await setBalance("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49", 10000000000000000000);

      // buy procedure 
      await usdc.connect(usdcOwner).approve(await salesContract.getAddress(), 10000000);
      await salesContract.connect(usdcOwner).buyTokens(5, await usdc.getAddress());

      expect(await meetupToken.balanceOf(usdcOwner.address)).to.equal(tokensToBuy);
      expect(await usdc.balanceOf(salesContract.getAddress())).to.equal(tokensToBuy * USDC_EXCHANGE_RATE);

      console.log("MintableToken Balance of the account: ", await meetupToken.balanceOf(usdcOwner.address));
      console.log("USDC balance of Sales Contract      : ", await usdc.balanceOf(await salesContract.getAddress()));
    })

    it ("Should buy test token for USDT", async function () {
      const tokensToBuy = 5;
      let { meetupToken, salesContract, usdt, usdc, dai } = await deployContracts();
      
      const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
      await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

      // buy procedure 
      await usdt.connect(usdtOwner).approve(salesContract.getAddress(), 10000000);
      await salesContract.connect(usdtOwner).buyTokens(5, await usdt.getAddress());

      console.log("MintableToken Balance of the account: ", await meetupToken.balanceOf(usdtOwner.address));
      console.log("USDT balance of Sales Contract      : ", await usdt.balanceOf(await salesContract.getAddress()));
    })
  })

})
