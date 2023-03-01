// SPDX-License-Identifier: MIT

pragma solidity 0.8.10;

import {HandlerBase} from "../HandlerBase.sol";
import {IStargateRouter, IStargateWidget} from "./IStargateRouter.sol";
import {IStargateRouterETH} from "./IStargateRouterETH.sol";
import {IFactory, IPool} from "./IFactory.sol";

contract HStargate is HandlerBase {
    address public immutable router;
    address public immutable routerETH;
    address public immutable factory;
    address public immutable widgetSwap;
    bytes2 public immutable partnerId;

    constructor(
        address router_,
        address routerETH_,
        address factory_,
        address widgetSwap_,
        bytes2 partnerId_
    ) {
        router = router_;
        routerETH = routerETH_;
        factory = factory_;
        widgetSwap = widgetSwap_;
        partnerId = partnerId_;
    }

    function getContractName() public pure override returns (string memory) {
        return "HStargate";
    }

    function swapETH(
        uint256 value,
        uint16 dstChainId,
        address payable refundAddress,
        uint256 fee,
        uint256 amountOutMin,
        address to
    ) external payable {
        _requireMsg(to != address(0), "swapETH", "to zero address");

        value = _getBalance(NATIVE_TOKEN_ADDRESS, value);

        // Swap ETH
        try
            IStargateRouterETH(routerETH).swapETH{value: value}(
                dstChainId,
                refundAddress,
                abi.encodePacked(to),
                value - fee,
                amountOutMin
            )
        {} catch Error(string memory reason) {
            _revertMsg("swapETH", reason);
        } catch {
            _revertMsg("swapETH");
        }

        // Partnership
        IStargateWidget(widgetSwap).partnerSwap(partnerId);
    }

    function swap(
        uint16 dstChainId,
        uint256 srcPoolId,
        uint256 dstPoolId,
        address payable refundAddress,
        uint256 amountIn,
        uint256 fee,
        uint256 amountOutMin,
        address to
    ) external payable {
        _requireMsg(to != address(0), "swap", "to zero address");

        // Approve input token to Stargate
        IPool pool = IFactory(factory).getPool(srcPoolId);
        _requireMsg(address(pool) != address(0), "swap", "pool not found");
        address tokenIn = pool.token();
        amountIn = _getBalance(tokenIn, amountIn);
        _tokenApprove(tokenIn, router, amountIn);

        // Swap input token
        try
            IStargateRouter(router).swap{value: fee}(
                dstChainId,
                srcPoolId,
                dstPoolId,
                refundAddress,
                amountIn,
                amountOutMin,
                IStargateRouter.lzTxObj(0, 0, "0x"), // no destination gas
                abi.encodePacked(to),
                bytes("") // no data
            )
        {} catch Error(string memory reason) {
            _revertMsg("swap", reason);
        } catch {
            _revertMsg("swap");
        }

        // Reset Approval
        _tokenApproveZero(tokenIn, router);

        // Partnership
        IStargateWidget(widgetSwap).partnerSwap(partnerId);
    }
}
