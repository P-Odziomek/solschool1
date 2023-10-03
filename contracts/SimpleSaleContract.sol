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

    struct ExchangeRate {
        uint256 partsSell;
        uint256 partsMint;
    }

    uint256 public immutable cutoffTimestamp;
    MeetupERC20Token public mintableToken;
    // is it better to specity the default visibility modifier public or omit it?
    // OMG because it doesn't have the public keyword its getter is absent in the abi!!!
    mapping(IERC20 => ExchangeRate) public paymentTokensExchangeRate;
    ExchangeRate public etherExchangeRate;

    event TokenSaleCompleted(address indexed beneficiary, uint256 tokensBought, address indexed paymentToken, uint256 tokensPaid);
    event EtherSaleCompleted(address indexed beneficiary, uint256 tokensBought, uint256 etherPaid);
    event TokenExchangeRateSet(address indexed token, uint256 partsSellToken, uint256 partsMintToken);
    event EtherExchangeRateSet(uint256 partsSellEther, uint256 partsMintToken);
    event TokensWithdrawn(address indexed token, uint256 value);

    /**
     * @notice contract constructor
     * @param _mintableToken The token that will be minted by this contract. This contract must have the rights to mint.
     * @param _saleDurationDays The period in days after the contract deployment during which it is possible to sell tokens
     */
    constructor(address _mintableToken, uint256 _saleDurationDays) {
        mintableToken = MeetupERC20Token(_mintableToken);
        cutoffTimestamp = block.timestamp + _saleDurationDays * 1 days;
    }

    /**
     * @notice Transfers mintableTokens to msg.sender for a specified exchange rate. Reverts if payment token is not specified.
     * @param _tokensToBuy amount of mintable tokens to be bought
     * @param _paymentToken the token that will be used for payment
     */
    function buyTokens(uint256 _tokensToBuy, address _paymentToken) external {
        require(_tokensToBuy > 0, "No tokens bought");
        require(paymentTokensExchangeRate[IERC20(_paymentToken)].partsSell > 0, "Payment token not allowed");
        require(block.timestamp < cutoffTimestamp, "Sale is not possible anymore");

        // Why aren't we checking overflowing here?
        uint256 tokensToPay = _tokensToBuy 
            * paymentTokensExchangeRate[IERC20(_paymentToken)].partsSell
            / paymentTokensExchangeRate[IERC20(_paymentToken)].partsMint;
        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), tokensToPay);
        
        mintableToken.mint(msg.sender, _tokensToBuy);

        emit TokenSaleCompleted(msg.sender, _tokensToBuy, _paymentToken, tokensToPay);
    }

    /**
     * @notice admin function for setting payment token
     * @param _paymentToken address of token to be set
     * @param _partsSellToken parts of the token that is sold to be converted into _partsMintToken
     * @param _partsMintToken parts of the token that is minted in exchage of _partsSellToken
     */
    function setPaymentTokenExchangeRate(address _paymentToken, uint256 _partsSellToken, uint256 _partsMintToken) external onlyOwner {
        require(_paymentToken != address(0), "Payment token is invalid");
        require(_partsSellToken > 0 && _partsMintToken > 0, "Invalid exchange rate");

        paymentTokensExchangeRate[IERC20(_paymentToken)].partsSell = _partsSellToken;
        paymentTokensExchangeRate[IERC20(_paymentToken)].partsMint = _partsMintToken;

        emit TokenExchangeRateSet(_paymentToken, _partsSellToken, _partsMintToken);
    }

    /**
     * @notice admin function to withdraw contract balance of a certain token
     * @param _token address of a token
     */
    function withdraw(address _token) external onlyOwner {
        // Is this check necessary?
        require(paymentTokensExchangeRate[IERC20(_token)].partsMint > 0, "Such a token was not registered");

        uint256 balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(msg.sender, balance);

        emit TokensWithdrawn(_token, balance);
    }

    /**
     * @notice admin function for setting exchange rate of ether
     * @param _partsSellEther parts of ether that is sold to be converted into _partsMintToken
     * @param _partsMintToken parts of the token that is minted in exchage of _partsSellEther
     */
    function setPaymentEtherExchangeRate(uint256 _partsSellEther, uint256 _partsMintToken) external onlyOwner {
        require(_partsSellEther > 0 && _partsMintToken > 0, "Invalid exchange rate");

        etherExchangeRate.partsSell = _partsSellEther;
        etherExchangeRate.partsMint = _partsMintToken;

        emit EtherExchangeRateSet(_partsSellEther, _partsMintToken);
    }

    /**
     * @notice Transfers mintableTokens to msg.sender for a specified exchange rate of ether
     * @param _tokensToBuy number of mintable tokens to be bought
     */
    function buyTokensForEther(uint256 _tokensToBuy) external payable {
        require(_tokensToBuy > 0, "Invalid number of tokens to buy");
        require(etherExchangeRate.partsSell > 0, "Payment with ether is not allowed");
        require(block.timestamp < cutoffTimestamp, "Sale is not possible anymore");

        uint256 etherToPay = _tokensToBuy 
            * etherExchangeRate.partsSell
            / etherExchangeRate.partsMint;
        
        if (msg.value != etherToPay) {
            revert("Incorrect value of ether for the specified number of tokens");
        }

        mintableToken.mint(msg.sender, _tokensToBuy);

        emit EtherSaleCompleted(msg.sender, _tokensToBuy, etherToPay);
    }
}