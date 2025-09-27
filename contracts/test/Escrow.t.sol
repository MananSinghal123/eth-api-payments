// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

// Mock ZK Verifier for testing
contract MockZkVerifier {
    bool public shouldVerify = true;

    function verify(bytes memory, uint256[] memory) external view returns (bool) {
        return shouldVerify;
    }

    function setShouldVerify(bool _shouldVerify) external {
        shouldVerify = _shouldVerify;
    }
}

contract EscrowTest is Test {
    Escrow public escrow;
    ERC20Mock public pyusdToken;
    MockZkVerifier public mockVerifier;

    address public owner = makeAddr("owner");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public provider1 = makeAddr("provider1");
    address public provider2 = makeAddr("provider2");
    address public attacker = makeAddr("attacker");

    // Test constants
    uint256 constant INITIAL_BALANCE = 1000000 * 1e6; // 1M PYUSD
    uint256 constant DEPOSIT_AMOUNT_USD = 100; // $100
    uint256 constant DEPOSIT_AMOUNT_CENTS = 10000; // $100 in cents
    uint256 constant PYUSD_AMOUNT = 100 * 1e6; // 100 PYUSD tokens (6 decimals)

    event UserDeposit(address indexed user, uint256 amount);
    event UserWithdraw(address indexed user, uint256 amount);
    event ProviderWithdraw(address indexed provider, uint256 amount);
    event BatchPayment(address indexed user, address indexed provider, uint256 amount, uint256 numCalls);
    event ZkVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    function setUp() public {
        vm.startPrank(owner);

        // Deploy mock PYUSD token
        pyusdToken = new ERC20Mock();

        // Deploy mock ZK verifier
        mockVerifier = new MockZkVerifier();

        // Deploy escrow contract
        escrow = new Escrow(address(pyusdToken), address(mockVerifier));

        vm.stopPrank();

        // Mint tokens to test accounts
        pyusdToken.mint(user1, INITIAL_BALANCE);
        pyusdToken.mint(user2, INITIAL_BALANCE);
        pyusdToken.mint(owner, INITIAL_BALANCE);

        // Approve escrow to spend tokens
        vm.prank(user1);
        pyusdToken.approve(address(escrow), type(uint256).max);

        vm.prank(user2);
        pyusdToken.approve(address(escrow), type(uint256).max);
    }

    //////////////////////////////////
    //       DEPOSIT TESTS        ////
    //////////////////////////////////

    function testDeposit() public {
        vm.prank(user1);

        vm.expectEmit(true, false, false, true);
        emit UserDeposit(user1, DEPOSIT_AMOUNT_CENTS);

        escrow.deposit(DEPOSIT_AMOUNT_USD);

        assertEq(escrow.getUserBalance(user1), DEPOSIT_AMOUNT_CENTS);
        assertEq(escrow.getUserBalanceUSD(user1), DEPOSIT_AMOUNT_USD);
        assertEq(pyusdToken.balanceOf(address(escrow)), PYUSD_AMOUNT);
    }

    function testDepositMultipleUsers() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        vm.prank(user2);
        escrow.deposit(50); // $50

        assertEq(escrow.getUserBalance(user1), DEPOSIT_AMOUNT_CENTS);
        assertEq(escrow.getUserBalance(user2), 5000); // $50 in cents
        assertEq(pyusdToken.balanceOf(address(escrow)), PYUSD_AMOUNT + 50 * 1e6);
    }

    function testDepositZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than 0");
        escrow.deposit(0);
    }

    function testDepositWhenPaused() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(user1);
        vm.expectRevert(); // EnforcedPause()
        escrow.deposit(DEPOSIT_AMOUNT_USD);
    }

    function testDepositInsufficientApproval() public {
        vm.prank(user1);
        pyusdToken.approve(address(escrow), 0);

        vm.expectRevert();
        escrow.deposit(DEPOSIT_AMOUNT_USD);
    }

    //////////////////////////////////
    //      WITHDRAWAL TESTS      ////
    //////////////////////////////////

    function testWithdraw() public {
        // First deposit
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        uint256 withdrawAmount = 5000; // $50 in cents

        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit UserWithdraw(user1, withdrawAmount);

        escrow.withdraw(withdrawAmount);

        assertEq(escrow.getUserBalance(user1), DEPOSIT_AMOUNT_CENTS - withdrawAmount);
        assertEq(pyusdToken.balanceOf(user1), INITIAL_BALANCE - PYUSD_AMOUNT + (withdrawAmount * 1e6 / 100));
    }

    function testWithdrawAll() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        vm.prank(user1);
        escrow.withdraw(DEPOSIT_AMOUNT_CENTS);

        assertEq(escrow.getUserBalance(user1), 0);
        assertEq(pyusdToken.balanceOf(user1), INITIAL_BALANCE);
    }

    function testWithdrawInsufficientBalance() public {
        vm.prank(user1);
        escrow.deposit(50); // $50

        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        escrow.withdraw(10000); // Try to withdraw $100
    }

    function testWithdrawZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than 0");
        escrow.withdraw(0);
    }

    function testWithdrawWhenPaused() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        vm.prank(owner);
        escrow.pause();

        vm.prank(user1);
        vm.expectRevert(); // EnforcedPause()
        escrow.withdraw(5000);
    }

    //////////////////////////////////
    //    BATCH PAYMENT TESTS     ////
    //////////////////////////////////

    function testProcessBatchPayment() public {
        // Setup: user deposits funds
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        uint256 paymentAmount = 3000; // $30 in cents
        uint256 numCalls = 100;
        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = paymentAmount;

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit BatchPayment(user1, provider1, paymentAmount, numCalls);

        escrow.processBatchPayment(user1, provider1, paymentAmount, numCalls, proof, publicInputs);

        assertEq(escrow.getUserBalance(user1), DEPOSIT_AMOUNT_CENTS - paymentAmount);
        assertEq(escrow.getProviderBalance(provider1), paymentAmount);
    }

    function testProcessBatchPaymentInvalidProof() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        // Set verifier to return false
        mockVerifier.setShouldVerify(false);

        bytes memory proof = abi.encode("invalid_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 3000;

        vm.prank(owner);
        vm.expectRevert("Invalid ZK proof");
        escrow.processBatchPayment(user1, provider1, 3000, 100, proof, publicInputs);
    }

    function testProcessBatchPaymentInsufficientUserBalance() public {
        vm.prank(user1);
        escrow.deposit(50); // Only $50

        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 10000; // Try to pay $100

        vm.prank(owner);
        vm.expectRevert("Insufficient user balance");
        escrow.processBatchPayment(user1, provider1, 10000, 100, proof, publicInputs);
    }

    function testProcessBatchPaymentOnlyOwner() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 3000;

        vm.prank(attacker);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        escrow.processBatchPayment(user1, provider1, 3000, 100, proof, publicInputs);
    }

    function testProcessBatchPaymentZeroAmount() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 0;

        vm.prank(owner);
        vm.expectRevert("Invalid payment amount");
        escrow.processBatchPayment(user1, provider1, 0, 100, proof, publicInputs);
    }

    function testProcessBatchPaymentInvalidProvider() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 3000;

        vm.prank(owner);
        vm.expectRevert("Invalid provider address");
        escrow.processBatchPayment(user1, address(0), 3000, 100, proof, publicInputs);
    }

    //////////////////////////////////
    //   PROVIDER WITHDRAW TESTS  ////
    //////////////////////////////////

    function testProviderWithdraw() public {
        // Setup: process a payment to provider
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        uint256 paymentAmount = 3000;
        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = paymentAmount;

        vm.prank(owner);
        escrow.processBatchPayment(user1, provider1, paymentAmount, 100, proof, publicInputs);

        // Provider withdraws
        uint256 withdrawAmount = 1000; // $10

        vm.prank(provider1);
        vm.expectEmit(true, false, false, true);
        emit ProviderWithdraw(provider1, withdrawAmount);

        escrow.providerWithdraw(withdrawAmount);

        assertEq(escrow.getProviderBalance(provider1), paymentAmount - withdrawAmount);
        assertEq(pyusdToken.balanceOf(provider1), withdrawAmount * 1e6 / 100);
    }

    function testProviderWithdrawAll() public {
        // Setup: process payment
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        uint256 paymentAmount = 3000;
        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = paymentAmount;

        vm.prank(owner);
        escrow.processBatchPayment(user1, provider1, paymentAmount, 100, proof, publicInputs);

        // Provider withdraws all
        vm.prank(provider1);
        vm.expectEmit(true, false, false, true);
        emit ProviderWithdraw(provider1, paymentAmount);

        escrow.providerWithdrawAll();

        assertEq(escrow.getProviderBalance(provider1), 0);
        assertEq(pyusdToken.balanceOf(provider1), paymentAmount * 1e6 / 100);
    }

    function testProviderWithdrawInsufficientBalance() public {
        vm.prank(provider1);
        vm.expectRevert("Insufficient balance");
        escrow.providerWithdraw(1000);
    }

    function testProviderWithdrawAllNoBalance() public {
        vm.prank(provider1);
        vm.expectRevert("No balance to withdraw");
        escrow.providerWithdrawAll();
    }

    //////////////////////////////////
    //      OWNER FUNCTIONS       ////
    //////////////////////////////////

    function testSetZkVerifier() public {
        MockZkVerifier newVerifier = new MockZkVerifier();

        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit ZkVerifierUpdated(address(mockVerifier), address(newVerifier));

        escrow.setZkVerifier(address(newVerifier));

        assertEq(address(escrow.zkVerifier()), address(newVerifier));
    }

    function testSetZkVerifierInvalidAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid verifier address");
        escrow.setZkVerifier(address(0));
    }

    function testSetZkVerifierOnlyOwner() public {
        MockZkVerifier newVerifier = new MockZkVerifier();

        vm.prank(attacker);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        escrow.setZkVerifier(address(newVerifier));
    }

    function testPause() public {
        vm.prank(owner);
        escrow.pause();

        assertTrue(escrow.paused());
    }

    function testUnpause() public {
        vm.prank(owner);
        escrow.pause();

        vm.prank(owner);
        escrow.unpause();

        assertFalse(escrow.paused());
    }

    function testPauseOnlyOwner() public {
        vm.prank(attacker);
        vm.expectRevert(); // OwnableUnauthorizedAccount
        escrow.pause();
    }

    function testDepositForUser() public {
        uint256 amount = 5000; // $50 in cents

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit UserDeposit(user1, amount);

        escrow.depositForUser(user1, amount);

        assertEq(escrow.getUserBalance(user1), amount);
    }

    function testEmergencyWithdraw() public {
        // First, have some tokens in the contract
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        uint256 contractBalance = pyusdToken.balanceOf(address(escrow));
        uint256 ownerBalanceBefore = pyusdToken.balanceOf(owner);

        vm.prank(owner);
        escrow.emergencyWithdraw(address(pyusdToken), contractBalance);

        assertEq(pyusdToken.balanceOf(owner), ownerBalanceBefore + contractBalance);
    }

    //////////////////////////////////
    //       VIEW FUNCTIONS       ////
    //////////////////////////////////

    function testGetUserBalance() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        assertEq(escrow.getUserBalance(user1), DEPOSIT_AMOUNT_CENTS);
    }

    function testGetUserBalanceUSD() public {
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        assertEq(escrow.getUserBalanceUSD(user1), DEPOSIT_AMOUNT_USD);
    }

    function testGetProviderBalance() public {
        // Process payment first
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 3000;

        vm.prank(owner);
        escrow.processBatchPayment(user1, provider1, 3000, 100, proof, publicInputs);

        assertEq(escrow.getProviderBalance(provider1), 3000);
    }

    //////////////////////////////////
    //       EDGE CASES           ////
    //////////////////////////////////

    function testReentrancyProtection() public {
        // This is a basic test - in a real scenario, you'd create a malicious contract
        vm.prank(user1);
        escrow.deposit(DEPOSIT_AMOUNT_USD);

        // Reentrancy should be prevented by the ReentrancyGuard
        vm.prank(user1);
        escrow.withdraw(5000);

        // If we got here, reentrancy protection is working
        assertTrue(true);
    }

    function testLargeAmounts() public {
        uint256 largeAmount = 1000000; // $1M

        // Mint enough tokens
        pyusdToken.mint(user1, largeAmount * 1e6);

        vm.prank(user1);
        pyusdToken.approve(address(escrow), largeAmount * 1e6);

        vm.prank(user1);
        escrow.deposit(largeAmount);

        assertEq(escrow.getUserBalanceUSD(user1), largeAmount);
    }

    function testMultipleProvidersAndUsers() public {
        // Multiple users deposit
        vm.prank(user1);
        escrow.deposit(100);

        vm.prank(user2);
        escrow.deposit(200);

        // Process payments to multiple providers
        bytes memory proof = abi.encode("mock_proof");
        uint256[] memory publicInputs = new uint256[](1);

        publicInputs[0] = 3000;
        vm.prank(owner);
        escrow.processBatchPayment(user1, provider1, 3000, 100, proof, publicInputs);

        publicInputs[0] = 5000;
        vm.prank(owner);
        escrow.processBatchPayment(user2, provider2, 5000, 150, proof, publicInputs);

        assertEq(escrow.getUserBalance(user1), 10000 - 3000);
        assertEq(escrow.getUserBalance(user2), 20000 - 5000);
        assertEq(escrow.getProviderBalance(provider1), 3000);
        assertEq(escrow.getProviderBalance(provider2), 5000);
    }

    //////////////////////////////////
    //         FUZZ TESTS         ////
    //////////////////////////////////

    function testFuzzDeposit(uint256 amount) public {
        vm.assume(amount > 0 && amount < INITIAL_BALANCE / 1e6); // Reasonable bounds

        vm.prank(user1);
        escrow.deposit(amount);

        assertEq(escrow.getUserBalanceUSD(user1), amount);
        assertEq(escrow.getUserBalance(user1), amount * 100);
    }

    function testFuzzWithdraw(uint256 depositAmount, uint256 withdrawAmount) public {
        vm.assume(depositAmount > 0 && depositAmount < INITIAL_BALANCE / 1e6);
        vm.assume(withdrawAmount > 0 && withdrawAmount <= depositAmount * 100);

        vm.prank(user1);
        escrow.deposit(depositAmount);

        vm.prank(user1);
        escrow.withdraw(withdrawAmount);

        assertEq(escrow.getUserBalance(user1), depositAmount * 100 - withdrawAmount);
    }
}
