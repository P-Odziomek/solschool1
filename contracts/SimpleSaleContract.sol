// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MeetupERC20Token.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "hardhat/console.sol";
import "./interfaces/Weth.sol";

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

    IERC20 internal constant WETH = IERC20(address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2));
    uint256 public immutable cutoffTimestamp;
    MeetupERC20Token public mintableToken;
    mapping(IERC20 => ExchangeRate) public paymentTokensExchangeRate;
    ExchangeRate public etherExchangeRate;

    event TokenSaleCompleted(address indexed beneficiary, uint256 tokensBought, IERC20 indexed paymentToken, uint256 tokensPaid);
    event EtherSaleCompleted(address indexed beneficiary, uint256 tokensBought, uint256 etherPaid);
    event TokenExchangeRateSet(IERC20 indexed token, uint256 partsSellToken, uint256 partsMintToken);
    event EtherExchangeRateSet(uint256 partsSellEther, uint256 partsMintToken);
    event TokensWithdrawn(IERC20 indexed token, uint256 value);

    error BadEthValue();

    /**
     * @notice contract constructor
     * @param _mintableToken The token that will be minted by this contract. This contract must have the rights to mint.
     * @param _saleDurationDays The period in days after the contract deployment during which it is possible to sell tokens
     */
    constructor(address _mintableToken, uint256 _saleDurationDays) {
        mintableToken = MeetupERC20Token(_mintableToken);
        cutoffTimestamp = block.timestamp + _saleDurationDays * 1 days;
    }

    modifier rateSet(IERC20 token) {
        require(paymentTokensExchangeRate[token].partsSell != 0, "Payment token not allowed");
        require(paymentTokensExchangeRate[token].partsMint != 0, "Payment token not allowed");
        _;
    }

    modifier forSale() {
        require(block.timestamp < cutoffTimestamp, "Sale is not possible anymore");
        _;
    }

    modifier positiveTokens(uint256 value) {
        require(value != 0, "Tokens value should be positive");
        _;
    }

    /**
     * @notice In exchange for _paymentToken, mintableTokens will be transferred to msg.sender at a specified exchange rate.
     * Reverts if payment token is not specified.
     * @param _tokensToBuy amount of mintable tokens to be bought
     * @param _paymentToken the token that will be used for payment
     */
    function buyTokens(uint256 _tokensToBuy, IERC20 _paymentToken) external forSale positiveTokens(_tokensToBuy) rateSet(_paymentToken) {
        _buyTokens(_tokensToBuy, _paymentToken);
    }

    /**
     * @notice In exchange for _paymentToken, mintableTokens will be transferred to msg.sender at a specified exchange rate.
     * Reverts if payment token is not specified.
     * @param _tokensToBuy amount of mintable tokens to be bought
     * @param _paymentToken the token that will be used for payment
     */
    function _buyTokens(uint256 _tokensToBuy, IERC20 _paymentToken) internal {
        uint256 tokensToPay = _tokensToBuy 
            * paymentTokensExchangeRate[_paymentToken].partsSell
            / paymentTokensExchangeRate[_paymentToken].partsMint;
        console.log(_paymentToken.balanceOf(msg.sender));
        console.log(_paymentToken.allowance(msg.sender, address(this)));
        _paymentToken.safeTransferFrom(msg.sender, address(this), tokensToPay);
        
        mintableToken.mint(msg.sender, _tokensToBuy);

        emit TokenSaleCompleted(msg.sender, _tokensToBuy, _paymentToken, tokensToPay);
    }

    /**
     * @notice admin function for setting payment token exchange rate
     * @param _paymentToken address of token to be set
     * @param _partsSellToken parts of the token that is sold to be converted into _partsMintToken
     * @param _partsMintToken parts of the token that is minted in exchage of _partsSellToken
     */
    function setPaymentTokenExchangeRate(IERC20 _paymentToken, uint256 _partsSellToken, uint256 _partsMintToken) external onlyOwner {
        require(address(_paymentToken) != address(0), "Payment token is invalid");
        require(_partsSellToken != 0, "Invalid exchange rate");
        require(_partsMintToken != 0, "Invalid exchange rate");

        paymentTokensExchangeRate[_paymentToken].partsSell = _partsSellToken;
        paymentTokensExchangeRate[_paymentToken].partsMint = _partsMintToken;

        emit TokenExchangeRateSet(_paymentToken, _partsSellToken, _partsMintToken);
    }

    /**
     * @notice admin function for unsetting payment token exchange rate
     * @param _paymentToken address of token to be unset
     */
    function unsetPaymentTokenExchangeRate(IERC20 _paymentToken) external onlyOwner {
        delete paymentTokensExchangeRate[_paymentToken];
    }

    /**
     * @notice admin function to withdraw contract balance of a certain token
     * @param _token address of a token
     */
    function withdraw(IERC20 _token) external onlyOwner {
        require(block.timestamp >= cutoffTimestamp, "Sale is still ongoing");

        uint256 balance = _token.balanceOf(address(this));
        _token.safeTransfer(msg.sender, balance);

        emit TokensWithdrawn(_token, balance);
    }

    /**
     * @notice Transfers mintableTokens to msg.sender for a specified exchange rate of ether
     * @param _tokensToBuy number of mintable tokens to be bought
     */
    function buyTokensForEther(uint256 _tokensToBuy) external payable forSale positiveTokens(_tokensToBuy) rateSet(WETH) {
        uint256 etherToPay = _tokensToBuy 
            * paymentTokensExchangeRate[WETH].partsSell
            / paymentTokensExchangeRate[WETH].partsMint;
        
        if (msg.value != etherToPay) {
            revert BadEthValue();
        }

        Weth(address(WETH)).deposit{value: msg.value}();
        mintableToken.mint(msg.sender, _tokensToBuy);
        emit TokenSaleCompleted(msg.sender, _tokensToBuy, WETH, etherToPay);
    }
}