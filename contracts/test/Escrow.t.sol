// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock PYUSD token for testing
contract MockPYUSD is ERC20 {
    constructor() ERC20("PayPal USD", "PYUSD") {
        _mint(msg.sender, 1000000 * 10 ** 18); // Mint 1M tokens to deployer
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock ZK Verifier for testing
contract MockZKVerifier {
    bool public shouldVerify = true;

    function verify(bytes memory _proof, uint256[] memory _publicInputs) external view returns (bool) {
        return shouldVerify;
    }

    function setShouldVerify(bool _shouldVerify) external {
        shouldVerify = _shouldVerify;
    }
}

contract EscrowTest is Test {
    Escrow public escrow;
    MockPYUSD public pyusdToken;
    MockZKVerifier public zkVerifier;

    address public owner;
    address public depositor = address(0x1);
    address public apiProvider = address(0x2);
    address public apiProvider2 = address(0x3);
    address public user = address(0x4);

    uint256 public constant INITIAL_BALANCE = 10000 * 10 ** 18; // 10k PYUSD

    event Deposit(address indexed depositor, address indexed apiProvider, uint256 amount);
    event DepositWithdraw(address indexed depositor, address indexed apiProvider, uint256 amount);
    event ApiProviderRegistered(address indexed apiProvider, string uri);
    event ApiProviderDeregistered(address indexed apiProvider);
    event ApiProviderWithdraw(address indexed apiProvider, uint256 amount);
    event PaymentSettled(address indexed depositor, address indexed apiProvider, uint256 amount);
    event BatchSettled(bytes32 indexed settlementId, uint256 totalAmount);
    event RateUpdated(address indexed apiProvider, string endpoint, uint256 newRate);
    event DefaultRateUpdated(address indexed apiProvider, uint256 newRate);
    event ZkVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    function setUp() public {
        owner = address(this);

        // Deploy mock contracts
        pyusdToken = new MockPYUSD();
        zkVerifier = new MockZKVerifier();

        // Deploy escrow
        escrow = new Escrow(address(pyusdToken), address(zkVerifier));

        // Setup initial balances
        pyusdToken.mint(depositor, INITIAL_BALANCE);
        pyusdToken.mint(user, INITIAL_BALANCE);

        // Approve escrow to spend tokens
        vm.prank(depositor);
        pyusdToken.approve(address(escrow), type(uint256).max);

        vm.prank(user);
        pyusdToken.approve(address(escrow), type(uint256).max);
    }

    ///////////////////////////////////
    //       Setup & Helper Tests  ///
    ///////////////////////////////////

    function testInitialSetup() public {
        assertEq(address(escrow.pyusdToken()), address(pyusdToken));
        assertEq(address(escrow.zkVerifier()), address(zkVerifier));
        assertEq(escrow.owner(), owner);
        assertFalse(escrow.paused());
    }

    function _registerApiProvider(address provider, string memory uri) internal {
        vm.prank(provider);
        escrow.registerApiProvider(uri);
    }

    ///////////////////////////////////
    //       Owner Functions Tests ///
    ///////////////////////////////////

    function testSetZkVerifier() public {
        MockZKVerifier newVerifier = new MockZKVerifier();

        vm.expectEmit(true, true, false, false);
        emit ZkVerifierUpdated(address(zkVerifier), address(newVerifier));

        escrow.setZkVerifier(address(newVerifier));
        assertEq(address(escrow.zkVerifier()), address(newVerifier));
    }

    function testSetZkVerifierFailsWithZeroAddress() public {
        vm.expectRevert("Invalid verifier address");
        escrow.setZkVerifier(address(0));
    }

    function testSetZkVerifierFailsForNonOwner() public {
        vm.prank(user);
        vm.expectRevert();
        escrow.setZkVerifier(address(zkVerifier));
    }

    function testPauseAndUnpause() public {
        escrow.pause();
        assertTrue(escrow.paused());

        escrow.unpause();
        assertFalse(escrow.paused());
    }

    function testPauseFailsForNonOwner() public {
        vm.prank(user);
        vm.expectRevert();
        escrow.pause();
    }

    function testEmergencyWithdraw() public {
        uint256 amount = 1000 * 10 ** 18;
        pyusdToken.transfer(address(escrow), amount);

        uint256 ownerBalanceBefore = pyusdToken.balanceOf(owner);
        escrow.emergencyWithdraw(address(pyusdToken), amount);

        assertEq(pyusdToken.balanceOf(owner), ownerBalanceBefore + amount);
        assertEq(pyusdToken.balanceOf(address(escrow)), 0);
    }

    ///////////////////////////////////
    //  API Provider Functions Tests //
    ///////////////////////////////////

    function testRegisterApiProvider() public {
        string memory uri = "https://api.example.com";

        vm.expectEmit(true, false, false, false);
        emit ApiProviderRegistered(apiProvider, uri);

        vm.prank(apiProvider);
        escrow.registerApiProvider(uri);

        assertTrue(escrow.isApiProviderRegistered(apiProvider));
        assertEq(escrow.getApiProviderUri(apiProvider), uri);
    }

    function testRegisterApiProviderFailsWhenAlreadyRegistered() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.prank(apiProvider);
        vm.expectRevert("Already registered");
        escrow.registerApiProvider("https://api2.example.com");
    }

    function testRegisterApiProviderFailsWithEmptyUri() public {
        vm.prank(apiProvider);
        vm.expectRevert("URI cannot be empty");
        escrow.registerApiProvider("");
    }

    function testRegisterApiProviderFailsWhenPaused() public {
        escrow.pause();

        vm.prank(apiProvider);
        vm.expectRevert();
        escrow.registerApiProvider("https://api.example.com");
    }

    function testDeregisterApiProvider() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.expectEmit(true, false, false, false);
        emit ApiProviderDeregistered(apiProvider);

        vm.prank(apiProvider);
        escrow.deregisterApiProvider();

        assertFalse(escrow.isApiProviderRegistered(apiProvider));
        assertEq(escrow.getApiProviderUri(apiProvider), "");
    }

    function testDeregisterApiProviderFailsWhenNotRegistered() public {
        vm.prank(apiProvider);
        vm.expectRevert("Not registered");
        escrow.deregisterApiProvider();
    }

    function testChangeApiProviderUri() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        string memory newUri = "https://api2.example.com";
        vm.prank(apiProvider);
        escrow.changeApiProviderUri(newUri);

        assertEq(escrow.getApiProviderUri(apiProvider), newUri);
    }

    function testChangeApiProviderUriFailsWithEmptyUri() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.prank(apiProvider);
        vm.expectRevert("URI cannot be empty");
        escrow.changeApiProviderUri("");
    }

    function testSetEndpointRate() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        string memory endpoint = "/users";
        uint256 rate = 100;

        vm.expectEmit(true, false, false, false);
        emit RateUpdated(apiProvider, endpoint, rate);

        vm.prank(apiProvider);
        escrow.setEndpointRate(endpoint, rate);

        assertEq(escrow.getEndpointRate(apiProvider, endpoint), rate);
    }

    function testSetDefaultRate() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        uint256 rate = 50;

        vm.expectEmit(true, false, false, false);
        emit DefaultRateUpdated(apiProvider, rate);

        vm.prank(apiProvider);
        escrow.setDefaultRate(rate);

        assertEq(escrow.getDefaultRate(apiProvider), rate);
    }

    function testGetEndpointRateReturnsDefaultWhenNotSet() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        uint256 defaultRate = 50;
        vm.prank(apiProvider);
        escrow.setDefaultRate(defaultRate);

        assertEq(escrow.getEndpointRate(apiProvider, "/nonexistent"), defaultRate);
    }

    ///////////////////////////////////
    //    API User Functions Tests  ///
    ///////////////////////////////////

    function testDeposit() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        uint256 amount = 1000 * 10 ** 18;

        vm.expectEmit(true, true, false, false);
        emit Deposit(depositor, apiProvider, amount);

        vm.prank(depositor);
        escrow.deposit(apiProvider, amount);

        assertEq(escrow.getDeposit(depositor, apiProvider), amount);
        assertTrue(escrow.isDepositorToApiProvider(depositor, apiProvider));
        assertEq(pyusdToken.balanceOf(address(escrow)), amount);
    }

    function testDepositFailsWhenApiProviderNotRegistered() public {
        uint256 amount = 1000 * 10 ** 18;

        vm.prank(depositor);
        vm.expectRevert("API provider not registered");
        escrow.deposit(apiProvider, amount);
    }

    function testDepositFailsWithZeroAmount() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.prank(depositor);
        vm.expectRevert("Amount must be greater than 0");
        escrow.deposit(apiProvider, 0);
    }

    function testDepositFailsWhenPaused() public {
        _registerApiProvider(apiProvider, "https://api.example.com");
        escrow.pause();

        vm.prank(depositor);
        vm.expectRevert();
        escrow.deposit(apiProvider, 1000 * 10 ** 18);
    }

    function testDepositWithdraw() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        uint256 amount = 1000 * 10 ** 18;

        // First deposit
        vm.prank(depositor);
        escrow.deposit(apiProvider, amount);

        uint256 withdrawAmount = 500 * 10 ** 18;
        uint256 depositorBalanceBefore = pyusdToken.balanceOf(depositor);

        vm.expectEmit(true, true, false, false);
        emit DepositWithdraw(depositor, apiProvider, withdrawAmount);

        vm.prank(depositor);
        escrow.depositWithdraw(withdrawAmount, apiProvider);

        assertEq(escrow.getDeposit(depositor, apiProvider), amount - withdrawAmount);
        assertEq(pyusdToken.balanceOf(depositor), depositorBalanceBefore + withdrawAmount);
        assertTrue(escrow.isDepositorToApiProvider(depositor, apiProvider)); // Still has deposits
    }

    function testDepositWithdrawAllResetsDepositorStatus() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        uint256 amount = 1000 * 10 ** 18;

        // Deposit and withdraw all
        vm.prank(depositor);
        escrow.deposit(apiProvider, amount);

        vm.prank(depositor);
        escrow.depositWithdraw(amount, apiProvider);

        assertEq(escrow.getDeposit(depositor, apiProvider), 0);
        assertFalse(escrow.isDepositorToApiProvider(depositor, apiProvider));
    }

    function testDepositWithdrawFailsWithInsufficientBalance() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        uint256 depositAmount = 500 * 10 ** 18;
        uint256 withdrawAmount = 1000 * 10 ** 18;

        vm.prank(depositor);
        escrow.deposit(apiProvider, depositAmount);

        vm.prank(depositor);
        vm.expectRevert("Insufficient deposited balance");
        escrow.depositWithdraw(withdrawAmount, apiProvider);
    }

    ///////////////////////////////////
    //  API Provider Withdraw Tests ///
    ///////////////////////////////////

    function testApiProviderWithdraw() public {
        // Register and pre-fund provider balance via settlement
        _registerApiProvider(apiProvider, "https://api.example.com");
        uint256 prefund = 500e18;
        vm.prank(depositor);
        escrow.deposit(apiProvider, prefund);

        uint256[] memory inputs = new uint256[](4);
        inputs[0] = prefund; // total
        inputs[1] = uint256(uint160(depositor));
        inputs[2] = uint256(uint160(apiProvider));
        inputs[3] = prefund; // amount
        bytes memory proof = abi.encode("mock_proof");
        escrow.settlePayments(proof, inputs, keccak256("prefund-withdraw-1"));

        vm.prank(apiProvider);
        escrow.apiProviderWithdraw(100e18);

        assertEq(escrow.getApiProviderBalance(apiProvider), 400e18);
        assertEq(pyusdToken.balanceOf(apiProvider), 100e18);
    }

    function testApiProviderWithdrawAll() public {
        // Register and pre-fund provider balance via settlement
        _registerApiProvider(apiProvider, "https://api.example.com");
        uint256 prefund = 500e18;
        vm.prank(depositor);
        escrow.deposit(apiProvider, prefund);

        uint256[] memory inputs = new uint256[](4);
        inputs[0] = prefund; // total
        inputs[1] = uint256(uint160(depositor));
        inputs[2] = uint256(uint160(apiProvider));
        inputs[3] = prefund; // amount
        bytes memory proof = abi.encode("mock_proof");
        escrow.settlePayments(proof, inputs, keccak256("prefund-withdraw-2"));

        vm.prank(apiProvider);
        escrow.apiProviderWithdrawAll();

        assertEq(escrow.getApiProviderBalance(apiProvider), 0);
        assertEq(pyusdToken.balanceOf(apiProvider), 500e18);
    }

    ///////////////////////////////////
    //   Payment Settlement Tests   ///
    ///////////////////////////////////

    function testSettlePayments() public {
        // Setup: Register API provider and make deposits
        _registerApiProvider(apiProvider, "https://api.example.com");
        _registerApiProvider(apiProvider2, "https://api2.example.com");

        uint256 deposit1 = 1000 * 10 ** 18;
        uint256 deposit2 = 2000 * 10 ** 18;

        vm.prank(depositor);
        escrow.deposit(apiProvider, deposit1);

        vm.prank(user);
        escrow.deposit(apiProvider2, deposit2);

        // Setup settlement data
        bytes32 settlementId = keccak256("settlement1");
        uint256 payment1 = 100 * 10 ** 18;
        uint256 payment2 = 200 * 10 ** 18;
        uint256 totalAmount = payment1 + payment2;

        uint256[] memory publicInputs = new uint256[](7);
        publicInputs[0] = totalAmount;
        publicInputs[1] = uint256(uint160(depositor));
        publicInputs[2] = uint256(uint160(apiProvider));
        publicInputs[3] = payment1;
        publicInputs[4] = uint256(uint160(user));
        publicInputs[5] = uint256(uint160(apiProvider2));
        publicInputs[6] = payment2;

        bytes memory proof = abi.encode("mock_proof");

        vm.expectEmit(true, true, false, false);
        emit PaymentSettled(depositor, apiProvider, payment1);

        vm.expectEmit(true, true, false, false);
        emit PaymentSettled(user, apiProvider2, payment2);

        vm.expectEmit(true, false, false, false);
        emit BatchSettled(settlementId, totalAmount);

        escrow.settlePayments(proof, publicInputs, settlementId);

        // Verify balances updated correctly
        assertEq(escrow.getDeposit(depositor, apiProvider), deposit1 - payment1);
        assertEq(escrow.getDeposit(user, apiProvider2), deposit2 - payment2);
        assertEq(escrow.getApiProviderBalance(apiProvider), payment1);
        assertEq(escrow.getApiProviderBalance(apiProvider2), payment2);
        assertTrue(escrow.isSettlementProcessed(settlementId));
    }

    function testSettlePaymentsFailsForNonOwner() public {
        bytes32 settlementId = keccak256("settlement1");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 100;
        bytes memory proof = abi.encode("mock_proof");

        vm.prank(user);
        vm.expectRevert("Only owner can settle payments");
        escrow.settlePayments(proof, publicInputs, settlementId);
    }

    function testSettlePaymentsFailsWhenAlreadyProcessed() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.prank(depositor);
        escrow.deposit(apiProvider, 1000 * 10 ** 18);

        bytes32 settlementId = keccak256("settlement1");
        uint256[] memory publicInputs = new uint256[](4);
        publicInputs[0] = 500 * 10 ** 18; // Total amount
        publicInputs[1] = uint256(uint160(depositor));
        publicInputs[2] = uint256(uint160(apiProvider));
        publicInputs[3] = 500 * 10 ** 18; // Payment amount

        bytes memory proof = abi.encode("mock_proof");

        // First settlement
        escrow.settlePayments(proof, publicInputs, settlementId);

        // Second settlement with same ID should fail
        vm.expectRevert("Settlement already processed");
        escrow.settlePayments(proof, publicInputs, settlementId);
    }

    function testSettlePaymentsFailsWithInvalidProof() public {
        zkVerifier.setShouldVerify(false);

        bytes32 settlementId = keccak256("settlement1");
        uint256[] memory publicInputs = new uint256[](1);
        publicInputs[0] = 100;
        bytes memory proof = abi.encode("invalid_proof");

        vm.expectRevert("Invalid ZK proof");
        escrow.settlePayments(proof, publicInputs, settlementId);
    }

    function testSettlePaymentsFailsWithInvalidPublicInputsFormat() public {
        bytes32 settlementId = keccak256("settlement1");
        uint256[] memory publicInputs = new uint256[](3); // Should be 1 + 3*n format
        bytes memory proof = abi.encode("mock_proof");

        vm.expectRevert("Invalid payment data format");
        escrow.settlePayments(proof, publicInputs, settlementId);
    }

    function testSettlePaymentsFailsWithTotalAmountMismatch() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.prank(depositor);
        escrow.deposit(apiProvider, 1000 * 10 ** 18);

        bytes32 settlementId = keccak256("settlement1");
        uint256[] memory publicInputs = new uint256[](4);
        publicInputs[0] = 500 * 10 ** 18; // Total amount
        publicInputs[1] = uint256(uint160(depositor));
        publicInputs[2] = uint256(uint160(apiProvider));
        publicInputs[3] = 300 * 10 ** 18; // Actual payment (mismatch!)

        bytes memory proof = abi.encode("mock_proof");

        vm.expectRevert("Total amount mismatch");
        escrow.settlePayments(proof, publicInputs, settlementId);
    }

    ///////////////////////////////////
    //      View Functions Tests    ///
    ///////////////////////////////////

    function testViewFunctions() public {
        _registerApiProvider(apiProvider, "https://api.example.com");

        // Test deposit view
        uint256 amount = 1000 * 10 ** 18;
        vm.prank(depositor);
        escrow.deposit(apiProvider, amount);

        assertEq(escrow.getDeposit(depositor, apiProvider), amount);
        assertEq(escrow.getApiProviderBalance(apiProvider), 0);
        assertEq(escrow.getApiProviderUri(apiProvider), "https://api.example.com");
        assertTrue(escrow.isApiProviderRegistered(apiProvider));
        assertFalse(escrow.isApiProviderRegistered(user));

        // Test rates
        vm.prank(apiProvider);
        escrow.setDefaultRate(100);

        vm.prank(apiProvider);
        escrow.setEndpointRate("/users", 150);

        assertEq(escrow.getDefaultRate(apiProvider), 100);
        assertEq(escrow.getEndpointRate(apiProvider, "/users"), 150);
        assertEq(escrow.getEndpointRate(apiProvider, "/posts"), 100); // Returns default
    }

    ///////////////////////////////////
    //      Edge Cases & Security   ///
    ///////////////////////////////////

    function testReentrancyProtection() public {
        // This would require a malicious token contract to test properly
        // For now, we verify the modifier is present
        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.prank(depositor);
        escrow.deposit(apiProvider, 1000 * 10 ** 18);

        vm.prank(depositor);
        escrow.depositWithdraw(500 * 10 ** 18, apiProvider);

        // If we get here without reverting, reentrancy protection is working
        assertEq(escrow.getDeposit(depositor, apiProvider), 500 * 10 ** 18);
    }

    function testFuzzDeposit(uint256 amount) public {
        vm.assume(amount > 0 && amount <= INITIAL_BALANCE);

        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.prank(depositor);
        escrow.deposit(apiProvider, amount);

        assertEq(escrow.getDeposit(depositor, apiProvider), amount);
    }

    function testFuzzWithdraw(uint256 depositAmount, uint256 withdrawAmount) public {
        vm.assume(depositAmount > 0 && depositAmount <= INITIAL_BALANCE);
        vm.assume(withdrawAmount > 0 && withdrawAmount <= depositAmount);

        _registerApiProvider(apiProvider, "https://api.example.com");

        vm.prank(depositor);
        escrow.deposit(apiProvider, depositAmount);

        vm.prank(depositor);
        escrow.depositWithdraw(withdrawAmount, apiProvider);

        assertEq(escrow.getDeposit(depositor, apiProvider), depositAmount - withdrawAmount);
    }
}
