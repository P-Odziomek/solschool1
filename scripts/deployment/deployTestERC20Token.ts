import { ethers } from "hardhat";

export async function deployTestERC20Token() {
  const token = await ethers.deployContract("MeetupERC20Token");
  await token.waitForDeployment();

  return token;
}

async function main() {
  console.log("Deploying MeetupERC20Token...");
  
  const token = await deployTestERC20Token();
  
  console.log("Successfully deployed!");
  console.log(await token.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
