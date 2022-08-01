import { Command } from "commander";
import prompts from "prompts";
import { expect } from "chai";
import { Contract, Signer, Address } from "locklift";
import { FactorySource } from "../build/factorySource";
import {
  logContract,
  isValidEverAddress,
  isNumeric,
  Migration,
  zeroAddress,
  EMPTY_TVM_CELL,
} from "./../scripts/utils";

let gitcoinContract: Contract<FactorySource["GitcoinWarmup"]>;
let signer: Signer;
let wallets = {};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const keyNumber = "0";

const DECIMALS = 6;
const NAME = "Gitcoin Warmup TIP3 Token";
const SYMBOL = "GWT3";
const REWARD = 1000 * 10 ** DECIMALS;
const MAX_PLAYERS = 10;

describe("Test GitcoinWarmup contract", async function () {
  before(async () => {
    signer = (await locklift.keystore.getSigner(keyNumber))!;
  });
  describe("Contracts", async function () {
    it("Load contract factory", async function () {
      const gitcoinData =
        locklift.factory.getContractArtifacts("GitcoinWarmup");

      expect(gitcoinData.code).not.to.equal(
        undefined,
        "Code should be available",
      );
      expect(gitcoinData.abi).not.to.equal(
        undefined,
        "ABI should be available",
      );
      expect(gitcoinData.tvc).not.to.equal(
        undefined,
        "tvc should be available",
      );
    });

    it("Deploy contract", async function () {
      const INIT_STATE = 0;
      let accountsFactory = locklift.factory.getAccountsFactory("Account");

      for (let i = 0; i < MAX_PLAYERS; i++) {
        const keyPair = (await locklift.keystore.getSigner(i.toString()))!;
        try {
          const { account: wallet } = await accountsFactory.deployNewAccount({
            publicKey: keyPair.publicKey,
            initParams: {
              _randomNonce: locklift.utils.getRandomNonce(),
            },
            constructorParams: {},
            value: locklift.utils.toNano(200),
          });
          wallets[i] = wallet;
        } catch (err) {}
      }
      const wallet = wallets[0];
      const tokenWalletData =
        locklift.factory.getContractArtifacts("TokenWallet");
      const { contract: tokenRoot } = await locklift.factory.deployContract({
        workchain: 0,
        contract: "TokenRoot",
        publicKey: signer.publicKey,
        initParams: {
          deployer_: new Address(zeroAddress),
          randomNonce_: (Math.random() * 6400) | 0,
          rootOwner_: wallet.address,
          name_: NAME,
          symbol_: SYMBOL,
          decimals_: DECIMALS,
          walletCode_: tokenWalletData.code,
        },
        constructorParams: {
          initialSupplyTo: new Address(zeroAddress),
          initialSupply: 0,
          deployWalletValue: locklift.utils.toNano(10),
          mintDisabled: false,
          burnByRootDisabled: false,
          burnPaused: false,
          remainingGasTo: new Address(zeroAddress),
        },
        value: locklift.utils.toNano(15),
      });
      const { contract: gitcoin } = await locklift.factory.deployContract({
        contract: "GitcoinWarmup",
        publicKey: signer.publicKey,
        initParams: {
          _nonce: locklift.utils.getRandomNonce(),
        },
        constructorParams: {
          _deployWalletValue: locklift.utils.toNano(5),
          _reward: REWARD,
          _maxPlayers: MAX_PLAYERS,
          _tokenRoot: tokenRoot.address,
        },
        value: locklift.utils.toNano(10),
      });
      gitcoinContract = gitcoin;

      const myWallet = accountsFactory.getAccount(
        wallet.address,
        signer.publicKey,
      );
      await myWallet.runTarget(
        {
          contract: tokenRoot,
          value: locklift.utils.toNano(5),
        },
        tRoot => {
          return tRoot.methods.mint({
            amount: 1500 * 10 ** DECIMALS,
            recipient: gitcoin.address,
            deployWalletValue: locklift.utils.toNano(1),
            remainingGasTo: wallet.address,
            notify: true,
            payload: EMPTY_TVM_CELL,
          });
        },
      );
      const balance = await gitcoinContract.methods.balance({}).call();

      expect(balance.balance).to.be.equal(`${1500 * 10 ** DECIMALS}`);
      expect(
        await locklift.provider
          .getBalance(gitcoinContract.address)
          .then(balance => Number(balance)),
      ).to.be.above(0);
    });
  });
  describe("Interact with contract", async function () {
    it("Game flow", async function () {
      const BIDS = [24, 31, 42, 92, 42, 65, 42, 7, 2, 12];

      const accountGit = locklift.factory.getDeployedContract(
        "GitcoinWarmup",
        gitcoinContract.address,
      );

      for (let i = 0; i < MAX_PLAYERS; i++) {
        const myWallet = wallets[i];
        await myWallet.runTarget(
          {
            contract: accountGit,
            value: locklift.utils.toNano(1),
          },
          gtc => {
            return gtc.methods.placeBid({
              _number: BIDS[i],
            });
          },
        );

        const bids = (await gitcoinContract.methods.bids({}).call()).bids;
        const bidsMap = new Map(
          bids.map(object => {
            return [object[0].toString(), object[1]];
          }),
        );
        console.log(bidsMap);
        const players = (await gitcoinContract.methods.players({}).call())
          .players;

        expect(bidsMap.get(myWallet.address.toString())).to.be.equal(
          BIDS[i].toString(),
          "Wrong bid",
        );
        expect(players[i].toString()).to.be.equal(myWallet.address.toString());
      }

      const pastEvents = await gitcoinContract.getPastEvents({
        filter: event => event.event === "gameResult",
      });
      console.log(pastEvents);
    });
  });
});
