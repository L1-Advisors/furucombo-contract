const { BN, ether } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const abi = require('ethereumjs-abi');
const utils = web3.utils;
const {
  DAI_TOKEN,
  USDT_TOKEN,
  TUSD_TOKEN,
  SUSD_TOKEN,
  WBTC_TOKEN,
  RENBTC_TOKEN,
  DAI_PROVIDER,
  USDT_PROVIDER,
  SUSD_PROVIDER,
  WBTC_PROVIDER,
  RENBTC_PROVIDER,
  CURVE_Y_SWAP,
  CURVE_Y_DEPOSIT,
  CURVE_SBTC_SWAP,
  CURVE_ONE_SPLIT,
  CURVE_YCRV,
  CURVE_SBTCCRV,
  CURVE_YDAI_TOKEN,
  CURVE_YUSDT_TOKEN,
} = require('./utils/constants');
const { resetAccount, profileGas } = require('./utils/utils');

const Proxy = artifacts.require('ProxyMock');
const Registry = artifacts.require('Registry');
const HCurve = artifacts.require('HCurve');
const ICurveSwap = artifacts.require('ICurveSwap');
const ICurveDeposit = artifacts.require('ICurveDeposit');
const IOneSplit = artifacts.require('IOneSplit');
const IToken = artifacts.require('IERC20');
const IYToken = artifacts.require('IYToken');

