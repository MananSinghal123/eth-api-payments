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

/**
 * @title Enhanced Escrow Contract for Web3 API Monetization
 * @dev Core escrow with ZK proof settlement, batching handled by backend
 */
contract Escrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // PYUSD token interface
    IERC20 public immutable pyusdToken;
    IVerifier public zkVerifier;

    // Core storage mappings
    mapping(address => mapping(address => uint256)) public depositsUserToApiProvider;
    mapping(address => mapping(address => bool)) public isDepositorToApiProvider;
    mapping(address => string) public apiProviderToUri;
    mapping(address => uint256) public apiProviderBalances;
    mapping(address => bool) public registeredApiProviders;

    // Rate management
    mapping(address => mapping(string => uint256)) public apiProviderRates; // provider => endpoint => rate
    mapping(address => uint256) public defaultApiProviderRates; // provider => default rate

    // Settlement tracking
    mapping(bytes32 => bool) public processedSettlements;

    // Events
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

    constructor(address _pyusdAddress, address _zkVerifier) Ownable(msg.sender) {
        pyusdToken = IERC20(_pyusdAddress);
        zkVerifier = IVerifier(_zkVerifier);
    }

    ///////////////////////////////////
    //       Modifiers            /////
    ///////////////////////////////////

    modifier onlyRegisteredApiProvider(address apiProvider) {
        require(registeredApiProviders[apiProvider], "API provider not registered");
        _;
    }

    modifier onlyApiProviderOwner(address apiProvider) {
        require(msg.sender == apiProvider, "Only API provider owner can call this");
        _;
    }

    modifier onlyDepositorToApiProvider(address depositor, address apiProvider) {
        require(isDepositorToApiProvider[depositor][apiProvider], "No deposits found for this address");
        _;
    }

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
    //       API User Functions   /////
    ///////////////////////////////////

    function deposit(address apiProvider, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        validAmount(amount)
        onlyRegisteredApiProvider(apiProvider)
    {
        pyusdToken.safeTransferFrom(msg.sender, address(this), amount);

        depositsUserToApiProvider[msg.sender][apiProvider] += amount;
        isDepositorToApiProvider[msg.sender][apiProvider] = true;

        emit Deposit(msg.sender, apiProvider, amount);
    }

    function depositWithdraw(uint256 amount, address apiProvider)
        external
        nonReentrant
        whenNotPaused
        validAmount(amount)
        onlyDepositorToApiProvider(msg.sender, apiProvider)
    {
        require(depositsUserToApiProvider[msg.sender][apiProvider] >= amount, "Insufficient deposited balance");

        depositsUserToApiProvider[msg.sender][apiProvider] -= amount;
        if (depositsUserToApiProvider[msg.sender][apiProvider] == 0) {
            isDepositorToApiProvider[msg.sender][apiProvider] = false;
        }

        pyusdToken.safeTransfer(msg.sender, amount);

        emit DepositWithdraw(msg.sender, apiProvider, amount);
    }

    ///////////////////////////////////
    //    Payment Settlement      /////
    ///////////////////////////////////

    function settlePayments(bytes calldata proof, uint256[] memory publicInputs, bytes32 settlementId)
        external
        nonReentrant
        whenNotPaused
    {
        require(msg.sender == owner(), "Only owner can settle payments");
        require(!processedSettlements[settlementId], "Settlement already processed");
        require(zkVerifier.verify(proof, publicInputs), "Invalid ZK proof");

        // Mark settlement as processed
        processedSettlements[settlementId] = true;

        // Public inputs format: [totalAmount, depositor1, apiProvider1, amount1, depositor2, apiProvider2, amount2, ...]
        require(publicInputs.length >= 1, "Invalid public inputs");
        uint256 totalAmount = publicInputs[0];
        require((publicInputs.length - 1) % 3 == 0, "Invalid payment data format");

        uint256 numPayments = (publicInputs.length - 1) / 3;
        uint256 processedAmount = 0;

        for (uint256 i = 0; i < numPayments; i++) {
            uint256 baseIndex = 1 + (i * 3);
            address depositor = address(uint160(publicInputs[baseIndex]));
            address apiProvider = address(uint160(publicInputs[baseIndex + 1]));
            uint256 amount = publicInputs[baseIndex + 2];

            require(registeredApiProviders[apiProvider], "API provider not registered");
            require(isDepositorToApiProvider[depositor][apiProvider], "No deposits found");
            require(depositsUserToApiProvider[depositor][apiProvider] >= amount, "Insufficient deposited balance");

            // Transfer from depositor's balance to API provider's balance
            depositsUserToApiProvider[depositor][apiProvider] -= amount;
            if (depositsUserToApiProvider[depositor][apiProvider] == 0) {
                isDepositorToApiProvider[depositor][apiProvider] = false;
            }

            apiProviderBalances[apiProvider] += amount;
            processedAmount += amount;

            emit PaymentSettled(depositor, apiProvider, amount);
        }

        require(processedAmount == totalAmount, "Total amount mismatch");
        emit BatchSettled(settlementId, totalAmount);
    }

    ///////////////////////////////////////
    //       API Provider Functions   /////
    ///////////////////////////////////////

    function registerApiProvider(string calldata uri) external whenNotPaused {
        require(!registeredApiProviders[msg.sender], "Already registered");
        require(bytes(uri).length > 0, "URI cannot be empty");

        registeredApiProviders[msg.sender] = true;
        apiProviderToUri[msg.sender] = uri;

        emit ApiProviderRegistered(msg.sender, uri);
    }

    function deregisterApiProvider() external onlyApiProviderOwner(msg.sender) {
        require(registeredApiProviders[msg.sender], "Not registered");
        require(apiProviderBalances[msg.sender] == 0, "Must withdraw all funds first");

        registeredApiProviders[msg.sender] = false;
        delete apiProviderToUri[msg.sender];

        emit ApiProviderDeregistered(msg.sender);
    }

    function changeApiProviderUri(string calldata uri)
        external
        onlyApiProviderOwner(msg.sender)
        onlyRegisteredApiProvider(msg.sender)
    {
        require(bytes(uri).length > 0, "URI cannot be empty");
        apiProviderToUri[msg.sender] = uri;
    }

    function setEndpointRate(string calldata endpoint, uint256 rate)
        external
        onlyApiProviderOwner(msg.sender)
        onlyRegisteredApiProvider(msg.sender)
    {
        apiProviderRates[msg.sender][endpoint] = rate;
        emit RateUpdated(msg.sender, endpoint, rate);
    }

    function setDefaultRate(uint256 rate)
        external
        onlyApiProviderOwner(msg.sender)
        onlyRegisteredApiProvider(msg.sender)
    {
        defaultApiProviderRates[msg.sender] = rate;
        emit DefaultRateUpdated(msg.sender, rate);
    }

    function apiProviderWithdraw(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        validAmount(amount)
        onlyApiProviderOwner(msg.sender)
        onlyRegisteredApiProvider(msg.sender)
    {
        require(apiProviderBalances[msg.sender] >= amount, "Insufficient balance");

        apiProviderBalances[msg.sender] -= amount;
        pyusdToken.safeTransfer(msg.sender, amount);

        emit ApiProviderWithdraw(msg.sender, amount);
    }

    function apiProviderWithdrawAll()
        external
        nonReentrant
        whenNotPaused
        onlyApiProviderOwner(msg.sender)
        onlyRegisteredApiProvider(msg.sender)
    {
        uint256 amount = apiProviderBalances[msg.sender];
        require(amount > 0, "No balance to withdraw");

        apiProviderBalances[msg.sender] = 0;
        pyusdToken.safeTransfer(msg.sender, amount);

        emit ApiProviderWithdraw(msg.sender, amount);
    }

    ///////////////////////////////////
    //       View Functions       /////
    ///////////////////////////////////

    function getDeposit(address depositor, address apiProvider) external view returns (uint256) {
        return depositsUserToApiProvider[depositor][apiProvider];
    }

    function getApiProviderBalance(address apiProvider) external view returns (uint256) {
        return apiProviderBalances[apiProvider];
    }

    function getApiProviderUri(address apiProvider) external view returns (string memory) {
        return apiProviderToUri[apiProvider];
    }

    function getEndpointRate(address apiProvider, string memory endpoint) public view returns (uint256) {
        uint256 endpointRate = apiProviderRates[apiProvider][endpoint];
        return endpointRate > 0 ? endpointRate : defaultApiProviderRates[apiProvider];
    }

    function getDefaultRate(address apiProvider) external view returns (uint256) {
        return defaultApiProviderRates[apiProvider];
    }

    function isApiProviderRegistered(address apiProvider) external view returns (bool) {
        return registeredApiProviders[apiProvider];
    }

    function isSettlementProcessed(bytes32 settlementId) external view returns (bool) {
        return processedSettlements[settlementId];
    }
}
