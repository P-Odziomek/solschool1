// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Test ERC-20 token
 * @author Patryk Odziomek - IntellectEU
 * @notice This is just a test mintable token that is used to be bought by stablecoins
 */
contract MeetupERC20Token is ERC20, Ownable {
    constructor() ERC20("Meetup ERC20 Token", "MTK") {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
