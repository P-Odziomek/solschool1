// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MeetupERC20Token.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Solidity Code School sale contract
 * @dev a demo contract for token sale to prove the importance of using SafeERC20
 * @author Patryk Odziomek - IntellectEU
 * @notice Sale Contract that mints a mintable token for transferring a specified amount of tokens
 */
contract SimpleSaleContract is Ownable {

    using SafeERC20 for IERC20;

    MeetupERC20Token public mintableToken;
    mapping(IERC20 => uint256) paymentTokensExchangeRate;

    event SaleCompleted(address indexed beneficiary, uint256 tokensBought, address indexed paymentToken, uint256 tokensPaid);
    event TokenExchangeRateSet(address indexed token, uint256 exchangeRate);

    /**
     * @notice contract constructor
     * @param _mintableToken The token that will be minted by this contract. This contract must have the rights to mint.
     */
    constructor(address _mintableToken) {
        mintableToken = MeetupERC20Token(_mintableToken);
    }

    /**
     * @notice Transfers mintableTokens to msg.sender for a specified exchange rate. Reverts if payment token is not specified.
     * @param _tokensToBuy amount of mintable tokens to be bought
     * @param _paymentToken the token that will be used for payment
     */
    function buyTokens(uint256 _tokensToBuy, address _paymentToken) external {
        require(_tokensToBuy > 0, "No tokens bought");
        require(paymentTokensExchangeRate[IERC20(_paymentToken)] > 0, "Payment token not allowed");

        uint256 tokensToPay = _tokensToBuy * paymentTokensExchangeRate[IERC20(_paymentToken)];
        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), tokensToPay);
        
        mintableToken.mint(msg.sender, _tokensToBuy);

        emit SaleCompleted(msg.sender, _tokensToBuy, _paymentToken, tokensToPay);
    }

    /**
     * @notice admin function for setting payment token
     * @param _paymentToken address of token to be set
     * @param _exchangeRate exchange rate of the token in relation to mintable token
     */
    function setPaymentTokenExchangeRate(address _paymentToken, uint256 _exchangeRate) external onlyOwner {
        require(_paymentToken != address(0), "Payment token not set");

        paymentTokensExchangeRate[IERC20(_paymentToken)] = _exchangeRate;

        emit TokenExchangeRateSet(_paymentToken, _exchangeRate);
    }
}