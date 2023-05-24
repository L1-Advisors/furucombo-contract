const chainId = network.config.chainId;

const {
  balance,
  BN,
  constants,
  ether,
  expectEvent,
} = require('@openzeppelin/test-helpers');
const { tracker } = balance;
const { ZERO_BYTES32 } = constants;
const abi = require('ethereumjs-abi');
const utils = web3.utils;

const { expect } = require('chai');

const {
  DAI_TOKEN,
  USDT_TOKEN,
  WETH_TOKEN,
  HBTC_TOKEN,
  HBTC_PROVIDER,
  OMG_TOKEN,
  OMG_PROVIDER,
  NATIVE_TOKEN_ADDRESS,
  NATIVE_TOKEN_ADDRESS_PROXY,
  LINK_TOKEN,
} = require('./utils/constants');
const {
  evmRevert,
  evmSnapshot,
  checkCacheClean,
  getBalanceSlotNum,
  setTokenBalance,
  impersonateAndInjectEther,
} = require('./utils/utils');

const Proxy = artifacts.require('Proxy');
const Registry = artifacts.require('Registry');
const FeeRuleRegistry = artifacts.require('FeeRuleRegistry');
const RuleMock1 = artifacts.require('RuleMock1');
const RuleMock2 = artifacts.require('RuleMock2');
const FeeCollectorMock = artifacts.require('FeeCollectorMock');
const HFunds = artifacts.require('HFunds');
const IToken = artifacts.require('IERC20');
const IUsdt = artifacts.require('IERC20Usdt');

const BASE = ether('1');
const BASIS_FEE_RATE = ether('0.01'); // 1%
const RULE1_DISCOUNT = ether('0.9'); // should match DISCOUNT of RuleMock1
const RULE2_DISCOUNT = ether('0.8'); // should match DISCOUNT of RuleMock2
const RULE1_REQUIREMENT = ether('50'); // should match the verify requirement in RuleMock1

