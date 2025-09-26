//SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Escrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // PYUSD token address on Ethereum Sepolia testnet
    address public constant PYUSD_TOKEN = 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9; // This is testnet address
    IERC20 public immutable pyusdToken;

    mapping(address => mapping(address => uint256)) public depositsUserToApiProvider;
    mapping(address => mapping(address => bool)) public isDepositorToApiProvider;
    mapping(address => string) public apiProviderToUri;
    mapping(address => uint256) public apiProviderBalances;
    mapping(address => mapping(address => bool)) public isTrueApiProvider;
    address public owner;

    constructor(address PYUSD_ADDRESS) {
        pyusdToken = IERC20(PYUSD_ADDRESS);
        owner = msg.sender;
    }

    ///////////////////////////////////
    //       Modifiers            /////
    ///////////////////////////////////
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyTrueApiProvider(address apiProvider) {
        require(isTrueApiProvider[msg.sender][apiProvider], "No API provider found for this address");
        _;
    }

    modifier onlyDepositorToApiProvider(address depositor, address apiProvider) {
        require(isDepositorToApiProvider[depositor][apiProvider], "No deposits found for this address");
        _;
    }

    ///////////////////////////////////
    //       API User Functions   /////
    ///////////////////////////////////

    function deposit(address depositor, uint256 amount, address apiProvider) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        // Transfer PYUSD tokens from the depositor to this contract
        pyusdToken.safeTransferFrom(msg.sender, address(this), amount);

        depositsUserToApiProvider[depositor][apiProvider] += amount;
        isDepositorToApiProvider[depositor][apiProvider] = true;
    }

    function depositWithdraw(uint256 amount, address apiProvider) external nonReentrant {
        require(isDepositorToApiProvider[msg.sender][apiProvider], "No deposits found for this address");
        require(depositsUserToApiProvider[msg.sender][apiProvider] >= amount, "Insufficient deposited balance");
        require(amount > 0, "Amount must be greater than 0");

        depositsUserToApiProvider[msg.sender][apiProvider] -= amount;
        if (depositsUserToApiProvider[msg.sender][apiProvider] == 0) {
            isDepositorToApiProvider[msg.sender][apiProvider] = false;
        }

        // Transfer PYUSD tokens back to the depositor
        pyusdToken.safeTransfer(msg.sender, amount);
    }

    function getDeposit(address depositor) external view returns (uint256) {
        return depositsUserToApiProvider[depositor][msg.sender];
    }

    ///////////////////////////////////////
    //       API Provider Functions   /////
    ///////////////////////////////////////

    function registerApiProvider(address apiProvider, string calldata uri) external {
        require(msg.sender == apiProvider, "Only owner of API can register");
        isTrueApiProvider[msg.sender][apiProvider] = true;
        apiProviderToUri[apiProvider] = uri;
    }

    function changeApiProviderUri(address apiProvider, string calldata uri) external onlyTrueApiProvider(apiProvider) {
        apiProviderToUri[apiProvider] = uri;
    }

    function apiProviderWithdraw(address apiProvider, uint256 amount) external nonReentrant {
        require(msg.sender == apiProvider, "Only owner of API can withdraw");
        require(isTrueApiProvider[msg.sender][apiProvider], "No API provider found for this address");
        require(apiProviderBalances[apiProvider] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");

        apiProviderBalances[apiProvider] -= amount;

        // Transfer PYUSD tokens to the API provider
        pyusdToken.safeTransfer(apiProvider, amount);
    }

    function apiProviderWithdrawAll(address apiProvider) external nonReentrant {
        require(msg.sender == apiProvider, "Only owner of API can withdraw");
        require(isTrueApiProvider[msg.sender][apiProvider], "No API provider found for this address");

        uint256 amount = apiProviderBalances[apiProvider];
        require(amount > 0, "No balance to withdraw");

        apiProviderBalances[apiProvider] = 0;

        // Transfer all PYUSD tokens to the API provider
        pyusdToken.safeTransfer(apiProvider, amount);
    }
}
