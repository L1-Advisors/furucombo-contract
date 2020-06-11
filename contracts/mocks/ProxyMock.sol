pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../Proxy.sol";
import "./debug/GasProfiler.sol";


contract ProxyMock is Proxy, GasProfiler {
    constructor(address registry) public Proxy(registry) {}

    function execMock(address to, bytes memory data)
        public
        payable
        returns (bytes memory result)
    {
        cache.setSender(msg.sender);
        _setBase();
        result = _exec(to, data);
        _setPostProcess(to);
        _deltaGas("Gas");
        _postProcess();
        return result;
    }

    function updateTokenMock(address token) public {
        cache.setAddress(token);
    }
}
