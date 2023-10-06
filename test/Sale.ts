import {ethers} from "hardhat";
import {setBalance} from "@nomicfoundation/hardhat-toolbox/network-helpers";
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const ercAbi = require("./abis/erc20.json");
import {expect} from "chai";
import {int} from "hardhat/internal/core/params/argumentTypes";


const DAI_EXCHANGE_RATE =  10004000;
const USDC_EXCHANGE_RATE = 5000;
const USDT_EXCHANGE_RATE = 102;

const DAI_MAINNET_CONTRACT_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f";
const USDC_MAINNET_CONTRACT_ADDRESS = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT_MAINNET_CONTRACT_ADDRESS = "0xdac17f958d2ee523a2206206994597c13d831ec7";

describe("Token Sales Test", function () {

    async function deployContracts(transferOwner = true) {
        const [owner, user] = await ethers.getSigners();

        const meetupToken = await ethers.deployContract("MeetupERC20Token");
        const salesContract = await ethers.deployContract("SimpleSaleContract", [await meetupToken.getAddress()]);

        if (transferOwner) {
            await meetupToken.transferOwnership(await salesContract.getAddress());
        }
        await salesContract.setPaymentTokenExchangeRate(DAI_MAINNET_CONTRACT_ADDRESS, DAI_EXCHANGE_RATE); // DAI
        await salesContract.setPaymentTokenExchangeRate(USDC_MAINNET_CONTRACT_ADDRESS, USDC_EXCHANGE_RATE); // USDC
        await salesContract.setPaymentTokenExchangeRate(USDT_MAINNET_CONTRACT_ADDRESS, USDT_EXCHANGE_RATE); // USDT


        const dai = new ethers.Contract("0x6b175474e89094c44da98b954eedeac495271d0f", ercAbi, ethers.provider);
        const usdc = new ethers.Contract("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", ercAbi, ethers.provider);
        const usdt = new ethers.Contract("0xdac17f958d2ee523a2206206994597c13d831ec7", ercAbi, ethers.provider);

        return {
            user,
            meetupToken,
            salesContract,
            usdt,
            usdc,
            dai
        }
    }

    describe("Buy tokens cases", function () {


        it("Should buy test token for DAI", async function () {
            const tokensToBuy = 5;

            let {meetupToken, salesContract, usdt, usdc, dai} = await deployContracts();

            // CRETAE DAI OWNER (Impersonated account)
            const daiOwner = await ethers.getImpersonatedSigner("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F");
            await setBalance("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F", 10000000000000000000);

            // buy procedure

            // call approve method of DAI contract to allow sales contract to spend DAI
            await dai.connect(daiOwner).approve(salesContract.getAddress(), 100000000);
            // call buyTokens method of sales contract to buy tokens for DAI coins
            await salesContract.connect(daiOwner).buyTokens(tokensToBuy, dai.getAddress());

            // check if the tokens are bought
            expect(await meetupToken.balanceOf(daiOwner.address)).to.equal(tokensToBuy);
            // check if the DAI coins are transferred to the sales contract
            expect(await dai.balanceOf(salesContract.getAddress())).to.equal(tokensToBuy * DAI_EXCHANGE_RATE);

            console.log("MintableToken Balance of the account: ", await meetupToken.balanceOf(daiOwner.address));
            console.log("Dai balance of Sales Contract       : ", await dai.balanceOf(salesContract.getAddress()));

        })

        it("Should buy test token for USDC", async function () {
            const tokensToBuy = 5;

            let {meetupToken, salesContract, usdc} = await deployContracts();

            const usdcOwner = await ethers.getImpersonatedSigner("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49");
            await setBalance("0xf7D13C7dBec85ff86Ee815f6dCbb3DEDAc78ca49", 10000000000000000000);

            // buy procedure
            await usdc.connect(usdcOwner).approve(await salesContract.getAddress(), 10000000);
            await salesContract.connect(usdcOwner).buyTokens(tokensToBuy, await usdc.getAddress());

            expect(await meetupToken.balanceOf(usdcOwner.address)).to.equal(tokensToBuy);
            expect(await usdc.balanceOf(salesContract.getAddress())).to.equal(tokensToBuy * USDC_EXCHANGE_RATE);

            console.log("MintableToken Balance of the account: ", await meetupToken.balanceOf(usdcOwner.address));
            console.log("USDC balance of Sales Contract      : ", await usdc.balanceOf(await salesContract.getAddress()));
        })

        it("Should buy test token for USDT", async function () {
            const tokensToBuy = 5;
            let {meetupToken, salesContract, usdt} = await deployContracts();
            const usdtOwner = await ethers.getImpersonatedSigner("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61");
            await setBalance("0x8091266bD21E86Ffe74D1F4ffcc4B27E3a7d4F61", 10000000000000000000);

            // buy procedure
            await usdt.connect(usdtOwner).approve(salesContract.getAddress(), 10000000);
            await salesContract.connect(usdtOwner).buyTokens(tokensToBuy, await usdt.getAddress());

            expect(await meetupToken.balanceOf(usdtOwner.address)).to.equal(tokensToBuy);
            expect(await usdt.balanceOf(salesContract.getAddress())).to.equal(tokensToBuy * USDT_EXCHANGE_RATE);

            console.log("MintableToken Balance of the account: ", await meetupToken.balanceOf(usdtOwner.address));
            console.log("USDT balance of Sales Contract      : ", await usdt.balanceOf(await salesContract.getAddress()));
        })

        it("Error case test for buyTokens method (0 tokens)", async function () {
            let {salesContract, usdt, usdc, dai} = await deployContracts();

            await expect(salesContract.buyTokens(0, dai.getAddress())).to.be.revertedWith("No tokens bought");
            await expect(salesContract.buyTokens(0, usdt.getAddress())).to.be.revertedWith("No tokens bought");
            await expect(salesContract.buyTokens(0, usdc.getAddress())).to.be.revertedWith("No tokens bought");
            console.log("salesContract: Error case test for buyTokens method 1 case")
        })



        it("salesContract: Error case test for setPaymentTokenExchangeRate method (null address)", async function () {
            let {salesContract} = await deployContracts();
            await expect(salesContract.setPaymentTokenExchangeRate("0x0000000000000000000000000000000000000000", 1)).to.be.revertedWith("Payment token not set");
            console.log("Null address test for setPaymentTokenExchangeRate method")

        })

        it("salesContract: Error case test for setPaymentTokenExchangeRate method (not allowed token)", async function () {
            let {salesContract} = await deployContracts();
            const dai_no_exchange = new ethers.Contract("0x6b175474e89094c44da98b954eedeac495271a45", ercAbi, ethers.provider);
            await expect(salesContract.buyTokens(1, dai_no_exchange.getAddress())).to.be.revertedWith("Payment token not allowed");
            console.log("Payment token not allowed test for buyTokens method")
        })

        it("salesContract: Error case test - Not owner", async function () {
            let {user, salesContract} = await deployContracts();
            await expect(salesContract.connect(user).setPaymentTokenExchangeRate(user, 100)).to.be.revertedWith("Ownable: caller is not the owner")
            console.log("Error case test - Not owner")
        })

        it("meetupToken: Error case test - Not owner", async function () {
            let {user, meetupToken, salesContract, usdt, usdc, dai} = await deployContracts();
            await expect(meetupToken.connect(user).mint("0x0000000000000000000000000000000000000000", 100)).to.be.revertedWith("Ownable: caller is not the owner")
            console.log("Error case test - mint to the zero address (1 case - Not owner)")
        })

        it("meetupToken: Error case test - mint to the zero address (2 case - without transfer owner)", async function () {
            let {meetupToken, salesContract, usdt, usdc, dai} = await deployContracts(false);
            await expect(meetupToken.mint("0x0000000000000000000000000000000000000000", 100)).to.be.revertedWith("ERC20: mint to the zero address")
            console.log("Error case test - mint to the zero address (2 case - without transfer owner)")
        })

    })
})