contract('Fee', function ([_, feeCollector, user]) {
  const tokenAddress = DAI_TOKEN;
  const token2Address = WETH_TOKEN;

  const rule1TokenAddress = LINK_TOKEN;

  const ethAmount = ether('10');
  const tokenAmount = ether('100');
  const token2Amount = ether('10');
  const usdtAmount = new BN('100000000'); // 100 usdt
  const hbtcAmount = ether('1');
  const omgAmount = ether('10');

  let id;
  let beforeId;
  let balanceUser;
  let balanceProxy;
  let balanceFeeCollector;

  before(async function () {
    beforeId = await evmSnapshot();

    // Handlers related
    this.registry = await Registry.new();
    this.hFunds = await HFunds.new();
    await this.registry.register(
      this.hFunds.address,
      utils.asciiToHex('Funds')
    );

    // Fee related
    this.feeRuleRegistry = await FeeRuleRegistry.new(
      BASIS_FEE_RATE,
      feeCollector
    );
    this.rule1 = await RuleMock1.new(rule1TokenAddress);
    this.rule2 = await RuleMock2.new();
    this.feeCollectorMock = await FeeCollectorMock.new();
    await this.feeRuleRegistry.registerRule(this.rule1.address);
    await this.feeRuleRegistry.registerRule(this.rule2.address);

    // Deploy proxy
    this.proxy = await Proxy.new(
      this.registry.address,
      this.feeRuleRegistry.address
    );

    // Prepare
    this.token = await IToken.at(tokenAddress);
    const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
    await setTokenBalance(
      this.token.address,
      user,
      tokenAmount,
      DAI_BALANCE_SLOT_NUM
    );

    await this.token.approve(this.proxy.address, tokenAmount, { from: user });
    this.rule1Token = await IToken.at(rule1TokenAddress);
    const LINK_BALANCE_SLOT_NUM = getBalanceSlotNum('LINK', chainId);
    await setTokenBalance(
      this.rule1Token.address,
      user,
      RULE1_REQUIREMENT,
      LINK_BALANCE_SLOT_NUM
    );

    // Prepare token
    this.token2 = await IToken.at(token2Address);
    const TOKEN2_BALANCE_SLOT_NUM = getBalanceSlotNum('WETH', chainId);
    await setTokenBalance(
      this.token2.address,
      user,
      token2Amount,
      TOKEN2_BALANCE_SLOT_NUM
    );
    await this.token2.approve(this.proxy.address, token2Amount, { from: user });

    this.usdt = await IUsdt.at(USDT_TOKEN);
    const USDT_BALANCE_SLOT_NUM = getBalanceSlotNum('USDT', chainId);
    await setTokenBalance(
      this.usdt.address,
      user,
      usdtAmount,
      USDT_BALANCE_SLOT_NUM
    );
    await this.usdt.approve(this.proxy.address, usdtAmount, { from: user });

    if (chainId == 1) {
      impersonateAndInjectEther(HBTC_PROVIDER);
      this.hbtc = await IToken.at(HBTC_TOKEN);
      await this.hbtc.transfer(user, hbtcAmount, { from: HBTC_PROVIDER });
      await this.hbtc.approve(this.proxy.address, hbtcAmount, { from: user });

      impersonateAndInjectEther(OMG_PROVIDER);
      this.omg = await IToken.at(OMG_TOKEN);
      await this.omg.transfer(user, omgAmount, { from: OMG_PROVIDER });
      await this.omg.approve(this.proxy.address, omgAmount, { from: user });
    }
  });

  beforeEach(async function () {
    id = await evmSnapshot();
    balanceUser = await tracker(user);
    balanceProxy = await tracker(this.proxy.address);
    balanceFeeCollector = await tracker(feeCollector);
  });

  afterEach(async function () {
    await checkCacheClean(this.proxy.address);
    await evmRevert(id);
  });

  after(async function () {
    await evmRevert(beforeId);
  });

  describe('single token', function () {
    it('eth - fee collector (EOA)', async function () {
      const tos = [this.hFunds.address];
      const configs = [ZERO_BYTES32];
      const ruleIndexes = ['0', '1'];
      const datas = [
        abi.simpleEncode('send(uint256,address)', ether('0'), user),
      ];

      const receipt = await this.proxy.batchExec(
        tos,
        configs,
        datas,
        ruleIndexes,
        {
          from: user,
          value: ethAmount,
        }
      );

      const feeRateUser = BASIS_FEE_RATE.mul(RULE1_DISCOUNT)
        .div(BASE)
        .mul(RULE2_DISCOUNT)
        .div(BASE);
      const feeETH = ethAmount.mul(feeRateUser).div(BASE);

      expectEvent(receipt, 'ChargeFee', {
        tokenIn:
          chainId == 1088 ? NATIVE_TOKEN_ADDRESS_PROXY : NATIVE_TOKEN_ADDRESS,
        feeAmount: feeETH,
      });

      // Fee collector
      expect(await balanceFeeCollector.delta()).to.be.bignumber.eq(feeETH);
      // Proxy
      expect(await balanceProxy.delta()).to.be.zero;
      // User
      expect(await balanceUser.delta()).to.be.bignumber.eq(
        ether('0').sub(feeETH)
      );
    });

    it('eth - fee collector (Contract)', async function () {
      await this.feeRuleRegistry.setFeeCollector(this.feeCollectorMock.address);
      balanceFeeCollector = await tracker(this.feeCollectorMock.address);

      const tos = [this.hFunds.address];
      const configs = [ZERO_BYTES32];
      const ruleIndexes = ['0', '1'];
      const datas = [
        abi.simpleEncode('send(uint256,address)', ether('0'), user),
      ];
      const receipt = await this.proxy.batchExec(
        tos,
        configs,
        datas,
        ruleIndexes,
        {
          from: user,
          value: ethAmount,
        }
      );
      const feeRateUser = BASIS_FEE_RATE.mul(RULE1_DISCOUNT)
        .div(BASE)
        .mul(RULE2_DISCOUNT)
        .div(BASE);
      const feeETH = ethAmount.mul(feeRateUser).div(BASE);

      expectEvent(receipt, 'ChargeFee', {
        tokenIn:
          chainId == 1088 ? NATIVE_TOKEN_ADDRESS_PROXY : NATIVE_TOKEN_ADDRESS,
        feeAmount: feeETH,
      });

      // Fee collector
      expect(await balanceFeeCollector.delta()).to.be.bignumber.eq(feeETH);
      // Proxy
      expect(await balanceProxy.delta()).to.be.zero;
      // User
      expect(await balanceUser.delta()).to.be.bignumber.eq(
        ether('0').sub(feeETH)
      );
    });

    it('DAI', async function () {
      const tos = [this.hFunds.address];
      const configs = [ZERO_BYTES32];
      const ruleIndexes = ['0', '1'];
      const datas = [
        abi.simpleEncode(
          'inject(address[],uint256[])',
          [tokenAddress],
          [tokenAmount]
        ),
      ];
      const receipt = await this.proxy.batchExec(
        tos,
        configs,
        datas,
        ruleIndexes,
        {
          from: user,
        }
      );
      const feeRateUser = BASIS_FEE_RATE.mul(RULE1_DISCOUNT)
        .div(BASE)
        .mul(RULE2_DISCOUNT)
        .div(BASE);
      const feeToken = tokenAmount.mul(feeRateUser).div(BASE);

      // Verify event
      await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
        tokenIn: tokenAddress,
        feeAmount: feeToken,
      });

      // Fee collector
      expect(await balanceFeeCollector.delta()).to.be.zero;
      expect(await this.token.balanceOf.call(feeCollector)).to.be.bignumber.eq(
        feeToken
      );
      // Proxy
      expect(await balanceProxy.delta()).to.be.zero;
      expect(await this.token.balanceOf.call(this.proxy.address)).to.be.zero;
      // User
      expect(await balanceUser.delta()).to.be.bignumber.eq(ether('0'));
      expect(await this.token.balanceOf.call(user)).to.be.bignumber.eq(
        tokenAmount.sub(feeToken)
      );
    });

    it('USDT', async function () {
      const tos = [this.hFunds.address];
      const configs = [ZERO_BYTES32];
      const ruleIndexes = ['0', '1'];
      const datas = [
        abi.simpleEncode(
          'inject(address[],uint256[])',
          [USDT_TOKEN],
          [usdtAmount]
        ),
      ];
      const receipt = await this.proxy.batchExec(
        tos,
        configs,
        datas,
        ruleIndexes,
        {
          from: user,
        }
      );
      const feeRateUser = BASIS_FEE_RATE.mul(RULE1_DISCOUNT)
        .mul(RULE2_DISCOUNT)
        .div(BASE)
        .div(BASE);
      const feeToken = usdtAmount.mul(feeRateUser).div(BASE);

      // Verify event
      await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
        tokenIn: USDT_TOKEN,
        feeAmount: feeToken,
      });

      // Fee collector
      expect(await balanceFeeCollector.delta()).to.be.zero;
      expect(await this.usdt.balanceOf.call(feeCollector)).to.be.bignumber.eq(
        feeToken
      );
      // Proxy
      expect(await balanceProxy.delta()).to.be.zero;
      expect(await this.usdt.balanceOf.call(this.proxy.address)).to.be.zero;
      // User
      expect(await balanceUser.delta()).to.be.bignumber.eq(ether('0'));
      expect(await this.usdt.balanceOf.call(user)).to.be.bignumber.eq(
        usdtAmount.sub(feeToken)
      );
    });

    if (chainId == 1) {
      it('HBTC', async function () {
        const tos = [this.hFunds.address];
        const configs = [ZERO_BYTES32];
        const ruleIndexes = ['0', '1'];
        const datas = [
          abi.simpleEncode(
            'inject(address[],uint256[])',
            [HBTC_TOKEN],
            [hbtcAmount]
          ),
        ];
        const receipt = await this.proxy.batchExec(
          tos,
          configs,
          datas,
          ruleIndexes,
          {
            from: user,
          }
        );
        const feeRateUser = BASIS_FEE_RATE.mul(RULE1_DISCOUNT)
          .div(BASE)
          .mul(RULE2_DISCOUNT)
          .div(BASE);
        const feeToken = hbtcAmount.mul(feeRateUser).div(BASE);

        // Verify event
        await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
          tokenIn: HBTC_TOKEN,
          feeAmount: feeToken,
        });

        // Fee collector
        expect(await balanceFeeCollector.delta()).to.be.zero;
        expect(await this.hbtc.balanceOf.call(feeCollector)).to.be.bignumber.eq(
          feeToken
        );
        // Proxy
        expect(await balanceProxy.delta()).to.be.zero;
        expect(await this.hbtc.balanceOf.call(this.proxy.address)).to.be.zero;
        // User
        expect(await balanceUser.delta()).to.be.bignumber.eq(ether('0'));
        expect(await this.hbtc.balanceOf.call(user)).to.be.bignumber.eq(
          hbtcAmount.sub(feeToken)
        );
      });

      it('OMG', async function () {
        const tos = [this.hFunds.address];
        const configs = [ZERO_BYTES32];
        const ruleIndexes = ['0', '1'];
        const datas = [
          abi.simpleEncode(
            'inject(address[],uint256[])',
            [OMG_TOKEN],
            [omgAmount]
          ),
        ];
        const receipt = await this.proxy.batchExec(
          tos,
          configs,
          datas,
          ruleIndexes,
          {
            from: user,
          }
        );
        const feeRateUser = BASIS_FEE_RATE.mul(RULE1_DISCOUNT)
          .div(BASE)
          .mul(RULE2_DISCOUNT)
          .div(BASE);
        const feeToken = omgAmount.mul(feeRateUser).div(BASE);

        // Verify event
        await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
          tokenIn: OMG_TOKEN,
          feeAmount: feeToken,
        });

        // Fee collector
        expect(await balanceFeeCollector.delta()).to.be.zero;
        expect(await this.omg.balanceOf.call(feeCollector)).to.be.bignumber.eq(
          feeToken
        );
        // Proxy
        expect(await balanceProxy.delta()).to.be.zero;
        expect(await this.omg.balanceOf.call(this.proxy.address)).to.be.zero;
        // User
        expect(await balanceUser.delta()).to.be.bignumber.eq(ether('0'));
        expect(await this.omg.balanceOf.call(user)).to.be.bignumber.eq(
          omgAmount.sub(feeToken)
        );
      });
    }
  });

  describe('multiple token', function () {
    it('eth + token -> no index', async function () {
      const tos = [this.hFunds.address];
      const configs = [ZERO_BYTES32];
      const ruleIndexes = [];
      const datas = [
        abi.simpleEncode(
          'inject(address[],uint256[])',
          [tokenAddress],
          [tokenAmount]
        ),
      ];
      const receipt = await this.proxy.batchExec(
        tos,
        configs,
        datas,
        ruleIndexes,
        {
          from: user,
          value: ethAmount,
        }
      );
      const feeRateUser = BASIS_FEE_RATE;
      const feeETH = ethAmount.mul(feeRateUser).div(BASE);
      const feeToken = tokenAmount.mul(feeRateUser).div(BASE);

      // Verify event
      await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
        tokenIn:
          chainId == 1088 ? NATIVE_TOKEN_ADDRESS_PROXY : NATIVE_TOKEN_ADDRESS,
        feeAmount: feeETH,
      });

      // Verify event
      await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
        tokenIn: tokenAddress,
        feeAmount: feeToken,
      });

      // Fee collector
      expect(await balanceFeeCollector.delta()).to.be.bignumber.eq(feeETH);
      expect(await this.token.balanceOf.call(feeCollector)).to.be.bignumber.eq(
        feeToken
      );
      // Proxy
      expect(await balanceProxy.delta()).to.be.zero;
      expect(await this.token.balanceOf.call(this.proxy.address)).to.be.zero;
      // User
      expect(await balanceUser.delta()).to.be.bignumber.eq(
        ether('0').sub(feeETH)
      );
      expect(await this.token.balanceOf.call(user)).to.be.bignumber.eq(
        tokenAmount.sub(feeToken)
      );
    });

    it('eth + token', async function () {
      const tos = [this.hFunds.address];
      const configs = [ZERO_BYTES32];
      const ruleIndexes = ['0', '1'];
      const datas = [
        abi.simpleEncode(
          'inject(address[],uint256[])',
          [tokenAddress],
          [tokenAmount]
        ),
      ];
      const receipt = await this.proxy.batchExec(
        tos,
        configs,
        datas,
        ruleIndexes,
        {
          from: user,
          value: ethAmount,
        }
      );
      const feeRateUser = BASIS_FEE_RATE.mul(RULE1_DISCOUNT)
        .div(BASE)
        .mul(RULE2_DISCOUNT)
        .div(BASE);
      const feeETH = ethAmount.mul(feeRateUser).div(BASE);
      const feeToken = tokenAmount.mul(feeRateUser).div(BASE);

      // Verify event
      await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
        tokenIn:
          chainId == 1088 ? NATIVE_TOKEN_ADDRESS_PROXY : NATIVE_TOKEN_ADDRESS,
        feeAmount: feeETH,
      });

      // Verify event
      await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
        tokenIn: tokenAddress,
        feeAmount: feeToken,
      });

      // Fee collector
      expect(await balanceFeeCollector.delta()).to.be.bignumber.eq(feeETH);
      expect(await this.token.balanceOf.call(feeCollector)).to.be.bignumber.eq(
        feeToken
      );
      // Proxy
      expect(await balanceProxy.delta()).to.be.zero;
      expect(await this.token.balanceOf.call(this.proxy.address)).to.be.zero;
      // User
      expect(await balanceUser.delta()).to.be.bignumber.eq(
        ether('0').sub(feeETH)
      );
      expect(await this.token.balanceOf.call(user)).to.be.bignumber.eq(
        tokenAmount.sub(feeToken)
      );
    });

    it('token + token', async function () {
      const tos = [this.hFunds.address];
      const configs = [ZERO_BYTES32];
      const ruleIndexes = ['0', '1'];
      const datas = [
        abi.simpleEncode(
          'inject(address[],uint256[])',
          [tokenAddress, token2Address],
          [tokenAmount, token2Amount]
        ),
      ];

      const token2UserBalanceBefore = await this.token2.balanceOf.call(user);

      const receipt = await this.proxy.batchExec(
        tos,
        configs,
        datas,
        ruleIndexes,
        {
          from: user,
        }
      );

      const feeRateUser = BASIS_FEE_RATE.mul(RULE1_DISCOUNT)
        .div(BASE)
        .mul(RULE2_DISCOUNT)
        .div(BASE);
      const feeToken = tokenAmount.mul(feeRateUser).div(BASE);
      const feeToken2 = token2Amount.mul(feeRateUser).div(BASE);

      // Verify event
      await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
        tokenIn: tokenAddress,
        feeAmount: feeToken,
      });

      // Verify event
      await expectEvent.inTransaction(receipt.tx, this.proxy, 'ChargeFee', {
        tokenIn: token2Address,
        feeAmount: feeToken2,
      });

      // Fee collector
      expect(await this.token.balanceOf.call(feeCollector)).to.be.bignumber.eq(
        feeToken
      );
      expect(await this.token2.balanceOf.call(feeCollector)).to.be.bignumber.eq(
        feeToken2
      );
      // Proxy
      expect(await this.token.balanceOf.call(this.proxy.address)).to.be.zero;
      expect(await this.token2.balanceOf.call(this.proxy.address)).to.be.zero;
      // User
      expect(await balanceUser.delta()).to.be.bignumber.eq(ether('0'));
      expect(await this.token.balanceOf.call(user)).to.be.bignumber.eq(
        tokenAmount.sub(feeToken)
      );
      expect(
        (await this.token2.balanceOf.call(user)).add(feeToken2)
      ).to.be.bignumber.eq(token2UserBalanceBefore);
    });

    it('zero fee', async function () {
      // Set basis fee rate to 0
      await this.feeRuleRegistry.setBasisFeeRate(ether('0'));
      expect(await this.feeRuleRegistry.basisFeeRate.call()).to.be.zero;

      const tos = [this.hFunds.address];
      const configs = [ZERO_BYTES32];
      const ruleIndexes = ['0', '1'];
      const datas = [
        abi.simpleEncode(
          'inject(address[],uint256[])',
          [tokenAddress],
          [tokenAmount]
        ),
      ];
      const receipt = await this.proxy.batchExec(
        tos,
        configs,
        datas,
        ruleIndexes,
        {
          from: user,
          value: ethAmount,
        }
      );
      // Fee collector
      expect(await balanceFeeCollector.delta()).to.be.zero;
      expect(await this.token.balanceOf.call(feeCollector)).to.be.zero;
      // Proxy
      expect(await balanceProxy.delta()).to.be.zero;
      expect(await this.token.balanceOf.call(this.proxy.address)).to.be.zero;
      // User
      expect(await balanceUser.delta()).to.be.bignumber.eq(ether('0'));
      expect(await this.token.balanceOf.call(user)).to.be.bignumber.eq(
        tokenAmount
      );
    });
  });
});
