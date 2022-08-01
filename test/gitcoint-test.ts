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
} from "./../scripts/utils";

let gitcoinContract: Contract<FactorySource["GitcoinWarmup"]>;
let signer: Signer;
const program = new Command();
const migration = new Migration();

describe("Test GitcoinWarmup contract", async function () {
  let tokenRoot: Contract<FactorySource["TokenRoot"]>;
  before(async () => {
    gitcoinContract = migration.load("GitcoinWarmup", "gitcoin");
    tokenRoot = migration.load("TokenRoot", "token");
  });
  describe("Contracts", async function () {
    it("Load contract factory", async function () {
      const gitcoinData =
        locklift.factory.getContractArtifacts("GitcoinWarmup");

      expect(gitcoinData.code).not.to.equal(
        undefined,
        "Code should be available"
      );
      expect(gitcoinData.abi).not.to.equal(
        undefined,
        "ABI should be available"
      );
      expect(gitcoinData.tvc).not.to.equal(
        undefined,
        "tvc should be available"
      );
    });

    it("Deploy contract", async function () {
      const INIT_STATE = 0;
      // const { contract } = await locklift.factory.deployContract({
      //   contract: "GitcoinWarmup",
      //   publicKey: signer.publicKey,
      //   initParams: {
      //     _nonce: locklift.utils.getRandomNonce(),
      //   },
      //   constructorParams: {
      //     _deployWalletValue: locklift.utils.toNano(1),
      //     _reward: locklift.utils.toNano(0),
      //     _maxPlayers: 10,
      //     _tokenRoot: tokenRoot,
      //   },
      //   value: locklift.utils.toNano(10),
      // });

      expect(
        await locklift.provider
          .getBalance(gitcoinContract.address)
          .then((balance) => Number(balance))
      ).to.be.above(0);
    });
  });
  describe("Interact with contract", async function () {
    it("Game flow", async function () {
      console.log("game address", gitcoinContract.address.toString());
      const RUNS = 10;
      const batchSize = 5;
      const testbids = [1, 3, 5, 7, 9];
      const getNPlayers = async () =>
        Number.parseInt(
          (await gitcoinContract.methods.nowPlayers({}).call()).nowPlayers
        );

      let accountsFactory = locklift.factory.getAccountsFactory("Account");

      const deploys = [];
      let nplayers = await getNPlayers();

      for (let i = 0; i < 5; i++) {
        const signer = (await locklift.keystore.getSigner(i.toString()))!;
        deploys.push(
          accountsFactory.deployNewAccount({
            publicKey: signer.publicKey,
            initParams: {
              _randomNonce: locklift.utils.getRandomNonce(),
            },
            constructorParams: {},
            value: locklift.utils.toNano(30),
          })
        );
      }
      const wallets = (await Promise.all(deploys)).map((o) => o.account);

      let bids;
      for (let n = 0; n < RUNS; n++) {
        console.log("RUN", n + 1);
        const runs = [];
        nplayers = await getNPlayers();
        console.log("nowPlayers", nplayers);
        for (let i = 0; i < batchSize - 1; i++) {
          runs.push(
            wallets[i].runTarget(
              {
                contract: gitcoinContract,
                value: locklift.utils.toNano(5),
              },
              (gtc) => gtc.methods.placeBid({ _number: testbids[i] })
            )
          );
        }
        await Promise.all(runs);
        bids = await gitcoinContract.methods.bids({}).call();
        console.log(
          "bids",
          bids.bids.map(([a, b]) => [a.toString(), Number.parseInt(b)])
        );
        console.log("w last", wallets[batchSize - 1].address.toString());
        try {
        await wallets[batchSize - 1].runTarget(
          {
            contract: gitcoinContract,
            value: locklift.utils.toNano(5),
          },
          (gtc) => gtc.methods.placeBid({ _number: testbids[batchSize - 1] })
        );
        bids = await gitcoinContract.methods.bids({}).call();
        console.log(
          "bids",
          bids.bids.map(([a, b]) => [a.toString(), Number.parseInt(b)])
        );
        }
        catch (e) {
          console.error(e);
        }
      }

      const { events } = await gitcoinContract.getPastEvents({});
      events.map((e) => {
        console.log(e.data._winningNumber, e.data._winningDelta);
        console.log(e.data._winners.map((a) => a.toString()));
      });

      const tws = [];
      for (let w of wallets) {
        tws.push(
          tokenRoot.methods
            .walletOf({ answerId: 0, walletOwner: w.address })
            .call({ responsible: true })
        );
      }
      const twaddrs = (await Promise.all(tws)).map((o) => o.value0);
      for (let tw of twaddrs) {
        const b = Number.parseInt(await locklift.provider.getBalance(tw));
        if (b > 0) {
          const c = locklift.factory.getDeployedContract("TokenWallet", tw);
          const bal = (
            await c.methods.balance({ answerId: 0 }).call({ responsible: true })
          ).value0;
          console.log("TW", tw.toString(), "balance", bal);
        }
      }
    });
  });
});
