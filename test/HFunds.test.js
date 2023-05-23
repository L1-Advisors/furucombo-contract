const chainId = network.config.chainId;

const {
  balance,
  BN,
  constants,
  ether,
  expectEvent,
  expectRevert,
  send,
} = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS, MAX_UINT256 } = constants;
const { tracker } = balance;
const abi = require('ethereumjs-abi');
const utils = web3.utils;

const { expect } = require('chai');

const {
  DAI_TOKEN,
  USDT_TOKEN,
  NATIVE_TOKEN_ADDRESS,
  NATIVE_TOKEN_ADDRESS_PROXY,
  WRAPPED_NATIVE_TOKEN,
} = require('./utils/constants');
const {
  evmRevert,
  evmSnapshot,
  profileGas,
  getHandlerReturn,
  getCallData,
  injectEther,
  getBalanceSlotNum,
  setTokenBalance,
  mwei,
} = require('./utils/utils');

const HFunds = artifacts.require('HFunds');
const FeeRuleRegistry = artifacts.require('FeeRuleRegistry');
const Registry = artifacts.require('Registry');
const Proxy = artifacts.require('ProxyMock');
const IToken = artifacts.require('IERC20');
const IUsdt = artifacts.require('IERC20Usdt');

contract('Funds', function ([_, user, someone]) {
  let id;
  let balanceUser;
  let balanceProxy;
  const token0Address = DAI_TOKEN;
  const token1Address = WRAPPED_NATIVE_TOKEN;

  before(async function () {
    this.registry = await Registry.new();
    this.feeRuleRegistry = await FeeRuleRegistry.new('0', _);
    this.proxy = await Proxy.new(
      this.registry.address,
      this.feeRuleRegistry.address
    );
    this.hFunds = await HFunds.new();
    await this.registry.register(
      this.hFunds.address,
      utils.asciiToHex('Funds')
    );
  });

  beforeEach(async function () {
    id = await evmSnapshot();
  });

  afterEach(async function () {
    await evmRevert(id);
  });

  describe('update tokens', function () {
    before(async function () {
      this.token0 = await IToken.at(token0Address);
      this.token1 = await IToken.at(token1Address);
      balanceUser = await tracker(user);
      balanceProxy = await tracker(this.proxy.address);
    });

    it('normal', async function () {
      const token = [this.token0.address, this.token1.address];
      const value = [ether('100'), ether('200')];
      const to = this.hFunds.address;
      const data = abi.simpleEncode('updateTokens(address[])', token);

      const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
      await setTokenBalance(
        this.token0.address,
        this.proxy.address,
        value[0],
        DAI_BALANCE_SLOT_NUM
      );

      const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
        'WrappedNative',
        chainId
      );
      await setTokenBalance(
        this.token1.address,
        this.proxy.address,
        value[1],
        WRAPPED_NATIVE_BALANCE_SLOT_NUM
      );

      const receipt = await this.proxy.execMock(to, data, {
        from: user,
        value: ether('1'),
      });

      const handlerReturn = getHandlerReturn(receipt, ['uint256[]'])[0];
      // Verify token0
      expect(handlerReturn[0]).to.be.bignumber.eq(value[0]);
      expect(
        await this.token0.balanceOf.call(this.proxy.address)
      ).to.be.bignumber.zero;
      expect(await this.token0.balanceOf.call(user)).to.be.bignumber.eq(
        value[0]
      );

      // Verify token1
      expect(handlerReturn[1]).to.be.bignumber.eq(value[1]);
      expect(
        await this.token1.balanceOf.call(this.proxy.address)
      ).to.be.bignumber.zero;
      expect(await this.token1.balanceOf.call(user)).to.be.bignumber.eq(
        value[1]
      );

      profileGas(receipt);
    });

    it('native token - zero address', async function () {
      const token = [this.token0.address, ZERO_ADDRESS];
      const msgValue = ether('0.1');
      const value = [ether('200'), ether('1')];
      const to = this.hFunds.address;
      const data = abi.simpleEncode('updateTokens(address[])', token);
      // Transfer tokens to proxy first
      const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
      await setTokenBalance(
        this.token0.address,
        this.proxy.address,
        value[0],
        DAI_BALANCE_SLOT_NUM
      );
      await injectEther(this.proxy.address, '0x' + value[1].toString(16));
      await balanceUser.get();

      const receipt = await this.proxy.execMock(to, data, {
        from: user,
        value: msgValue,
      });

      const handlerReturn = getHandlerReturn(receipt, ['uint256[]'])[0];
      // Verify token0
      expect(handlerReturn[0]).to.be.bignumber.eq(value[0]);
      expect(
        await this.token0.balanceOf.call(this.proxy.address)
      ).to.be.bignumber.zero;
      expect(await this.token0.balanceOf.call(user)).to.be.bignumber.eq(
        value[0]
      );

      // Verify ether
      expect(handlerReturn[1]).to.be.bignumber.eq(value[1].add(msgValue)); // handlerReturn should include msg.value
      expect(await balanceProxy.get()).to.be.bignumber.zero;
      // user balance will not include msg.value because it is provided by user itself
      expect(await balanceUser.delta()).to.be.bignumber.eq(value[1]);

      profileGas(receipt);
    });

    it('native token - 0xEEEE', async function () {
      const token =
        chainId == 1088
          ? [this.token0.address, NATIVE_TOKEN_ADDRESS_PROXY]
          : [this.token0.address, NATIVE_TOKEN_ADDRESS];
      const msgValue = ether('0.1');
      const value = [ether('200'), ether('1')];
      const to = this.hFunds.address;
      const data = abi.simpleEncode('updateTokens(address[])', token);
      // Transfer tokens to proxy first
      const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
      await setTokenBalance(
        this.token0.address,
        this.proxy.address,
        value[0],
        DAI_BALANCE_SLOT_NUM
      );
      await injectEther(this.proxy.address, '0x' + value[1].toString(16));
      await balanceUser.get();

      const receipt = await this.proxy.execMock(to, data, {
        from: user,
        value: msgValue,
      });

      const handlerReturn = getHandlerReturn(receipt, ['uint256[]'])[0];
      // Verify token0
      expect(handlerReturn[0]).to.be.bignumber.eq(value[0]);
      expect(
        await this.token0.balanceOf.call(this.proxy.address)
      ).to.be.bignumber.zero;
      expect(await this.token0.balanceOf.call(user)).to.be.bignumber.eq(
        value[0]
      );

      // Verify ether
      expect(handlerReturn[1]).to.be.bignumber.eq(value[1].add(msgValue)); // handlerReturn should include msg.value
      expect(await balanceProxy.get()).to.be.bignumber.zero;
      // user balance will not include msg.value because it is provided by user itself
      expect(await balanceUser.delta()).to.be.bignumber.eq(value[1]);

      profileGas(receipt);
    });
  });

  describe('multiple tokens', function () {
    before(async function () {
      this.token0 = await IToken.at(token0Address);
      this.token1 = await IToken.at(token1Address);
    });

    it('inject', async function () {
      const token = [this.token0.address, this.token1.address];
      const value = [ether('100'), ether('100')];
      const to = this.hFunds.address;
      const data = abi.simpleEncode(
        'inject(address[],uint256[])',
        token,
        value
      );

      const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
      await setTokenBalance(
        this.token0.address,
        user,
        value[0],
        DAI_BALANCE_SLOT_NUM
      );
      await this.token0.approve(this.proxy.address, value[0], { from: user });

      const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
        'WrappedNative',
        chainId
      );
      await setTokenBalance(
        this.token1.address,
        user,
        value[1],
        WRAPPED_NATIVE_BALANCE_SLOT_NUM
      );
      await this.token1.approve(this.proxy.address, value[1], { from: user });

      const receipt = await this.proxy.execMock(to, data, {
        from: user,
        value: ether('1'),
      });

      await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
        from: user,
        to: this.proxy.address,
        value: value[0],
      });
      await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
        from: this.proxy.address,
        to: user,
        value: value[0],
      });

      await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
        from: user,
        to: this.proxy.address,
        value: value[1],
      });
      await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
        from: this.proxy.address,
        to: user,
        value: value[1],
      });
      profileGas(receipt);
    });

    it('add funds', async function () {
      const token = [this.token0.address, this.token1.address];
      const value = [ether('100'), ether('100')];
      const to = this.hFunds.address;
      const data = abi.simpleEncode(
        'inject(address[],uint256[])',
        token,
        value
      );
      const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
      await setTokenBalance(
        this.token0.address,
        user,
        value[0],
        DAI_BALANCE_SLOT_NUM
      );
      await this.token0.approve(this.proxy.address, value[0], { from: user });
      const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
        'WrappedNative',
        chainId
      );
      await setTokenBalance(
        this.token1.address,
        user,
        value[1],
        WRAPPED_NATIVE_BALANCE_SLOT_NUM
      );
      await this.token1.approve(this.proxy.address, value[1], { from: user });

      const receipt = await this.proxy.execMock(to, data, {
        from: user,
        value: ether('1'),
      });

      await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
        from: user,
        to: this.proxy.address,
        value: value[0],
      });
      await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
        from: this.proxy.address,
        to: user,
        value: value[0],
      });

      await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
        from: user,
        to: this.proxy.address,
        value: value[1],
      });
      await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
        from: this.proxy.address,
        to: user,
        value: value[1],
      });
      profileGas(receipt);
    });
  });

  describe('inject', function () {
    describe('single token', function () {
      before(async function () {
        this.token0 = await IToken.at(token0Address);
        this.usdt = await IUsdt.at(USDT_TOKEN);
      });

      it('normal', async function () {
        const token = [this.token0.address];
        const value = [ether('100')];
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'inject(address[],uint256[])',
          token,
          value
        );
        const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
        await setTokenBalance(
          this.token0.address,
          user,
          value[0],
          DAI_BALANCE_SLOT_NUM
        );
        await this.token0.approve(this.proxy.address, value[0], { from: user });

        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('0.1'),
        });

        const handlerReturn = getHandlerReturn(receipt, ['uint256[]'])[0];

        expect(handlerReturn[0]).to.be.bignumber.eq(value[0]);
        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: user,
          to: this.proxy.address,
          value: value[0],
        });
        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: this.proxy.address,
          to: user,
          value: value[0],
        });
        profileGas(receipt);
      });

      it('add funds', async function () {
        const token = [this.token0.address];
        const value = [ether('100')];
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'addFunds(address[],uint256[])',
          token,
          value
        );
        const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
        await setTokenBalance(
          this.token0.address,
          user,
          value[0],
          DAI_BALANCE_SLOT_NUM
        );
        await this.token0.approve(this.proxy.address, value[0], { from: user });

        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('0.1'),
        });

        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: user,
          to: this.proxy.address,
          value: value[0],
        });
        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: this.proxy.address,
          to: user,
          value: value[0],
        });
        profileGas(receipt);
      });

      it('USDT', async function () {
        const token = [this.usdt.address];
        const value = [new BN('1000000')];
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'inject(address[],uint256[])',
          token,
          value
        );
        const USDT_BALANCE_SLOT_NUM = getBalanceSlotNum('USDT', chainId);
        await setTokenBalance(
          this.usdt.address,
          user,
          value[0],
          USDT_BALANCE_SLOT_NUM
        );
        await this.usdt.approve(this.proxy.address, value[0], { from: user });

        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('0.1'),
        });

        const handlerReturn = getHandlerReturn(receipt, ['uint256[]'])[0];
        expect(handlerReturn[0]).to.be.bignumber.eq(value[0]);
        await expectEvent.inTransaction(receipt.tx, this.usdt, 'Transfer', {
          from: user,
          to: this.proxy.address,
          value: value[0],
        });
        await expectEvent.inTransaction(receipt.tx, this.usdt, 'Transfer', {
          from: this.proxy.address,
          to: user,
          value: value[0],
        });
        profileGas(receipt);
      });
    });

    describe('multiple tokens', function () {
      before(async function () {
        this.token0 = await IToken.at(token0Address);
        this.token1 = await IToken.at(token1Address);
      });

      it('normal', async function () {
        const token = [this.token0.address, this.token1.address];
        const value = [ether('100'), ether('200')];
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'inject(address[],uint256[])',
          token,
          value
        );

        const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
        await setTokenBalance(
          this.token0.address,
          user,
          value[0],
          DAI_BALANCE_SLOT_NUM
        );
        await this.token0.approve(this.proxy.address, value[0], { from: user });

        const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
          'WrappedNative',
          chainId
        );
        await setTokenBalance(
          this.token1.address,
          user,
          value[1],
          WRAPPED_NATIVE_BALANCE_SLOT_NUM
        );
        await this.token1.approve(this.proxy.address, value[1], { from: user });

        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('1'),
        });

        const handlerReturn = getHandlerReturn(receipt, ['uint256[]'])[0];
        expect(handlerReturn[0]).to.be.bignumber.eq(value[0]);
        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: user,
          to: this.proxy.address,
          value: value[0],
        });
        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: this.proxy.address,
          to: user,
          value: value[0],
        });

        expect(handlerReturn[1]).to.be.bignumber.eq(value[1]);
        await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
          from: user,
          to: this.proxy.address,
          value: value[1],
        });
        await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
          from: this.proxy.address,
          to: user,
          value: value[1],
        });
        profileGas(receipt);
      });

      it('add funds', async function () {
        const token = [this.token0.address, this.token1.address];
        const value = [ether('100'), ether('100')];
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'inject(address[],uint256[])',
          token,
          value
        );

        const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
        await setTokenBalance(
          this.token0.address,
          user,
          value[0],
          DAI_BALANCE_SLOT_NUM
        );
        await this.token0.approve(this.proxy.address, value[0], { from: user });

        const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
          'WrappedNative',
          chainId
        );
        await setTokenBalance(
          this.token1.address,
          user,
          value[1],
          WRAPPED_NATIVE_BALANCE_SLOT_NUM
        );
        await this.token1.approve(this.proxy.address, value[1], { from: user });

        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('1'),
        });

        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: user,
          to: this.proxy.address,
          value: value[0],
        });
        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: this.proxy.address,
          to: user,
          value: value[0],
        });

        await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
          from: user,
          to: this.proxy.address,
          value: value[1],
        });
        await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
          from: this.proxy.address,
          to: user,
          value: value[1],
        });
        profileGas(receipt);
      });
    });
  });

  describe('send', function () {
    before(async function () {
      this.token = await IToken.at(token0Address);
      this.usdt = await IUsdt.at(USDT_TOKEN);
    });

    describe('token', function () {
      it('normal', async function () {
        const token = this.token.address;
        const value = ether('100');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendToken(address,uint256,address)',
          token,
          value,
          receiver
        );

        const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
        await setTokenBalance(
          token,
          this.proxy.address,
          value,
          DAI_BALANCE_SLOT_NUM
        );
        await this.proxy.updateTokenMock(this.token.address);
        const tokenSomeone = await this.token.balanceOf.call(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('0.1'),
        });

        await expectEvent.inTransaction(receipt.tx, this.token, 'Transfer', {
          from: this.proxy.address,
          to: someone,
          value: value,
        });
        const tokenSomeoneEnd = await this.token.balanceOf.call(someone);
        expect(tokenSomeoneEnd.sub(tokenSomeone)).to.be.bignumber.eq(value);
        profileGas(receipt);
      });

      it('USDT', async function () {
        const token = this.usdt.address;
        const value = new BN('1000000');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendToken(address,uint256,address)',
          token,
          value,
          receiver
        );

        const USDT_BALANCE_SLOT_NUM = getBalanceSlotNum('USDT', chainId);
        await setTokenBalance(
          token,
          this.proxy.address,
          value,
          USDT_BALANCE_SLOT_NUM
        );
        await this.proxy.updateTokenMock(token);

        const tokenSomeone = await this.usdt.balanceOf.call(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('0.1'),
        });

        await expectEvent.inTransaction(receipt.tx, this.usdt, 'Transfer', {
          from: this.proxy.address,
          to: someone,
          value: value,
        });
        const tokenSomeoneEnd = await this.usdt.balanceOf.call(someone);
        expect(tokenSomeoneEnd.sub(tokenSomeone)).to.be.bignumber.eq(value);
        profileGas(receipt);
      });

      it('maximum', async function () {
        const token = this.token.address;
        const value = ether('10');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendToken(address,uint256,address)',
          token,
          MAX_UINT256,
          receiver
        );

        const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
        await setTokenBalance(
          token,
          this.proxy.address,
          value,
          DAI_BALANCE_SLOT_NUM
        );
        await this.proxy.updateTokenMock(this.token.address);
        const tokenSomeone = await this.token.balanceOf.call(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('0.1'),
        });

        await expectEvent.inTransaction(receipt.tx, this.token, 'Transfer', {
          from: this.proxy.address,
          to: someone,
          value: value,
        });
        const tokenSomeoneEnd = await this.token.balanceOf.call(someone);
        expect(tokenSomeoneEnd.sub(tokenSomeone)).to.be.bignumber.eq(value);
        profileGas(receipt);
      });

      it('send 0 token', async function () {
        const token = this.token.address;
        const value = ether('0');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendToken(address,uint256,address)',
          token,
          value,
          receiver
        );

        const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
        await setTokenBalance(
          token,
          this.proxy.address,
          value,
          DAI_BALANCE_SLOT_NUM
        );
        await this.proxy.updateTokenMock(this.token.address);
        const tokenSomeone = await this.token.balanceOf.call(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('0.1'),
        });

        await expectEvent.notEmitted.inTransaction(
          receipt.tx,
          this.token,
          'Transfer',
          {
            from: this.proxy.address,
            to: someone,
            value: value,
          }
        );
        const tokenSomeoneEnd = await this.token.balanceOf.call(someone);
        expect(tokenSomeoneEnd.sub(tokenSomeone)).to.be.bignumber.eq(value);
        profileGas(receipt);
      });

      it('insufficient token', async function () {
        const token = this.token.address;
        const value = ether('100');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendToken(address,uint256,address)',
          token,
          value,
          receiver
        );

        const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
        await setTokenBalance(
          token,
          this.proxy.address,
          value.sub(ether('1')),
          DAI_BALANCE_SLOT_NUM
        );
        await this.proxy.updateTokenMock(this.token.address);
        await expectRevert.unspecified(
          this.proxy.execMock(to, data, {
            from: user,
            value: ether('0.1'),
          })
        );
      });
    });

    describe('Ether', async function () {
      it('normal', async function () {
        const value = ether('1');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode('send(uint256,address)', value, receiver);
        let balanceSomeone = await tracker(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: value,
        });
        expect(await balanceSomeone.delta()).to.be.bignumber.eq(value);
        profileGas(receipt);
      });

      it('maximum', async function () {
        const value = ether('1');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'send(uint256,address)',
          MAX_UINT256,
          receiver
        );
        let balanceSomeone = await tracker(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: value,
        });
        expect(await balanceSomeone.delta()).to.be.bignumber.eq(value);
        profileGas(receipt);
      });

      it('send 0 eth', async function () {
        const value = ether('0');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode('send(uint256,address)', value, receiver);
        let balanceSomeone = await tracker(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: value,
        });
        expect(await balanceSomeone.delta()).to.be.bignumber.eq(value);
        profileGas(receipt);
      });

      it('insufficient ether', async function () {
        const value = ether('1');
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode('send(uint256,address)', value, receiver);
        let balanceSomeone = await tracker(someone);
        await expectRevert.unspecified(
          this.proxy.execMock(to, data, {
            from: user,
            value: value.sub(ether('0.1')),
          })
        );
      });
    });

    describe('multiple tokens', function () {
      before(async function () {
        this.token0 = this.usdt;
        this.token1 = await IToken.at(token1Address);
      });

      it('multiple tokens', async function () {
        const tokens = [this.token0.address, this.token1.address];
        const value = [new BN(10000000), ether('15')];
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendTokens(address[],uint256[],address)',
          tokens,
          value,
          receiver
        );

        const USDT_BALANCE_SLOT_NUM = getBalanceSlotNum('USDT', chainId);
        await setTokenBalance(
          this.token0.address,
          this.proxy.address,
          value[0],
          USDT_BALANCE_SLOT_NUM
        );

        const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
          'WrappedNative',
          chainId
        );
        await setTokenBalance(
          this.token1.address,
          this.proxy.address,
          value[1],
          WRAPPED_NATIVE_BALANCE_SLOT_NUM
        );

        await this.proxy.updateTokenMock(this.token0.address);
        await this.proxy.updateTokenMock(this.token1.address);

        const token0Someone = await this.token0.balanceOf.call(someone);
        const token1Someone = await this.token1.balanceOf.call(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: ether('0.1'),
        });

        await expectEvent.inTransaction(receipt.tx, this.token0, 'Transfer', {
          from: this.proxy.address,
          to: someone,
          value: value[0],
        });

        await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
          from: this.proxy.address,
          to: someone,
          value: value[1],
        });

        const token0SomeoneEnd = await this.token0.balanceOf.call(someone);
        expect(token0SomeoneEnd.sub(token0Someone)).to.be.bignumber.eq(
          value[0]
        );

        const token1SomeoneEnd = await this.token1.balanceOf.call(someone);
        expect(token1SomeoneEnd.sub(token1Someone)).to.be.bignumber.eq(
          value[1]
        );
        profileGas(receipt);
      });

      it('token and eth', async function () {
        const tokens = [ZERO_ADDRESS, this.token1.address];
        const value = [ether('10'), ether('15')];
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendTokens(address[],uint256[],address)',
          tokens,
          value,
          receiver
        );

        const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
          'WrappedNative',
          chainId
        );
        await setTokenBalance(
          this.token1.address,
          this.proxy.address,
          value[1],
          WRAPPED_NATIVE_BALANCE_SLOT_NUM
        );

        await this.proxy.updateTokenMock(this.token1.address);

        const token1Someone = await this.token1.balanceOf.call(someone);
        let balanceSomeone = await tracker(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: value[0],
        });

        await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
          from: this.proxy.address,
          to: someone,
          value: value[1],
        });

        expect(await balanceSomeone.delta()).to.be.bignumber.eq(value[0]);

        const token1SomeoneEnd = await this.token1.balanceOf.call(someone);
        expect(token1SomeoneEnd.sub(token1Someone)).to.be.bignumber.eq(
          value[1]
        );
        profileGas(receipt);
      });

      it('max amount', async function () {
        const tokens = [ZERO_ADDRESS, this.token1.address];
        const value = [ether('10'), ether('15')];
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendTokens(address[],uint256[],address)',
          tokens,
          [MAX_UINT256, MAX_UINT256],
          receiver
        );

        const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
          'WrappedNative',
          chainId
        );
        await setTokenBalance(
          this.token1.address,
          this.proxy.address,
          value[1],
          WRAPPED_NATIVE_BALANCE_SLOT_NUM
        );

        await this.proxy.updateTokenMock(this.token1.address);

        const token1Someone = await this.token1.balanceOf.call(someone);
        let balanceSomeone = await tracker(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: value[0],
        });

        await expectEvent.inTransaction(receipt.tx, this.token1, 'Transfer', {
          from: this.proxy.address,
          to: someone,
          value: value[1],
        });

        expect(await balanceSomeone.delta()).to.be.bignumber.eq(value[0]);

        const token1SomeoneEnd = await this.token1.balanceOf.call(someone);
        expect(token1SomeoneEnd.sub(token1Someone)).to.be.bignumber.eq(
          value[1]
        );
        profileGas(receipt);
      });

      it('zero case', async function () {
        const tokens = [ZERO_ADDRESS, this.token1.address];
        const value = [ether('0'), ether('0')];
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendTokens(address[],uint256[],address)',
          tokens,
          value,
          receiver
        );

        const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
          'WrappedNative',
          chainId
        );
        await setTokenBalance(
          this.token1.address,
          this.proxy.address,
          value[1],
          WRAPPED_NATIVE_BALANCE_SLOT_NUM
        );

        await this.proxy.updateTokenMock(this.token1.address);

        const token1Someone = await this.token1.balanceOf.call(someone);
        let balanceSomeone = await tracker(someone);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: value[0],
        });

        await expectEvent.notEmitted.inTransaction(
          receipt.tx,
          this.token1,
          'Transfer',
          {
            from: this.proxy.address,
            to: someone,
            value: value[1],
          }
        );

        expect(await balanceSomeone.delta()).to.be.bignumber.eq(value[0]);
        const token1SomeoneEnd = await this.token1.balanceOf.call(someone);
        expect(token1SomeoneEnd.sub(token1Someone)).to.be.bignumber.eq(
          value[1]
        );
        profileGas(receipt);
      });

      it('insufficient token', async function () {
        const tokens = [ZERO_ADDRESS, this.token1.address];
        const value = [ether('10'), ether('15')];
        const receiver = someone;
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'sendTokens(address[],uint256[],address)',
          tokens,
          value,
          receiver
        );

        const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
          'WrappedNative',
          chainId
        );
        await setTokenBalance(
          this.token1.address,
          this.proxy.address,
          value[1],
          WRAPPED_NATIVE_BALANCE_SLOT_NUM
        );

        await this.proxy.updateTokenMock(this.token1.address);

        await expectRevert.unspecified(
          this.proxy.execMock(to, data, {
            from: user,
            value: ether('0.1'),
          })
        );
      });
    });

    describe('multiple addresses', function () {
      describe('from token', function () {
        before(async function () {
          this.token0 = this.usdt;
        });

        it('normal', async function () {
          const token = this.token0.address;
          const count = 3;
          const amount = mwei('10');
          const values = Array(count).fill(new BN(amount));
          const receivers = Array.from(
            Array(count),
            (_) => web3.eth.accounts.create().address
          );
          const to = this.hFunds.address;
          const data = abi.simpleEncode(
            'sendTokenToAddresses(address,uint256[],address[])',
            token,
            values,
            receivers
          );

          const USDT_BALANCE_SLOT_NUM = getBalanceSlotNum('USDT', chainId);
          await setTokenBalance(
            this.token0.address,
            this.proxy.address,
            amount * count,
            USDT_BALANCE_SLOT_NUM
          );
          await this.proxy.updateTokenMock(this.token0.address);

          const tokenSomeoneStart = Array(count);
          for (i = 0; i < count; i++) {
            tokenSomeoneStart[i] = await this.token0.balanceOf.call(
              receivers[i]
            );
          }

          const receipt = await this.proxy.execMock(to, data, {
            from: user,
            value: ether('0.1'),
          });

          for (i = 0; i < count; i++) {
            await expectEvent.inTransaction(
              receipt.tx,
              this.token0,
              'Transfer',
              {
                from: this.proxy.address,
                to: receivers[i],
                value: values[i],
              }
            );

            const tokenSomeoneEnd = await this.token0.balanceOf.call(
              receivers[i]
            );
            expect(
              tokenSomeoneEnd.sub(tokenSomeoneStart[i])
            ).to.be.bignumber.eq(values[i]);
          }

          profileGas(receipt);
        });

        it('zero case', async function () {
          const token = this.token0.address;
          const values = [new BN(ether('0'))];
          const receivers = [someone];
          const to = this.hFunds.address;
          const data = abi.simpleEncode(
            'sendTokenToAddresses(address,uint256[],address[])',
            token,
            values,
            receivers
          );

          const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
          await setTokenBalance(
            this.token0.address,
            this.proxy.address,
            values[0],
            DAI_BALANCE_SLOT_NUM
          );
          await this.proxy.updateTokenMock(this.token0.address);

          const tokenSomeoneStart = await this.token0.balanceOf.call(someone);
          const receipt = await this.proxy.execMock(to, data, {
            from: user,
            value: values[0],
          });

          await expectEvent.notEmitted.inTransaction(
            receipt.tx,
            this.token0,
            'Transfer',
            {
              from: this.proxy.address,
              to: someone,
              value: values[0],
            }
          );

          const tokenSomeoneEnd = await this.token0.balanceOf.call(someone);
          expect(tokenSomeoneEnd.sub(tokenSomeoneStart)).to.be.bignumber.eq(
            values[0]
          );

          profileGas(receipt);
        });

        it('insufficient case', async function () {
          const token = this.token0.address;
          const values = [ether('10')];
          const receivers = [someone];
          const to = this.hFunds.address;
          const data = abi.simpleEncode(
            'sendTokenToAddresses(address,uint256[],address[])',
            token,
            values,
            receivers
          );

          await expectRevert.unspecified(
            this.proxy.execMock(to, data, {
              from: user,
              value: ether('0.1'),
            })
          );
        });
      });

      describe('from eth', function () {
        it('normal', async function () {
          const token = ZERO_ADDRESS;
          const count = 3;
          const amount = ether('0.1');
          const values = Array(count).fill(new BN(amount));
          const receivers = Array.from(
            Array(count),
            (_) => web3.eth.accounts.create().address
          );
          const to = this.hFunds.address;
          const data = abi.simpleEncode(
            'sendTokenToAddresses(address,uint256[],address[])',
            token,
            values,
            receivers
          );

          const balanceSomeone = Array(count);
          for (i = 0; i < count; i++) {
            balanceSomeone[i] = await tracker(receivers[i]);
          }

          const receipt = await this.proxy.execMock(to, data, {
            from: user,
            value: amount * count,
          });

          for (i = 0; i < count; i++) {
            expect(await balanceSomeone[i].delta()).to.be.bignumber.eq(
              values[i]
            );
          }
          profileGas(receipt);
        });

        it('zero case', async function () {
          const token = ZERO_ADDRESS;
          const values = [new BN(ether('0'))];
          const receivers = [someone];
          const to = this.hFunds.address;
          const data = abi.simpleEncode(
            'sendTokenToAddresses(address,uint256[],address[])',
            token,
            values,
            receivers
          );

          let balanceSomeone = await tracker(someone);
          const receipt = await this.proxy.execMock(to, data, {
            from: user,
            value: values[0],
          });

          expect(await balanceSomeone.delta()).to.be.bignumber.eq(values[0]);
          profileGas(receipt);
        });

        it('insufficient case', async function () {
          const token = ZERO_ADDRESS;
          const values = [ether('10')];
          const receivers = [someone];
          const to = this.hFunds.address;
          const data = abi.simpleEncode(
            'sendTokenToAddresses(address,uint256[],address[])',
            token,
            values,
            receivers
          );

          await expectRevert.unspecified(
            this.proxy.execMock(to, data, {
              from: user,
              value: ether('0.1'),
            })
          );
        });
      });
    });

    describe('ether to miner', function () {
      before(async function () {
        // send dummy tx to get miner address
        const receipt = await send.ether(user, someone, 0);
        const block = await web3.eth.getBlock(receipt.blockNumber);
        this.balanceMiner = await tracker(block.miner);
      });

      it('normal', async function () {
        const value = ether('1');
        const to = this.hFunds.address;
        const data = getCallData(HFunds, 'sendEtherToMiner', [value]);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: value,
        });
        // delta = ether tip + gas fee + block reward.
        // However block reward is 0 probably because of hardhat fork, and ether tip + gas fee = 0 since we set 0 to both base fee and gas price.
        expect(await this.balanceMiner.delta()).to.be.bignumber.eq(value);

        profileGas(receipt);
      });
    });
  });

  describe('get balance', function () {
    before(async function () {
      this.token = await IToken.at(token0Address);
      this.usdt = await IUsdt.at(USDT_TOKEN);
    });
    describe('Ether', async function () {
      it('normal', async function () {
        const value = ether('1');
        const to = this.hFunds.address;
        const data = abi.simpleEncode(
          'getBalance(address):(uint256)',
          constants.ZERO_ADDRESS
        );

        await this.proxy.updateTokenMock(this.token.address);
        const receipt = await this.proxy.execMock(to, data, {
          from: user,
          value: value,
        });

        const handlerReturn = utils.toBN(
          getHandlerReturn(receipt, ['uint256'])[0]
        );

        expect(handlerReturn).to.be.bignumber.eq(value);
        profileGas(receipt);
      });

      describe('token', function () {
        it('normal', async function () {
          const token = this.token.address;
          const value = ether('1');
          const to = this.hFunds.address;
          const data = abi.simpleEncode('getBalance(address):(uint256)', token);

          const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
          await setTokenBalance(
            this.token.address,
            this.proxy.address,
            value,
            DAI_BALANCE_SLOT_NUM
          );
          await this.proxy.updateTokenMock(this.token.address);
          const receipt = await this.proxy.execMock(to, data, {
            from: user,
            value: ether('0.1'),
          });

          const handlerReturn = utils.toBN(
            getHandlerReturn(receipt, ['uint256'])[0]
          );

          expect(handlerReturn).to.be.bignumber.eq(value);
          profileGas(receipt);
        });
      });
    });
  });

  describe('check slippage', function () {
    before(async function () {
      this.token0 = await IToken.at(token0Address);
      this.token1 = await IToken.at(token1Address);
    });

    it('normal', async function () {
      const token = [this.token0.address, this.token1.address, ZERO_ADDRESS];
      const value = [ether('10'), ether('10'), ether('10')];
      const to = this.hFunds.address;
      const data = abi.simpleEncode(
        'checkSlippage(address[],uint256[])',
        token,
        value
      );

      const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
      await setTokenBalance(
        this.token0.address,
        this.proxy.address,
        value[0],
        DAI_BALANCE_SLOT_NUM
      );

      const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
        'WrappedNative',
        chainId
      );
      await setTokenBalance(
        this.token1.address,
        this.proxy.address,
        value[1],
        WRAPPED_NATIVE_BALANCE_SLOT_NUM
      );

      const receipt = await this.proxy.execMock(to, data, {
        from: user,
        value: value[2],
      });

      profileGas(receipt);
    });

    it('should revert: eth slippage', async function () {
      const token = [this.token0.address, this.token1.address, ZERO_ADDRESS];
      const value = [ether('10'), ether('10'), ether('10')];
      const to = this.hFunds.address;
      const data = abi.simpleEncode(
        'checkSlippage(address[],uint256[])',
        token,
        value
      );

      const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
      await setTokenBalance(
        this.token0.address,
        this.proxy.address,
        value[0],
        DAI_BALANCE_SLOT_NUM
      );

      const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
        'WrappedNative',
        chainId
      );
      await setTokenBalance(
        this.token1.address,
        this.proxy.address,
        value[1],
        WRAPPED_NATIVE_BALANCE_SLOT_NUM
      );
      revertValue = ether('1');

      await expectRevert(
        this.proxy.execMock(to, data, {
          from: user,
          value: revertValue,
        }),
        'HFunds_checkSlippage: error: 2_' + revertValue.toString()
      );
    });

    it('should revert: token slippage', async function () {
      const token = [this.token0.address, this.token1.address, ZERO_ADDRESS];
      const value = [ether('10'), ether('10'), ether('10')];
      const to = this.hFunds.address;
      const data = abi.simpleEncode(
        'checkSlippage(address[],uint256[])',
        token,
        value
      );

      revertValue = ether('1');

      const DAI_BALANCE_SLOT_NUM = getBalanceSlotNum('DAI', chainId);
      await setTokenBalance(
        this.token0.address,
        this.proxy.address,
        revertValue,
        DAI_BALANCE_SLOT_NUM
      );

      const WRAPPED_NATIVE_BALANCE_SLOT_NUM = getBalanceSlotNum(
        'WrappedNative',
        chainId
      );
      await setTokenBalance(
        this.token1.address,
        this.proxy.address,
        value[1],
        WRAPPED_NATIVE_BALANCE_SLOT_NUM
      );

      await expectRevert(
        this.proxy.execMock(to, data, {
          from: user,
          value: value[2],
        }),
        'HFunds_checkSlippage: error: 0_' + revertValue.toString()
      );
    });
  });
});
