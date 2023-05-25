const metis = require('../../deploy/utils/addresses_metis');

module.exports = {
  NATIVE_TOKEN_ADDRESS: '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
  NATIVE_TOKEN_DECIMAL: 18,

  NATIVE_TOKEN_ADDRESS_PROXY: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',

  /* Wrapped Native Token */
  WRAPPED_NATIVE_TOKEN: metis.WRAPPED_NATIVE_TOKEN,

  /* WETH */
  WETH_TOKEN: '0x420000000000000000000000000000000000000A',

  /* MDAI */
  DAI_TOKEN: '0x4c078361FC9BbB78DF910800A991C7c3DD2F6ce0',
  ADAI_V3_TOKEN: '0x85ABAdDcae06efee2CB5F75f33b6471759eFDE24',
  ADAI_V3_DEBT_STABLE: '0xf1cd706E177F3AEa620c722Dc436B5a2066E4C68',
  ADAI_V3_DEBT_VARIABLE: '0x13Bd89aF338f3c7eAE9a75852fC2F1ca28B4DDbF',

  /* LINK */
  LINK_TOKEN: '0x79892E8A3Aea66C8F6893fa49eC6208ef07EC046',

  /* MUSDT */
  USDT_TOKEN: '0xbB06DCA3AE6887fAbF931640f67cab3e3a16F4dC',

  /* MUSDC */
  USDC_TOKEN: '0xEA32A96608495e54156Ae48931A7c20f0dcc1a21',
  AUSDC_V3_TOKEN: '0x885C8AEC5867571582545F894A5906971dB9bf27',
  AUSDC_V3_DEBT_VARIABLE: '0x571171a7EF1e3c8c83d47EF1a50E225E9c351380',

  /* WETH */
  WETH_TOKEN: '0x420000000000000000000000000000000000000A',

  /* MAI */
  MAI_TOKEN: '0xdFA46478F9e5EA86d57387849598dbFB2e964b02',

  /* STG */
  STG_TOKEN: metis.STARGATE_TOKEN,

  /* AAVE Interest Rate Mode */
  AAVE_RATEMODE: { NODEBT: 0, STABLE: 1, VARIABLE: 2 },

  /* Services */
  AAVEPROTOCOL_V3_PROVIDER: metis.AAVEPROTOCOL_V3_PROVIDER,
  HUMMUS_ROUTER01: metis.HUMMUS_ROUTER01,
  HUMMUS_POOL_USDT_USDC_DAI: '0x248fD66e6ED1E0B325d7b80F5A7e7d8AA2b2528b',
  HUMMUS_POOL_USDC_MAI: '0x5b7e71F6364DA1716c44a5278098bc46711b9516',
  STARGATE_PARTNER_ID: metis.STARGATE_PARTNER_ID,
  STARGATE_ROUTER: metis.STARGATE_ROUTER,
  STARGATE_ROUTER_ETH: metis.STARGATE_ROUTER_ETH,
  STARGATE_FACTORY: metis.STARGATE_FACTORY,
  STARGATE_WIDGET_SWAP: metis.STARGATE_WIDGET_SWAP,
  STARGATE_POOL_USDT: '0x2b60473a7C41Deb80EDdaafD5560e963440eb632',
  STARGATE_DESTINATION_CHAIN_ID: 101, // Ethereum
  STARGATE_STABLE_TO_DISALLOW_TOKEN_ID: 3, // DAI
  LAYERZERO_ENDPOINT: '0x9740FF91F1985D8d2B71494aE1A2f723bb3Ed9E4',
  MAIA_ROUTER: '0x07Da720AD5E434971dbe77C7fC85b7b44d5aC704',
  MAIA_QUOTER: '0x2db8b665CE6928F9D1a7f83F4C6aCEA64Af6a6f6',
  MAIA_FACTORY: '0xf5fd18Cd5325904cC7141cB9Daca1F2F964B9927',

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
};
