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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Test GitcoinWarmup contract", async function () {
  let tokenRoot;
  before(async () => {
    signer = (await locklift.keystore.getSigner("0"))!;
    const promptsData = [];
    program
      .allowUnknownOption()
      .option("-tr, --token_root <token_root>", "Token Root address");

    program.parse(process.argv);

    const options = program.opts();
    if (!isValidEverAddress(options.token_root)) {
      promptsData.push({
        type: "text",
        name: "tokenRoot",
        message: "TIP3 Token root",
        validate: value =>
          isValidEverAddress(value) ? true : "Invalid EVER address",
      });
    }
    const response = await prompts(promptsData);
    tokenRoot = options.token_root || response.tokenRoot;
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
      ("0:946cb71dca1ffaa4a94a0834b99a8327548d4040ce211be06385c1f277671fd0");
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
      const gitcoin = locklift.factory.getDeployedContract(
        "GitcoinWarmup", //name infered from your contracts
        "0:5e124ec7ddf10d07b30da1f5b521af91e3b418bd6258189a0f6e129eb6644613",
      );
      gitcoinContract = gitcoin; //contract;

      expect(
        await locklift.provider
          .getBalance(gitcoinContract.address)
          .then(balance => Number(balance)),
      ).to.be.above(0);
    });
  });
  describe("Interact with contract", async function () {
    it("Game flow", async function () {
      const BID_1 = 24;
      const account1 = locklift.factory.getDeployedContract(
        "Account", //name infered from your contracts
        "0:901f0a28da3b5426ebf23675dbfc6a112469de6ab49e6e81b0e0a2f4327882e8",
      );
      const accountGit = locklift.factory.getDeployedContract(
        "GitcoinWarmup", //name infered from your contracts
        "0:5e124ec7ddf10d07b30da1f5b521af91e3b418bd6258189a0f6e129eb6644613",
      );
      let accountsFactory = locklift.factory.getContractArtifacts("Account");
      console.log(1122);
      const myAddr = new Address(
        "0:d2627cc8d143f14c812e5c57bdde9e5d8226a7785b9a02fdb9de1e74ca63b014",
      );
      const gitcoinWarmupData = await locklift.factory.getContractArtifacts(
        "GitcoinWarmup",
      );
      const myWallet = accountsFactory.getAccount(myAddr, signer.publicKey);
      await myWallet.runTarget(
        {
          contract: accountGit,
          value: locklift.utils.toNano(5),
        },
        gtc => {
          console.log(gtc);
          return gtc.methods.placeBid({
            _number: BID_1,
          });
        },
      );

      //await sleep(10000);

      const tokenWallet = await gitcoinContract.methods.tokenWallet({}).call();
      console.log(tokenWallet);
      const bids = await gitcoinContract.methods.bids({}).call();
      console.log(222111);
      const players = await gitcoinContract.methods.players({}).call();
      console.log(bids);
      console.log(players);
      // it("Interact with contract", async function () {

      //

      //   expect(Number(response._state)).to.be.equal(NEW_STATE, "Wrong state");
      // });
    });
  });
});
