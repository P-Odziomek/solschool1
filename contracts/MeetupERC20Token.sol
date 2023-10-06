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

    uint public startTime;
    bool public mintingAllowed = true;
    uint32 public mintTimeLimitation = 87600 * 60;

    constructor() ERC20("Meetup ERC20 Token", "MTK") {
        startTime = block.timestamp;
    }

    // I override this method because I want to have 9 decimals (just for test cases)
    function decimals() public view virtual override returns (uint8) {
        return 9;
    }

    function setMintTimeLimitation(uint32 _newTimeLimit) public onlyOwner {
        mintTimeLimitation = _newTimeLimit * 60;
    }

    function setMintingAllowed(bool _value) public onlyOwner {
        mintingAllowed = _value;
    }

    function checkMintTimeLimit() internal {
        if (block.timestamp > startTime + mintTimeLimitation) {
            setMintingAllowed(false);
        }
    }

    function checkMintLimit(uint256 amount) public {
        if(totalSupply() + amount > 200000 * 10**decimals()) {
            setMintingAllowed(false);
        }
    }

    function mint(address to, uint256 amount) public onlyOwner {
        checkMintTimeLimit();
        if (mintingAllowed) {
            _mint(to, amount);
            checkMintLimit(amount);
        } else {
            revert("Minting not allowed");
        }
    }
}
