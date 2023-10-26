// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Test ERC-20 token
 * @author Patryk Odziomek - IntellectEU
 * @notice This is just a test mintable token that is used to be bought by stablecoins
 */
contract MeetupERC20Token is ERC20Capped, Ownable {

    constructor(uint256 cap_) ERC20("Meetup ERC20 Token", "MTK") ERC20Capped(cap_) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
