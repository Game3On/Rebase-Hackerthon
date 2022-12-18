import { execFromEntryPoint } from './ABI/execFromEntryPoint';
import Web3 from 'web3';
import { ethers } from "ethers";
import fs from 'fs';
import { Utils } from './Utils';
import { WalletLib } from 'soul-wallet-lib';
import { AbiItem } from 'web3-utils';


async function main() {
    const web3 = new Web3('http://127.0.0.1:8545');
    const ethersProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    const block = await ethersProvider.getBlockNumber();
    const chainId = await web3.eth.getChainId();

    const entryPointPath = './test/contracts/EntryPoint.sol';
    const smartWalletPath = './test/contracts/SmartWallet.sol';
    const wethPaymasterPath = './test/contracts/FixedPaymaster.sol';
    const bundlerHelperPath = './test/contracts/BundlerHelper.sol';

    // get account from web3 rpc node
    let accounts = await web3.eth.getAccounts();

    // new account
    const walletUser = await web3.eth.accounts.create();

    let res = await web3.eth.sendTransaction(
        {
            from: accounts[0],
            to: '0xBb6e024b9cFFACB947A71991E386681B1Cd1477D',
            value: web3.utils.toWei('0.0247', 'ether')
        }
    );
    console.log('send eth to', res.to);
    
    try {
        res = await web3.eth.sendSignedTransaction(
            '0xf9016c8085174876e8008303c4d88080b90154608060405234801561001057600080fd5b50610134806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634af63f0214602d575b600080fd5b60cf60048036036040811015604157600080fd5b810190602081018135640100000000811115605b57600080fd5b820183602082011115606c57600080fd5b80359060200191846001830284011164010000000083111715608d57600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550509135925060eb915050565b604080516001600160a01b039092168252519081900360200190f35b6000818351602085016000f5939250505056fea26469706673582212206b44f8a82cb6b156bfcc3dc6aadd6df4eefd204bc928a4397fd15dacf6d5320564736f6c634300060200331b83247000822470'
        );
        console.log('send from 0xbb');
    } catch (error) { 
        // console.log('error', error);
    }
    const SingletonFactory = '0xce0042B868300000d44A59004Da54A005ffdcf9f';
    let code = await web3.eth.getCode(SingletonFactory);
    if (code === '0x') {
        throw new Error('SingletonFactory is not deployed');
    } else {
        console.log('SingletonFactory is deployed');
    }

    let entrypointCompile = await Utils.compileContract(entryPointPath, 'EntryPoint');
    var entrypointContract = new web3.eth.Contract(entrypointCompile.abi);
    // console.log('entrypointCompile', entrypointCompile);
    
    let EntryPointAddress = '';
    var _paymasterStake = web3.utils.toWei('1', 'ether');
    var _unstakeDelaySec = 100;
    
    try {
        let contract = await entrypointContract.deploy({
            data: '0x' + entrypointCompile.bytecode,
            arguments: [
                _paymasterStake,
                _unstakeDelaySec,
            ]
        }).send({
            from: accounts[0],
            gas: 10000000,
        })
        console.log(contract.options.address);
        EntryPointAddress = contract.options.address;
    } catch (error) {
        console.log(error);
    }
    entrypointContract.options.address = EntryPointAddress;
    console.log('EntryPointAddress: ' + EntryPointAddress);


    let walletLogicCompile = await Utils.compileContract(smartWalletPath, 'SmartWallet');
    let walletLogicContract = new web3.eth.Contract(walletLogicCompile.abi);

    let SmartWalletLogicAddress = '';
    try {
        let contract = await walletLogicContract.deploy({
            data: '0x' + walletLogicCompile.bytecode,
            arguments: []
        }).send({
            from: accounts[0],
            gas: 10000000,
        })
        SmartWalletLogicAddress = contract.options.address;
    } catch (error) {
        console.log(error);
    }
    console.log('SmartWalletLogicAddress: ' + SmartWalletLogicAddress);
    
    let weth = require('./weth.json');
    let WETHContract = new web3.eth.Contract(weth.abi);

    let WETHAddress = '';

    try {
        let contract = await WETHContract.deploy({
            data: weth.bytecode,
            arguments: []
        }).send({
            from: accounts[0],
            gas: 10000000,
        })
        WETHAddress = contract.options.address;
    } catch (error) {
        console.log(error);
    }
    console.log('WEthAddress: ' + WETHAddress);

    let WETHPaymasterCompile = await Utils.compileContract(wethPaymasterPath, 'FixedPaymaster');
    let WETHPaymasterContract = new web3.eth.Contract(WETHPaymasterCompile.abi);

    let WETHPaymasterAddress = '';
    try {
        let contract = await WETHPaymasterContract.deploy({
            data: '0x' + WETHPaymasterCompile.bytecode,
            arguments: [
                EntryPointAddress,
                accounts[0],
                WETHAddress,
                web3.utils.toWei('0.01', 'ether'),
            ]
        }).send({
            from: accounts[0],
            gas: 10000000,
        })
        WETHPaymasterAddress = contract.options.address;
    } catch (error) {
        console.log(error);
    }
    console.log('WETHPaymasterAddress: ' + WETHPaymasterAddress);

    let BundlerHelperCompile = await Utils.compileContract(bundlerHelperPath, 'BundlerHelper');
    var BundlerHelperContract = new web3.eth.Contract(BundlerHelperCompile.abi);
    let BundlerHelperAddress = '';
    try {
        let contract = await BundlerHelperContract.deploy({
            data: '0x' + BundlerHelperCompile.bytecode,
            arguments: []
        }).send({
            from: accounts[0],
            gas: 10000000,
        })
        BundlerHelperAddress = contract.options.address;
    } catch (error) {
        console.log(error);
    }
    BundlerHelperContract.options.address = BundlerHelperAddress;
    console.log('BundlerHelperAddress: ' + BundlerHelperAddress);


    let wethPaymasterContract = new web3.eth.Contract(WETHPaymasterCompile.abi, WETHPaymasterAddress);
    const addStakeCallData = wethPaymasterContract.methods.addStake(1).encodeABI();
    const addStakeTx = {
        from: accounts[0],
        to: WETHPaymasterAddress,
        data: addStakeCallData,
        gas: 10000000,
        value: _paymasterStake
    };
    const addStakeReceipt = await web3.eth.sendTransaction(addStakeTx);
    // console.log('addStakeReceipt', addStakeReceipt);

    const depositCallData = wethPaymasterContract.methods.deposit().encodeABI();
    const depositTx = {
        from: accounts[0],
        to: WETHPaymasterAddress,
        data: depositCallData,
        gas: 10000000,
        value: web3.utils.toWei('1', 'ether')
    };
    const depositReceipt = await web3.eth.sendTransaction(depositTx);

    let walletAddress = await WalletLib.EIP4337.calculateWalletAddress(
        SmartWalletLogicAddress, EntryPointAddress, walletUser.address, WETHAddress, WETHPaymasterAddress, 0, SingletonFactory
    );
    console.log('walletAddress: ' + walletAddress);

    const swapEthToWethTx = {
        from: accounts[0],
        to: WETHAddress,
        data: '0x',
        gas: 10000000,
        value: web3.utils.toWei('10', 'ether')
    };
    const swapEthToWethReceipt = await web3.eth.sendTransaction(swapEthToWethTx);

    let wethContract = new web3.eth.Contract(weth.abi, WETHAddress);

    let wethBalance = await wethContract.methods.balanceOf(accounts[0]).call();
    console.log('wethBalance: ' + web3.utils.fromWei(wethBalance, 'ether'), 'WETH');
    console.log('ethBalance: ' + web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether'), 'ETH');
    

    await wethContract.methods.transfer(walletAddress, web3.utils.toWei('1', 'ether')).send({
        from: accounts[0],
        gas: 10000000,
    });
    // get balance of weth
    wethBalance = await wethContract.methods.balanceOf(walletAddress).call();
    console.log('Wallet wethBalance: ' + web3.utils.fromWei(wethBalance, 'ether'), 'WETH');

    
    const activateOp = WalletLib.EIP4337.activateWalletOp(
        SmartWalletLogicAddress,
        EntryPointAddress,
        WETHPaymasterAddress,
        walletUser.address,
        WETHAddress,
        parseInt(web3.utils.toWei('100', 'gwei')),
        parseInt(web3.utils.toWei('10', 'gwei')),
        0,
        SingletonFactory
    );

    {
        const singletonFactoryContract = new web3.eth.Contract([{ "inputs": [{ "internalType": "bytes", "name": "_initCode", "type": "bytes" }, { "internalType": "bytes32", "name": "_salt", "type": "bytes32" }], "name": "deploy", "outputs": [{ "internalType": "address payable", "name": "createdContract", "type": "address" }], "stateMutability": "nonpayable", "type": "function" }], SingletonFactory);
        const _initCode = WalletLib.EIP4337.getWalletCode(SmartWalletLogicAddress, EntryPointAddress, walletUser.address, WETHAddress, WETHPaymasterAddress);
        const _salt = web3.utils.soliditySha3(WalletLib.EIP4337.number2Bytes32(0));
        const create2Cost = await singletonFactoryContract.methods.deploy(_initCode, _salt).estimateGas({
            from: WalletLib.EIP4337.Defines.AddressZero,
            gas: Math.pow(10, 18),
        });
        console.log('create2Cost: ' + create2Cost);
    }

    const requestId = activateOp.getRequestId(EntryPointAddress, chainId);
    const _requestid = await entrypointContract.methods.getRequestId(activateOp).call();
    console.log('requestId: ' + requestId);
    console.log('_requestid:' + _requestid);

    const signature = await web3.eth.accounts.sign(requestId, walletUser.privateKey);
    activateOp.signWithSignature(walletUser.address, signature.signature);
    try {
        console.log('simulateValidation', activateOp);
        
        const result = await entrypointContract.methods.simulateValidation(activateOp, false).call({
            from: WalletLib.EIP4337.Defines.AddressZero
        });
        console.log(`simulateValidation result:`, result.preOpGas);

    } catch (error) {
        throw error;
    }

    {
        // simulate via bundlerHelper
        // function handleOps(uint expectedPaymentGas, EntryPoint ep, UserOperation[] calldata ops, address payable beneficiary)
        const re = await BundlerHelperContract.methods.handleOps(0, EntryPointAddress, [activateOp], accounts[0]).encodeABI();
        let tx = {
            from: WalletLib.EIP4337.Defines.AddressZero,
            to: BundlerHelperAddress,
            data: re,
        };
        const est = await ethersProvider.estimateGas(tx);
        console.log('est: ' + est);        
    }
    
    {
        const arr1 = await WalletLib.EIP4337.RPC.waitUserOperation(ethersProvider, EntryPointAddress, requestId, 1000 * 5);
        console.log('waitUserOperation result: ', arr1);
    }

    // deploy wallet
    await entrypointContract.methods.handleOps([activateOp], accounts[0]).send({
        from: accounts[0],
        gas: 10000000,
    });
    // wait
    while (await web3.eth.getCode(walletAddress) === '0x') {
        await Utils.sleep(1000);
        console.log('waiting for wallet to be deployed');
    }
    console.log('wallet deployed');

    const nonce = await WalletLib.EIP4337.Utils.getNonce(walletAddress, ethersProvider);
    console.log('nonce: ' + nonce);
    
    const sendErc20Op = await WalletLib.EIP4337.Tokens.ERC20.transferFrom(
        ethersProvider, walletAddress,
        nonce, EntryPointAddress, WETHPaymasterAddress,
        parseInt(web3.utils.toWei('100', 'gwei')),
        parseInt(web3.utils.toWei('10', 'gwei')),
        WETHAddress, walletAddress, accounts[1], web3.utils.toWei('0.1', 'ether')
    );
    if (!sendErc20Op) {
        throw new Error('sendErc20Op is null');
    }
    wethBalance = await wethContract.methods.balanceOf(walletAddress).call();
    console.log('1. Wallet wethBalance: ' + web3.utils.fromWei(wethBalance, 'ether'), 'WETH');

    const sendErc20RequestId = sendErc20Op.getRequestId(EntryPointAddress, chainId);
    const sendErc20Signature = await web3.eth.accounts.sign(sendErc20RequestId, walletUser.privateKey);
    sendErc20Op.signWithSignature(walletUser.address, sendErc20Signature.signature);
    wethBalance = await wethContract.methods.balanceOf(accounts[1]).call();
    console.log(' accounts[1] wethBalance: ' + web3.utils.fromWei(wethBalance, 'ether'), 'WETH');
    await entrypointContract.methods.handleOps([sendErc20Op], accounts[0]).send({
        from: accounts[0],
        gas: 10000000,
    });

    wethBalance = await wethContract.methods.balanceOf(walletAddress).call();
    console.log('2. Wallet wethBalance: ' + web3.utils.fromWei(wethBalance, 'ether'), 'WETH');

    wethBalance = await wethContract.methods.balanceOf(accounts[1]).call();
    console.log(' accounts[1] wethBalance: ' + web3.utils.fromWei(wethBalance, 'ether'), 'WETH');

    const nonce0 = await WalletLib.EIP4337.Utils.getNonce(SmartWalletLogicAddress, ethersProvider);
    console.log('nonce0: ' + nonce0);
    const nonce1 = await WalletLib.EIP4337.Utils.getNonce(walletAddress, ethersProvider);
    console.log('nonce1: ' + nonce1);

    const walletUser1 = await web3.eth.accounts.create();
    console.log('walletUser1: ' + walletUser1.address);
    let walletAddress1 = await WalletLib.EIP4337.calculateWalletAddress(
        SmartWalletLogicAddress, EntryPointAddress, walletUser1.address, WETHAddress, WETHPaymasterAddress, 0, SingletonFactory
    );
    console.log('walletAddress1: ' + walletAddress1);
    await web3.eth.sendTransaction({
        from: accounts[0],
        to: WETHAddress,
        data: '0x',
        gas: 10000000,
        value: web3.utils.toWei('1', 'ether')
    });
    await wethContract.methods.transfer(walletAddress1, web3.utils.toWei('1', 'ether')).send({
        from: accounts[0],
        gas: 10000000,
    });
    wethBalance = await wethContract.methods.balanceOf(walletAddress1).call();
    console.log('Wallet1 wethBalance: ' + web3.utils.fromWei(wethBalance, 'ether'), 'WETH');
    const activateOp1 = WalletLib.EIP4337.activateWalletOp(
        SmartWalletLogicAddress,
        EntryPointAddress,
        WETHPaymasterAddress,
        walletUser1.address,
        WETHAddress,
        parseInt(web3.utils.toWei('100', 'gwei')),
        parseInt(web3.utils.toWei('10', 'gwei')),
        0,
        SingletonFactory
    );
    const requestId1 = activateOp1.getRequestId(EntryPointAddress, chainId);
    console.log('requestId1: ' + requestId1);
    
    const signature1 = await web3.eth.accounts.sign(requestId1, walletUser1.privateKey);
    activateOp1.signWithSignature(walletUser1.address, signature1.signature);

    await entrypointContract.methods.handleOps([activateOp1], accounts[0]).send({
        from: accounts[0],
        gas: 10000000,
    });
    while (await web3.eth.getCode(walletAddress1) === '0x') {
        await Utils.sleep(1000);
        console.log('waiting for wallet to be deployed');
    }
    console.log('wallet1 deployed');
    
    let wethBalance1 = await wethContract.methods.balanceOf(walletAddress1).call();
    console.log('2. Wallet1 wethBalance: ' + web3.utils.fromWei(wethBalance1, 'ether'), 'WETH');

    const nonce2 = await WalletLib.EIP4337.Utils.getNonce(walletAddress1, ethersProvider);
    console.log('nonce2: ' + nonce2);
}

main();