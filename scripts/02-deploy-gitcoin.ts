import { ContractWithName } from "locklift/build/types";

const { Command } = require("commander");
const {
  logContract,
  isValidEverAddress,
  isNumeric,
  Migration,
} = require("./../scripts/utils");

const logger = require("mocha-logger");
const program = new Command();
const prompts = require("prompts");
const fs = require("fs");
async function main() {
  const promptsData: object[] = [];
  program
    .allowUnknownOption()
    .option("-kn, --key_number <key_number>", "Public key number")
    .option(
      "-b, --balance <balance>",
      "Initial balance in EVERs (will send from Your wallet)",
    )
    .option("-r, --reward <reward>", "Amount of reward for 1 game")
    .option("-mp, --max_players <max_players>", "Number of players for 1 game")
    .option("-tr, --token_root <token_root>", "TIP3 Token root");

  program.parse(process.argv);

  const options = program.opts();

  if (!options.key_number) {
    promptsData.push({
      type: "text",
      name: "keyNumber",
      message: "Public key number",
      validate: value => (isNumeric(value) ? true : "Invalid number"),
    });
  }

  if (!options.balance) {
    promptsData.push({
      type: "text",
      name: "balance",
      message: "Initial balance (will send from Your wallet)",
      validate: value => (isNumeric(value) ? true : "Invalid number"),
    });
  }

  if (!options.reward) {
    promptsData.push({
      type: "text",
      name: "reward",
      message: "Amount of reward for 1 game",
      validate: value => (isNumeric(value) ? true : "Invalid number"),
    });
  }
  if (!options.max_players) {
    promptsData.push({
      type: "text",
      name: "maxPlayers",
      message: "Number of players for 1 game",
      validate: value => (isNumeric(value) ? true : "Invalid number"),
    });
  }

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

  const keyNumber = +(options.key_number || response.keyNumber);
  const balance = +(options.balance || response.balance);
  const reward = +(options.reward || response.reward);
  const maxPlayers = +(options.max_players || response.maxPlayers);
  const tokenRoot = options.token_root || response.tokenRoot;
  const contractPath =
    options.contract_path || response.contractPath || "build";

  const signer = (await locklift.keystore.getSigner(keyNumber.toString()))!;

  const { contract: sample, tx } = await locklift.factory.deployContract({
    contract: "GitcoinWarmup",
    publicKey: signer.publicKey,
    initParams: {
      _nonce: locklift.utils.getRandomNonce(),
    },
    constructorParams: {
      _deployWalletValue: locklift.utils.toNano(balance),
      _reward: reward,
      _maxPlayers: maxPlayers,
      _tokenRoot: tokenRoot,
    },
    value: locklift.utils.toNano(balance + 5),
  });
  const gitcoin = locklift.factory.getDeployedContract(
    "GitcoinWarmup",
    sample.address,
  );

  const tokenWallet = await gitcoin.methods.tokenWallet({}).call();

  console.log(`TIP3 Wallet deployed at: ${tokenWallet.tokenWallet}`);
  console.log(`Gitcoin deployed at: ${sample.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
