External Http Provider
Close
Note: To use Geth & https://remix.ethereum.org, configure it to allow requests from Remix:(see Geth Docs on rpc server)
geth --http --http.corsdomain https://remix.ethereum.org

To run Remix & a local Geth test node, use this command: (see Geth Docs on Dev mode)
geth --http --http.corsdomain="https://remix.ethereum.org" --http.api web3,eth,debug,personal,net --vmdebug --datadir <path/to/local/folder/for/test/chain> --dev console


WARNING: It is not safe to use the --http.corsdomain flag with a wildcard: --http.corsdomain *

For more info: Remix Docs on External HTTP Provider

External HTTP Provider Endpoint
http://127.0.0.1:8545

moment enhance stool bean jeans someone breeze danger upset autumn logic maze


miner.start(1)
miner.start()
miner.stop()


acc=eth.accounts[1]
personal.unlockAccount(acc)

personal.unlockAccount(eth.accounts[1])

personal.newAccount()：
personal.unlockAccount()：
eth.accounts：
eth.getBalance()：check balance, returning unit Wei（1 ether = 10^18 Wei）；
eth.blockNumber：
eth.getTransaction()：
eth.getBlock()：
miner.start()：
miner.stop()：
web3.fromWei()：Wei to ether
web3.toWei()：ether to Wei；
txpool.status：
admin.addPeer()：

personal.newAccount()
eth.accounts
eth.getBalance(eth.accounts[0])
miner.start(1) // 1 means 1 thread
miner.start(1);admin.sleepBlocks(1);miner.stop();
eth.blockNumber
eth.getBlock(4)
admin.peers
net.peerCount

docker-componse run --service-ports ethereum

geth --identity "miner_node" --datadir /dapp --networkid 202208071 --http --http.addr 0.0.0.0 --http.port 8545 --port 30303 --http.api web3,eth,debug,personal,net --http.corsdomain="https://remix.ethereum.org" --http.vhosts "*" --nodiscover --allow-insecure-unlock console

0xB9D84AbEC4f11F6779C3cbCA2Ab65530D18E5Ef6 deployed contract

const ethers = require("ethers");
const CONTRACT_ID = "0xB9D84AbEC4f11F6779C3cbCA2Ab65530D18E5Ef6";
const Contract = require('./MyToken.json');
const localURL = "http://127.0.0.1:8545/";
const localProvider2 = new ethers.providers.JsonRpcProvider(localURL);
let contract = new ethers.Contract(CONTRACT_ID, Contract.abi, localProvider2);


let signer = new ethers.Wallet("07e73448459604a8caa11f3a2f95f9267d1d0930994889ab68f69612d732c6ba", localProvider2);
let contractWithSigner = new ethers.Contract(CONTRACT_ID, Contract.abi, signer);

const tx = await contractWithSigner.transfer("0x20471e8d211fd0552cAE87C4e9B54EA15b82AF66", "0x900000000000");
0x01f04ef12cafbcf158000000
0x01f04ef12cb04cf158000000
0x900000000000
900000000000