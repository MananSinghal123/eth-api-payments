//SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IVerifier
 * @dev Standard Noir ZK verifier interface
 */
interface IVerifier {
    function verify(bytes memory _proof, uint256[] memory _publicInputs) external view returns (bool);
}

contract Escrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // PYUSD token interface
    IERC20 public immutable pyusdToken;
    IVerifier public zkVerifier;

    // Core storage - simplified to match backend logic
    mapping(address => uint256) public userBalances; // wallet => balance in cents
    mapping(address => uint256) public providerBalances;

    // Events
    event UserDeposit(address indexed user, uint256 amount);
    event UserWithdraw(address indexed user, uint256 amount);
    event ProviderWithdraw(address indexed provider, uint256 amount);
    event BatchPayment(address indexed user, address indexed provider, uint256 amount, uint256 numCalls);
    event ZkVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    constructor(address _pyusdAddress, address _zkVerifier) Ownable(msg.sender) {
        pyusdToken = IERC20(_pyusdAddress);
        zkVerifier = IVerifier(_zkVerifier);
    }

    ///////////////////////////////////
    //       Modifiers            /////
    ///////////////////////////////////

    modifier validAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        _;
    }

    ///////////////////////////////////
    //       Owner Functions      /////
    ///////////////////////////////////

    function setZkVerifier(address _zkVerifier) external onlyOwner {
        require(_zkVerifier != address(0), "Invalid verifier address");
        address oldVerifier = address(zkVerifier);
        zkVerifier = IVerifier(_zkVerifier);
        emit ZkVerifierUpdated(oldVerifier, _zkVerifier);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    ///////////////////////////////////
    //       User Functions       /////
    ///////////////////////////////////

    /**
     * @dev User deposits PYUSD tokens to their balance
     * @param amountUSD Amount in USD (will be converted to cents)
     */
    function deposit(uint256 amountUSD) external nonReentrant whenNotPaused validAmount(amountUSD) {
        // Convert USD to PYUSD tokens (assuming 1:1 ratio)
        pyusdToken.safeTransferFrom(msg.sender, address(this), amountUSD * 1e6); // PYUSD has 6 decimals

        // Store balance in cents for easier backend integration
        uint256 amountCents = amountUSD * 100;
        userBalances[msg.sender] += amountCents;

        emit UserDeposit(msg.sender, amountCents);
    }

    /**
     * @dev User withdraws from their balance
     * @param amountCents Amount to withdraw in cents
     */
    function withdraw(uint256 amountCents) external nonReentrant whenNotPaused validAmount(amountCents) {
        require(userBalances[msg.sender] >= amountCents, "Insufficient balance");

        userBalances[msg.sender] -= amountCents;

        // Convert cents to PYUSD (6 decimals)
        uint256 pyusdAmount = (amountCents * 1e6) / 100;
        pyusdToken.safeTransfer(msg.sender, pyusdAmount);

        emit UserWithdraw(msg.sender, amountCents);
    }

    ///////////////////////////////////
    //    Payment Settlement      /////
    ///////////////////////////////////

    /**
     * @dev Process batch payment with ZK proof verification
     * @param user User's wallet address
     * @param provider API provider address
     * @param amountCents Payment amount in cents
     * @param numCalls Number of API calls in the batch
     * @param proof ZK proof bytes
     * @param publicInputs Public inputs for proof verification
     */
    function processBatchPayment(
        address user,
        address provider,
        uint256 amountCents,
        uint256 numCalls,
        bytes calldata proof,
        uint256[] memory publicInputs
    )
        external
        nonReentrant
        whenNotPaused
        onlyOwner // Only backend can call this
    {
        require(userBalances[user] >= amountCents, "Insufficient user balance");
        require(amountCents > 0, "Invalid payment amount");
        require(provider != address(0), "Invalid provider address");

        // Verify ZK proof
        require(zkVerifier.verify(proof, publicInputs), "Invalid ZK proof");

        // Transfer from user balance to provider balance
        userBalances[user] -= amountCents;
        providerBalances[provider] += amountCents;

        emit BatchPayment(user, provider, amountCents, numCalls);
    }

    /**
     * @dev Deposit funds to user balance (for testing/demo)
     * @param user User address
     * @param amountCents Amount in cents
     */
    function depositForUser(address user, uint256 amountCents) external onlyOwner validAmount(amountCents) {
        userBalances[user] += amountCents;
        emit UserDeposit(user, amountCents);
    }

    ///////////////////////////////////
    //    Provider Functions      /////
    ///////////////////////////////////

    /**
     * @dev Provider withdraws earned funds
     * @param amountCents Amount to withdraw in cents
     */
    function providerWithdraw(uint256 amountCents) external nonReentrant whenNotPaused validAmount(amountCents) {
        require(providerBalances[msg.sender] >= amountCents, "Insufficient balance");

        providerBalances[msg.sender] -= amountCents;

        // Convert cents to PYUSD
        uint256 pyusdAmount = (amountCents * 1e6) / 100;
        pyusdToken.safeTransfer(msg.sender, pyusdAmount);

        emit ProviderWithdraw(msg.sender, amountCents);
    }

    /**
     * @dev Provider withdraws all earned funds
     */
    function providerWithdrawAll() external nonReentrant whenNotPaused {
        uint256 amount = providerBalances[msg.sender];
        require(amount > 0, "No balance to withdraw");

        providerBalances[msg.sender] = 0;

        // Convert cents to PYUSD
        uint256 pyusdAmount = (amount * 1e6) / 100;
        pyusdToken.safeTransfer(msg.sender, pyusdAmount);

        emit ProviderWithdraw(msg.sender, amount);
    }

    ///////////////////////////////////
    //       View Functions       /////
    ///////////////////////////////////

    function getUserBalance(address user) external view returns (uint256) {
        return userBalances[user];
    }

    function getUserBalanceUSD(address user) external view returns (uint256) {
        return userBalances[user] / 100; // Convert cents to dollars
    }

    function getProviderBalance(address provider) external view returns (uint256) {
        return providerBalances[provider];
    }
}
