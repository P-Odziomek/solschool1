import {ethers} from "hardhat";
import {setBalance} from "@nomicfoundation/hardhat-toolbox/network-helpers";
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const ercAbi = require("./abis/erc20.json");
import {expect} from "chai";
import {int} from "hardhat/internal/core/params/argumentTypes";


const DAI_EXCHANGE_RATE = 10004000;

const DAI_MAINNET_CONTRACT_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f";

describe("Additional Tests for MeetupToken", function () {

    async function deployContracts(transferOwner = true) {
        const [user] = await ethers.getSigners();

        const meetupToken = await ethers.deployContract("MeetupERC20Token");
        const salesContract = await ethers.deployContract("SimpleSaleContract", [await meetupToken.getAddress()]);

        if (transferOwner) {
            await meetupToken.transferOwnership(await salesContract.getAddress());
        }
        await salesContract.setPaymentTokenExchangeRate(DAI_MAINNET_CONTRACT_ADDRESS, DAI_EXCHANGE_RATE); // DAI

        const dai = new ethers.Contract("0x6b175474e89094c44da98b954eedeac495271d0f", ercAbi, ethers.provider);

        return {
            user,
            meetupToken,
            salesContract,
            dai
        }
    }

    describe("Buy & withdraw tokens cases", function () {
        it("Errors for: Minting not finished case & Time limit", async function () {
            let {meetupToken, salesContract, dai} = await deployContracts(false);

            // CREATE DAI OWNER (Impersonated account)
            const daiOwner = await ethers.getImpersonatedSigner("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F");
            await setBalance("0x60FaAe176336dAb62e284Fe19B885B095d29fB7F", 10000000000000000000);

            // try to withdraw tokens before minting is finished
            await expect(salesContract.withdrawTokens()).to.revertedWith("Minting not finished")
            console.log("MintableToken Balance of the account");

            // try to buy tokens when minting is finished
            await meetupToken.setMintTimeLimitation(0);
            await meetupToken.transferOwnership(await salesContract.getAddress());
            await dai.connect(daiOwner).approve(salesContract.getAddress(), 100000000);
            await expect(salesContract.connect(daiOwner).buyTokens(1, dai.getAddress())).to.revertedWith("Minting not allowed")

        })
    })

    describe("Meetup Token set functions ", function () {
        it("Tests for setters", async function () {
            let {meetupToken, salesContract} = await deployContracts(false);

            expect(await meetupToken.mintingAllowed()).to.equal(true);
            expect(await meetupToken.mintTimeLimitation()).to.equal(5256000);

            await meetupToken.setMintTimeLimitation(10);
            expect(await meetupToken.mintTimeLimitation()).to.equal(10 * 60);

            await meetupToken.setMintingAllowed(false);
            expect(await meetupToken.mintingAllowed()).to.equal(false);

            await meetupToken.transferOwnership(salesContract.getAddress());
            expect(await meetupToken.mintingAllowed()).to.equal(false);

            await expect(meetupToken.setMintTimeLimitation(10)).to.revertedWith("Ownable: caller is not the owner")
            await expect(meetupToken.setMintingAllowed(false)).to.revertedWith("Ownable: caller is not the owner")

        })
    })

        describe("Minting limits errors", function () {
        it("Mint limit exceeded error", async function () {
            let {meetupToken, salesContract} = await deployContracts(false);

            expect(await meetupToken.decimals()).to.equal(9);

            for (let i = 0; i < 20; i++) {
                await meetupToken.mint(salesContract.getAddress(), 10000000000000);
            }
            await expect(meetupToken.mint(salesContract.getAddress(), 10000000000000)).to.revertedWith("Minting not allowed")

            await meetupToken.setMintingAllowed(false);
            await expect(meetupToken.mint(salesContract.getAddress(), 10000000000000)).to.revertedWith("Minting not allowed")
        })
    })
})