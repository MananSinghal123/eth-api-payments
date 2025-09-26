// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Escrow} from "../src/Escrow.sol";

contract EscrowTest is Test {
    Escrow public escrow;
    address public depositor = address(0x1);
    address public apiProvider = address(0x2);

    function setUp() public {
        escrow = new Escrow();
    }

    ////////////////////////////////////////
    //       API User Functions Tests  /////
    ////////////////////////////////////////

    function testDeposit() public {
        uint256 amount = 1 ether;
        vm.deal(depositor, amount);
        vm.prank(depositor);
        escrow.deposit{value: amount}(depositor, amount, apiProvider);
        assertEq(escrow.getDeposit(depositor), amount);
    }

    function testWithdraw() public {
        uint256 amount = 1 ether;
        vm.deal(depositor, amount);
        vm.prank(depositor);
        escrow.deposit{value: amount}(depositor, amount, apiProvider);
        vm.prank(depositor);
        escrow.depositWithdraw(amount, apiProvider);
        assertEq(escrow.getDeposit(depositor), 0);
    }
}