contract('Curve', function([_, deployer, user]) {
  before(async function() {
    this.registry = await Registry.new();
    this.hcurve = await HCurve.new();
    await this.registry.register(
      this.hcurve.address,
      utils.asciiToHex('HCurve')
    );
    this.proxy = await Proxy.new(this.registry.address);
    this.yswap = await ICurveSwap.at(CURVE_Y_SWAP);
    this.ydeposit = await ICurveDeposit.at(CURVE_Y_DEPOSIT);
    this.sbtcswap = await ICurveSwap.at(CURVE_SBTC_SWAP);
    this.onesplit = await IOneSplit.at(CURVE_ONE_SPLIT);
  });

  beforeEach(async function() {
    await resetAccount(_);
    await resetAccount(user);
  });

  describe('Exchange underlying', function() {
    const token0Address = USDT_TOKEN;
    const token1Address = DAI_TOKEN;
    const providerAddress = USDT_PROVIDER;

    let token0User;
    let token1User;

    before(async function() {
      this.token0 = await IToken.at(token0Address);
      this.token1 = await IToken.at(token1Address);
    });

    beforeEach(async function() {
      token0User = await this.token0.balanceOf.call(user);
      token1User = await this.token1.balanceOf.call(user);
    });

    describe('y pool', function() {
      it('Exact input swap USDT to DAI by exchangeUnderlying', async function() {
        const value = new BN('1000000');
        const answer = await this.yswap.get_dy_underlying.call(2, 0, value, {
          from: user,
        });
        const data = abi.simpleEncode(
          'exchangeUnderlying(address,int128,int128,uint256,uint256)',
          this.yswap.address,
          2,
          0,
          value,
          new BN('1')
        );
        await this.token0.transfer(this.proxy.address, value, {
          from: providerAddress,
        });
        await this.proxy.updateTokenMock(this.token0.address);
        const receipt = await this.proxy.execMock(this.hcurve.address, data, {
          from: user,
          value: ether('1'), // Ensure handler can correctly deal with ether
        });
        expect(
          await this.token0.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.token1.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(await this.token0.balanceOf.call(user)).to.be.bignumber.eq(
          token0User
        );
        // get_dy_underlying flow is different from exchange_underlying,
        // so give 1*10^12 tolerance for USDT/DAI case.
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.gte(
          token1User.add(answer).sub(new BN('1000000000000'))
        );
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.lte(
          token1User.add(answer)
        );
        profileGas(receipt);
      });
    });
  });

  describe('Exchange', function() {
    const token0Address = WBTC_TOKEN;
    const token1Address = RENBTC_TOKEN;
    const providerAddress = WBTC_PROVIDER;

    let token0User;
    let token1User;

    before(async function() {
      this.token0 = await IToken.at(token0Address);
      this.token1 = await IToken.at(token1Address);
    });

    beforeEach(async function() {
      token0User = await this.token0.balanceOf.call(user);
      token1User = await this.token1.balanceOf.call(user);
    });

    describe('sbtc pool', function() {
      it('Exact input swap WBTC to renBTC by exchange', async function() {
        const value = new BN('100000000');
        const answer = await this.sbtcswap.get_dy.call(1, 0, value, {
          from: user,
        });
        const data = abi.simpleEncode(
          'exchange(address,int128,int128,uint256,uint256)',
          this.sbtcswap.address,
          1,
          0,
          value,
          new BN('1')
        );
        await this.token0.transfer(this.proxy.address, value, {
          from: providerAddress,
        });
        await this.proxy.updateTokenMock(this.token0.address);
        const receipt = await this.proxy.execMock(this.hcurve.address, data, {
          from: user,
          value: ether('1'), // Ensure handler can correctly deal with ether
        });
        expect(
          await this.token0.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.token1.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(await this.token0.balanceOf.call(user)).to.be.bignumber.eq(
          token0User
        );
        // get_dy flow is different from exchange,
        // so give 1 wei tolerance for WBTC/renBTC case.
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.gte(
          token1User.add(answer).sub(new BN('1'))
        );
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.lte(
          token1User.add(answer)
        );
        profileGas(receipt);
      });
    });
  });

  describe('OneSplit swap', function() {
    const token0Address = SUSD_TOKEN;
    const token1Address = TUSD_TOKEN;
    const providerAddress = SUSD_PROVIDER;

    let token0User;
    let token1User;

    before(async function() {
      this.token0 = await IToken.at(token0Address);
      this.token1 = await IToken.at(token1Address);
    });

    beforeEach(async function() {
      token0User = await this.token0.balanceOf.call(user);
      token1User = await this.token1.balanceOf.call(user);
    });

    describe('susd to y pool through onesplit', function() {
      it('Exact input swap sUSD to TUSD by OneSplit', async function() {
        const value = ether('1');
        const parts = new BN('2');
        const flags = 0x401e006d000;
        const answer = await this.onesplit.getExpectedReturn.call(
          this.token0.address,
          this.token1.address,
          value,
          parts,
          flags,
          {
            from: user,
          }
        );
        const data = abi.simpleEncode(
          'swap(address,address,uint256,uint256,uint256[],uint256)',
          this.token0.address,
          this.token1.address,
          value,
          new BN('1'),
          answer.distribution,
          flags
        );
        await this.token0.transfer(this.proxy.address, value, {
          from: providerAddress,
        });
        await this.proxy.updateTokenMock(this.token0.address);
        const receipt = await this.proxy.execMock(this.hcurve.address, data, {
          from: user,
          value: ether('1'), // Ensure handler can correctly deal with ether
        });
        expect(
          await this.token0.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.token1.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(await this.token0.balanceOf.call(user)).to.be.bignumber.eq(
          token0User
        );
        // oneSplit use sUSD and y pools in this case, give 10% tolerance
        // for sUSD/TUSD.
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.gte(
          token1User
            .add(answer.returnAmount)
            .sub(answer.returnAmount.div(new BN('10')))
        );
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.lte(
          token1User.add(answer.returnAmount)
        );
        profileGas(receipt);
      });
    });
  });

  describe('Liquidity', function() {
    const token0Address = RENBTC_TOKEN;
    const token1Address = WBTC_TOKEN;
    const provider0Address = RENBTC_PROVIDER;
    const provider1Address = WBTC_PROVIDER;
    const poolTokenAddress = CURVE_SBTCCRV;

    let token0User;
    let token1User;

    before(async function() {
      this.token0 = await IToken.at(token0Address);
      this.token1 = await IToken.at(token1Address);
      this.poolToken = await IToken.at(poolTokenAddress);
    });

    beforeEach(async function() {
      token0User = await this.token0.balanceOf.call(user);
      token1User = await this.token1.balanceOf.call(user);
    });

    describe('sbtc pool', function() {
      it('add renBTC and WBTC to pool by addLiquidity', async function() {
        const token0Amount = new BN('1000000');
        const token1Amount = new BN('2000000');
        const amounts = [token0Amount, token1Amount, 0];

        // Get expected answer
        const answer = await this.sbtcswap.methods[
          'calc_token_amount(uint256[3],bool)'
        ](amounts, true);

        // Execute handler
        await this.token0.transfer(this.proxy.address, token0Amount, {
          from: provider0Address,
        });
        await this.token1.transfer(this.proxy.address, token1Amount, {
          from: provider1Address,
        });
        await this.proxy.updateTokenMock(this.token0.address);
        await this.proxy.updateTokenMock(this.token1.address);
        const minMintAmount = new BN('1');
        const data = abi.simpleEncode(
          'addLiquidity(address,address,uint256[],uint256)',
          this.sbtcswap.address,
          this.poolToken.address,
          amounts,
          minMintAmount
        );
        const receipt = await this.proxy.execMock(this.hcurve.address, data, {
          from: user,
          value: ether('1'),
        });

        // Check proxy balance
        expect(
          await this.token0.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.token1.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.poolToken.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));

        // Check user balance
        expect(await this.token0.balanceOf.call(user)).to.be.bignumber.eq(
          token0User
        );
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.eq(
          token1User
        );

        // poolToken amount should be greater than answer * 0.999 which is
        // referenced from tests in curve contract.
        expect(await this.poolToken.balanceOf.call(user)).to.be.bignumber.gte(
          answer.mul(new BN('999')).div(new BN('1000'))
        );

        profileGas(receipt);
      });

      it('remove from pool to WBTC by removeLiquidityOneCoin', async function() {
        const token1UserBefore = await this.token1.balanceOf.call(user);
        const poolTokenUser = await this.poolToken.balanceOf.call(user);
        const answer = await this.sbtcswap.calc_withdraw_one_coin.call(
          poolTokenUser,
          1
        );
        await this.poolToken.transfer(this.proxy.address, poolTokenUser, {
          from: user,
        });
        await this.proxy.updateTokenMock(this.poolToken.address);
        const minAmount = new BN('1');
        const data = abi.simpleEncode(
          'removeLiquidityOneCoin(address,address,uint256,int128,uint256)',
          this.sbtcswap.address,
          this.poolToken.address,
          poolTokenUser,
          1,
          minAmount
        );
        const receipt = await this.proxy.execMock(this.hcurve.address, data, {
          from: user,
          value: ether('1'),
        });

        // Check proxy balance
        expect(
          await this.token1.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.poolToken.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));

        // amount should be <= answer * 1.001 and >= answer * 0.998 which is
        // referenced from tests in curve contract.
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.gte(
          token1UserBefore.add(answer.mul(new BN('998')).div(new BN('1000')))
        );
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.lte(
          token1UserBefore.add(answer.mul(new BN('1001')).div(new BN('1000')))
        );

        profileGas(receipt);
      });
    });
  });

  describe('Liquidity Zap', function() {
    const token0Address = DAI_TOKEN;
    const token1Address = USDT_TOKEN;
    const yToken0Address = CURVE_YDAI_TOKEN;
    const yToken1Address = CURVE_YUSDT_TOKEN;
    const provider0Address = DAI_PROVIDER;
    const provider1Address = USDT_PROVIDER;
    const poolTokenAddress = CURVE_YCRV;

    let token0User;
    let token1User;

    before(async function() {
      this.token0 = await IToken.at(token0Address);
      this.token1 = await IToken.at(token1Address);
      this.ytoken0 = await IYToken.at(yToken0Address);
      this.ytoken1 = await IYToken.at(yToken1Address);
      this.poolToken = await IToken.at(poolTokenAddress);
    });

    beforeEach(async function() {
      token0User = await this.token0.balanceOf.call(user);
      token1User = await this.token1.balanceOf.call(user);
    });

    describe('y pool', function() {
      it('add DAI and USDT to pool by addLiquidityZap', async function() {
        const token0Amount = ether('1000');
        const token1Amount = new BN('1000000000');

        // Get yToken amounts equivalent to underlying token inputs
        await this.token0.transfer(user, token0Amount, {
          from: provider0Address,
        });
        await this.token1.transfer(user, token1Amount, {
          from: provider1Address,
        });
        await this.token0.approve(this.ytoken0.address, token0Amount, {
          from: user,
        });
        await this.token1.approve(this.ytoken1.address, token1Amount, {
          from: user,
        });
        await this.ytoken0.deposit(token0Amount, {
          from: user,
        });
        await this.ytoken1.deposit(token1Amount, {
          from: user,
        });

        // Get expected answer
        const answer = await this.yswap.methods[
          'calc_token_amount(uint256[4],bool)'
        ](
          [
            await this.ytoken0.balanceOf.call(user), // yDAI
            0, // yUSDC
            await this.ytoken1.balanceOf.call(user), // yUSDT
            0, // yTUSD
          ],
          true
        );

        // Execute handler
        await this.token0.transfer(this.proxy.address, token0Amount, {
          from: provider0Address,
        });
        await this.token1.transfer(this.proxy.address, token1Amount, {
          from: provider1Address,
        });
        await this.proxy.updateTokenMock(this.token0.address);
        await this.proxy.updateTokenMock(this.token1.address);
        const amounts = [token0Amount, 0, token1Amount, 0];
        const minMintAmount = new BN('1');
        const data = abi.simpleEncode(
          'addLiquidityZap(address,uint256[],uint256)',
          this.ydeposit.address,
          amounts,
          minMintAmount
        );
        const receipt = await this.proxy.execMock(this.hcurve.address, data, {
          from: user,
          value: ether('1'),
        });

        // Check proxy balance
        expect(
          await this.token0.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.token1.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.poolToken.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));

        // Check user balance
        expect(await this.token0.balanceOf.call(user)).to.be.bignumber.eq(
          token0User
        );
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.eq(
          token1User
        );

        // poolToken amount should be greater than answer * 0.999 which is
        // referenced from tests in curve contract.
        expect(await this.poolToken.balanceOf.call(user)).to.be.bignumber.gte(
          answer.mul(new BN('999')).div(new BN('1000'))
        );

        profileGas(receipt);
      });

      it('remove from pool to USDT by removeLiquidityOneCoinZap', async function() {
        const token1UserBefore = await this.token1.balanceOf.call(user);
        const poolTokenUser = await this.poolToken.balanceOf.call(user);
        const answer = await this.ydeposit.calc_withdraw_one_coin.call(
          poolTokenUser,
          2
        );
        await this.poolToken.transfer(this.proxy.address, poolTokenUser, {
          from: user,
        });
        await this.proxy.updateTokenMock(this.poolToken.address);
        const minUamount = new BN('1');
        const data = abi.simpleEncode(
          'removeLiquidityOneCoinZap(address,uint256,int128,uint256)',
          this.ydeposit.address,
          poolTokenUser,
          2,
          minUamount
        );
        const receipt = await this.proxy.execMock(this.hcurve.address, data, {
          from: user,
          value: ether('1'),
        });

        // Check proxy balance
        expect(
          await this.token1.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));
        expect(
          await this.poolToken.balanceOf.call(this.proxy.address)
        ).to.be.bignumber.eq(ether('0'));

        // amount should be <= answer * 1.001 and >= answer * 0.999 which is
        // referenced from tests in curve contract.
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.gte(
          token1UserBefore.add(answer.mul(new BN('999')).div(new BN('1000')))
        );
        expect(await this.token1.balanceOf.call(user)).to.be.bignumber.lte(
          token1UserBefore.add(answer.mul(new BN('1001')).div(new BN('1000')))
        );

        profileGas(receipt);
      });
    });
  });
});