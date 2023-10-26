import { ethers } from "hardhat";

export async function deploySimpleSalesContract(tokenAddress: string, saleDurationDays: number) {

  const sale = await ethers.deployContract("SimpleSaleContract", [tokenAddress, saleDurationDays]);
  await sale.waitForDeployment();

  return sale;
}

async function main() {
  console.log("Deploying SimpleSalesContract...");
  
  const sale = await deploySimpleSalesContract(
    process.env.TOKEN_ADDRESS as string, 
    Number.parseInt(process.env.SALE_DURATION_DAYS as string));
  
  console.log("Successfully deployed!");
  console.log("SimpleSalesContract address:", await sale.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
