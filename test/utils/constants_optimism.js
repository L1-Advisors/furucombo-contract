const optimism = require('../../deploy/utils/addresses_optimism');

module.exports = {
  NATIVE_TOKEN_ADDRESS: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  NATIVE_TOKEN_DECIMAL: 18,

  /* Wrapped Native Token */
  WRAPPED_NATIVE_TOKEN: optimism.WRAPPED_NATIVE_TOKEN,
  AWRAPPED_NATIVE_V3_TOKEN: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
  AWRAPPED_NATIVE_V3_DEBT_VARIABLE:
    '0x0c84331e39d6658Cd6e6b9ba04736cC4c4734351',

  /* WETH */
  WETH_TOKEN: optimism.WRAPPED_NATIVE_TOKEN,
  AWETH_V3_TOKEN: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
  AWETH_V3_DEBT_STABLE: '0xD8Ad37849950903571df17049516a5CD4cbE55F6',
  AWETH_V3_DEBT_VARIABLE: '0x0c84331e39d6658Cd6e6b9ba04736cC4c4734351',

  /* DAI */
  DAI_TOKEN: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  ADAI_V3_TOKEN: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',
  ADAI_V3_DEBT_STABLE: '0xd94112B5B62d53C9402e7A60289c6810dEF1dC9B',
  ADAI_V3_DEBT_VARIABLE: '0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC',

  /* WBTC */
  WBTC_TOKEN: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',

  /* LINK */
  LINK_TOKEN: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',

  /* USDT */
  USDT_TOKEN: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',

  /* USDC */
  USDC_TOKEN: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
  AUSDC_V3_TOKEN: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
  AUSDC_V3_DEBT_STABLE: '0x307ffe186F84a3bc2613D1eA417A5737D69A7007',
  AUSDC_V3_DEBT_VARIABLE: '0xFCCf3cAbbe80101232d343252614b6A3eE81C989',

  /* COMP */
  COMP_TOKEN: '0xc00e94Cb662C3520282E6f5717214004A7f26888',

  /* STG */
  STG_TOKEN: optimism.STARGATE_TOKEN,

  /* AAVE Interest Rate Mode */
  AAVE_RATEMODE: { NODEBT: 0, STABLE: 1, VARIABLE: 2 },

  /* Services */
  AAVEPROTOCOL_V3_PROVIDER: optimism.AAVEPROTOCOL_V3_PROVIDER,
  UNISWAPV3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  UNISWAPV3_QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  UNISWAPV3_FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  STARGATE_PARTNER_ID: optimism.STARGATE_PARTNER_ID,
  STARGATE_ROUTER: optimism.STARGATE_ROUTER,
  STARGATE_ROUTER_ETH: optimism.STARGATE_ROUTER_ETH,
  STARGATE_FACTORY: optimism.STARGATE_FACTORY,
  STARGATE_WIDGET_SWAP: optimism.STARGATE_WIDGET_SWAP,
  STARGATE_VAULT_ETH: '0xb69c8cbcd90a39d8d3d3ccf0a3e968511c3856a0',
  STARGATE_POOL_USDC: '0xDecC0c09c3B5f6e92EF4184125D5648a66E35298',
  STARGATE_DESTINATION_CHAIN_ID: 110, // Arbitrum
  STARGATE_UNSUPPORT_ETH_DEST_CHAIN_ID: 109, // Polygon
  STARGATE_USDC_TO_DISALLOW_TOKEN_ID: 15, // LUSD
  LAYERZERO_ENDPOINT: '0x3c2269811836af69497E5F486A85D7316753cf62',

  /* Event Signature */
  RecordHandlerResultSig:
    '0x90c726ff5efa7268723ee48df835144384bc0f012e89750782886764b5e54f16',

  // Handler Type
  HANDLER_TYPE: { TOKEN: 0, CUSTOM: 1, OTHERS: 2 },

  // Fee
  STORAGE_KEY_MSG_SENDER:
    '0xb2f2618cecbbb6e7468cc0f2aa43858ad8d153e0280b22285e28e853bb9d453a',
  STORAGE_KEY_CUBE_COUNTER:
    '0xf9543f11459ccccd21306c8881aaab675ff49d988c1162fd1dd9bbcdbe4446be',
  STORAGE_KEY_FEE_RATE:
    '0x142183525227cae0e4300fd0fc77d7f3b08ceb0fd9cb2a6c5488668fa0ea5ffa',
  STORAGE_KEY_FEE_COLLECTOR:
    '0x60d7a7cc0a45d852bd613e4f527aaa2e4b81fff918a69a2aab88b6458751d614',

  // Star NFT v4
  STAR_NFTV4: optimism.FREE_PASS,
};
