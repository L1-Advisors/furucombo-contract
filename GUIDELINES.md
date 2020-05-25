# Guidelines

## Design guidelines

### Proxy

Proxy contract does not hold user data. Any modification to proxy contract should be as general as possible. Avoid modifying proxy contract to meet the need of specific Dapp.

### Registry

Registry contract provides storage for an address to bytes32 dictionary. Similar to the idea of designing proxy, avoid unnecessary modifications for specific service integration.

### Handler

Handler plays the main role to interact with external services. Remember the code of handler will be executed from proxy through a **delegate call**.

## Style guidelines

Code will be refined through **prettier** before commit.

### General

#### Default to Solidity's official style guide

Follow the official [solidity style guide](https://solidity.readthedocs.io/en/latest/style-guide.html).

#### Handler naming

A new folder named after the service name should be created in `contracts/handlers`. The handler's file name and the contract name should be identical, begins with a uppercase H, such as `contracts/handlers/furucombo/HFurucombo.sol`. To interact with external service, you may import the interface in an independent file. The file name and the contract name should be identical and begins with an uppercase I, such as `contracts/handlers/furucombo/IFurucombo.sol`.

#### Handler implementation

Every handler should inherit [HandlerBase](https://garage.dinngo.co/hackathon-black/legocontract/blob/develop/contracts/handlers/HandlerBase.sol). If a new token will involve after the interaction with the external service, be sure to update the token list through `_updateToken()`.
External parameters should be declared as constant.
Handler functions should be declared as **payable** no matter it deals with ether or not.
Failed external service calls should always be reverted.

### Tests

#### Tests should always be implemented

Tests should be short and capable to present the function of handlers.

#### Tests must not be random

Tests will be ran under the snapshot of current mainnet, which means that the chain status will not be always the same. However, the test should not fail and should be as robust as possible.