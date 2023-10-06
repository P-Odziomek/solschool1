import {ethers} from "hardhat";
import {setBalance} from "@nomicfoundation/hardhat-toolbox/network-helpers";
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const ercAbi = require("./abis/erc20.json");
import {expect} from "chai";
import {int} from "hardhat/internal/core/params/argumentTypes";


const DAI_EXCHANGE_RATE = 1;

const DAI_MAINNET_CONTRACT_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f";

describe("Additional Tests for Sales contract", function () {

    async function deployContracts(transferOwner = true) {


        const meetupToken = await ethers.deployContract("MeetupERC20Token");
        const salesContract = await ethers.deployContract("SimpleSaleContract", [await meetupToken.getAddress()]);

        if (transferOwner) {
            await meetupToken.transferOwnership(await salesContract.getAddress());
        }
        await salesContract.setPaymentTokenExchangeRate(DAI_MAINNET_CONTRACT_ADDRESS, DAI_EXCHANGE_RATE); // DAI

        const dai = new ethers.Contract("0x6b175474e89094c44da98b954eedeac495271d0f", ercAbi, ethers.provider);

        return {
            meetupToken,
            salesContract,
            dai
        }
    }

    describe("Buy & withdraw tokens cases", function () {
        it("Should buy test token for DAI", async function () {
            const tokensToBuy = 10000000000000;

            let {meetupToken, salesContract, dai} = await deployContracts();

            // CRETAE DAI OWNER (Impersonated account)
            const daiOwner = await ethers.getImpersonatedSigner("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F");
            await setBalance("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F", 10000000000000000000);

            // buy procedure
            // call approve method of DAI contract to allow sales contract to spend DAI

            // call buyTokens method of sales contract to buy tokens for DAI coins
            let totalTokensBought = 0
            for (let i = 0; i < 20; i++) {
                await dai.connect(daiOwner).approve(salesContract.getAddress(), 10000000000000);
                await salesContract.connect(daiOwner).buyTokens(tokensToBuy, dai.getAddress());
                totalTokensBought += tokensToBuy
                console.log(i, "balanceOf daiOwner:", await meetupToken.balanceOf(daiOwner.address),
                    "totalSupply:", await meetupToken.totalSupply(),
                    "mintingAllowed :", await meetupToken.mintingAllowed());
            }

            // check if the tokens are bought
            expect(await meetupToken.balanceOf(daiOwner.address)).to.equal(totalTokensBought);
            // check if the DAI coins are transferred to the sales contract
            expect(await dai.balanceOf(salesContract.getAddress())).to.equal(totalTokensBought * DAI_EXCHANGE_RATE);

            // final mint to close minting
            await dai.connect(daiOwner).approve(salesContract.getAddress(), 10000000000000);
            await expect(salesContract.connect(daiOwner).buyTokens(tokensToBuy, dai.getAddress())).to.revertedWith("Minting not allowed")

            // check if the mintingAllowed == false
            expect(await meetupToken.mintingAllowed()).to.equal(false);

            // try to withdraw tokens
            await salesContract.withdrawTokens();

            // check if the tokens are withdrawn
            expect(await dai.balanceOf(salesContract.getAddress())).to.equal(0);
            expect(await dai.balanceOf(salesContract.owner())).to.equal(totalTokensBought);

            // try to withdraw tokens with NOT OWNER
            await salesContract.transferOwnership(daiOwner.getAddress());
            await expect(salesContract.withdrawTokens()).to.revertedWith("Ownable: caller is not the owner");

        })
    })


    describe("Buy & withdraw Ethers", function () {
        it("Should buy test token for Ether", async function () {
            const weiValue = 1000000000000000;

            let {meetupToken, salesContract, dai} = await deployContracts();

            // CRETAE DAI OWNER (Impersonated account)
            const daiOwner = await ethers.getImpersonatedSigner("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F");
            await setBalance("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F", 1000000000000000000);

            await salesContract.setPaymentTokenExchangeRateEth(3); // ETH

            await dai.connect(daiOwner).approve(salesContract.getAddress(), 10000000000000);
            await salesContract.connect(daiOwner).buyTokensWithEth( {value: weiValue});

            let EXCHANGE_RATE = await salesContract.exchangeRateEth();

            // check if the tokens are bought
            expect(await meetupToken.balanceOf(daiOwner.address)).to.equal(weiValue * Number(EXCHANGE_RATE));

            // check ETH balance of salesContract
            expect(await salesContract.getEthBalance()).to.equal(weiValue);
            console.log("balance of salesContract :", await salesContract.getEthBalance());

            // try to withdraw ETH to owner address
            let balanceBefore = await salesContract.getEthBalanceOwner();
            await salesContract.withdrawEth();
            expect(await salesContract.getEthBalanceOwner()).to.approximately(balanceBefore, weiValue)


            // try to withdraw ETH to NOT OWNER
            await salesContract.transferOwnership(daiOwner.getAddress());
            await expect(salesContract.withdrawEth()).to.revertedWith("Ownable: caller is not the owner");

            // try to set exchange rate with NOT OWNER
            await expect(salesContract.setPaymentTokenExchangeRateEth(3)).to.revertedWith("Ownable: caller is not the owner");

        })
    })
})
