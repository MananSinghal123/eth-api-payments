// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {Escrow} from "../src/Escrow.sol";
import {console} from "forge-std/console.sol";

contract DeployEscrow is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy Escrow with provided addresses
        address pyusdAddress = 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9;
        address zkVerifierAddress = 0xd9145CCE52D386f254917e481eB44e9943F39138;

        Escrow escrow = new Escrow(pyusdAddress, zkVerifierAddress);

        vm.stopBroadcast();

        // Log the deployed address
        console.log("Escrow deployed at:", address(escrow));
    }
}
