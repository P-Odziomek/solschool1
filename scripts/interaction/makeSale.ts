import { ethers } from "hardhat";

async function main() {
  const cap = ethers.parseEther("200");
  const token1 = await ethers.deployContract("MeetupERC20Token", [cap]);
  await token1.waitForDeployment();
  const saleDurationDays = 60;
  const sale = await ethers.deployContract("SimpleSaleContract", [await token1.getAddress(), saleDurationDays]);
  await sale.waitForDeployment();
  const token2 = await ethers.deployContract("MeetupERC20Token", [cap]);
  await token2.waitForDeployment();
  const token2Parts = 1;
  const token1Parts = 1;
  await sale.setPaymentTokenExchangeRate(await token2.getAddress(), token2Parts, token1Parts);

  const [owner] = await ethers.getSigners();
  const tokensNumber = 1004;
  await token2.mint(owner.address, tokensNumber);
  await token2.approve(await sale.getAddress(), tokensNumber);
  await sale.buyTokens(tokensNumber, await token2.getAddress(), {}); // Ownable: caller is not the owner
  const mintedTokens = await token1.balanceOf(owner.address);
  console.log("Expected owned tokens", mintedTokens, "to equal", tokensNumber);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
