import { ethers } from "hardhat";
import { loadFixture, setBalance } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";

describe ("Meetup ERC20 Token", () => {

    async function deployContracts() {
        const [ owner, notOwner, ] = await ethers.getSigners();

        const cap = 10000000;
        const meetupToken = await ethers.deployContract("MeetupERC20Token", [cap]);
        await meetupToken.waitForDeployment();

        return {
            owner,
            meetupToken,
            notOwner,
            cap,
        }
    }

    it("Should revert when minting to 0x0 address", async () => {
        const { meetupToken, } = await loadFixture(deployContracts);

        const tokensToMint = 10;
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        const zeroOwner = await ethers.getImpersonatedSigner(zeroAddress);
        await setBalance(zeroOwner.address, 10000000000000000000);

        await expect(meetupToken.mint(zeroAddress, tokensToMint))
            .to.be.revertedWith("ERC20: mint to the zero address");
    });

    it ("Should revert when minting not by the owner", async () => {
        const tokensToMint = 10;
        let { meetupToken, owner, notOwner, } = await loadFixture(deployContracts);
        
        await expect(meetupToken.connect(notOwner).mint(owner.address, tokensToMint))
          .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it ("Should mint successfully", async () => {
        const tokensToMint = 10;
        let { meetupToken, owner, } = await loadFixture(deployContracts);
        
        await meetupToken.mint(owner.address, tokensToMint);
        expect(await meetupToken.balanceOf(owner.address)).to.equal(tokensToMint);
    });

    it ("Should revert after the cap is reached", async () => {
        let { meetupToken, owner, cap, } = await loadFixture(deployContracts);
        
        await meetupToken.mint(owner.address, cap);

        const tokensToMint = 10;
        await expect(meetupToken.mint(owner.address, tokensToMint))
          .to.be.revertedWith("ERC20Capped: cap exceeded");
    });

    it ("Should revert if the cap will be exceeded", async () => {
        let { meetupToken, owner, cap, } = await loadFixture(deployContracts);
        
        await expect(meetupToken.mint(owner.address, cap + 1))
          .to.be.revertedWith("ERC20Capped: cap exceeded");
    });
});
