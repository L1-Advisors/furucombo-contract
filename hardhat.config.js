require('@nomiclabs/hardhat-waffle');
require('hardhat-deploy');
require('hardhat-deploy-ethers');
require('solidity-coverage');
// Truffle and Web3.js plugin
require('@nomiclabs/hardhat-web3');
require('@nomiclabs/hardhat-truffle5');
require('@nomiclabs/hardhat-etherscan');

require('dotenv').config();
require('@xplorfin/hardhat-solc-excludes');

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.10',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
    overrides: {
      'contracts/handlers/maker/dapphub/DSAuth.sol': {
        version: '0.6.12',
      },
      'contracts/handlers/maker/dapphub/DSGuard.sol': {
        version: '0.6.12',
      },
      'contracts/handlers/maker/dapphub/DSGuardFactory.sol': {
        version: '0.6.12',
      },
    },
    excludes: { directories: ['test/foundry'] },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.RPC_URL || 'https://rpc.ankr.com/eth',
        ignoreUnknownTxType: true,
      },
      chainId: Number(process.env.CHAIN_ID) || 1,
      accounts: {
        mnemonic:
          'dice shove sheriff police boss indoor hospital vivid tenant method game matter',
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
      },
      initialBaseFeePerGas: 0,
      gasPrice: 0,
      gas: 30000000,
    },
    ethBeta: {
      url: process.env.ETH_BETA_RPC_URL || 'https://geth-beta.furucombo.app',
      accounts: accounts(process.env.ETH_BETA_SECRET),
    },
    eth: {
      url: process.env.ETH_RPC_URL || 'https://rpc.ankr.com/eth',
      accounts: accounts(process.env.ETH_SECRET),
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || 'https://rpc.ankr.com/optimism',
      accounts: accounts(process.env.OPTIMISM_SECRET),
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || 'https://rpc.ankr.com/polygon',
      accounts: accounts(process.env.POLYGON_SECRET),
    },
    fantom: {
      url: process.env.FANTOM_RPC_URL || 'https://rpc.ankr.com/fantom',
      accounts: accounts(process.env.FANTOM_SECRET),
    },
    metis: {
      url:
        process.env.METIS_RPC_URL || 'https://andromeda.metis.io/?owner=1088',
      accounts: accounts(process.env.METIS_SECRET),
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      accounts: accounts(process.env.ARBITRUM_SECRET),
    },
    avalanche: {
      url:
        process.env.AVALANCHE_RPC_URL ||
        'https://api.avax.network/ext/bc/C/rpc',
      accounts: accounts(process.env.AVALANCHE_SECRET),
    },
  },
  mocha: {
    timeout: 900000,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY || '',
  },
};

function accounts(envKey) {
  return envKey !== undefined ? [envKey] : [];
}
