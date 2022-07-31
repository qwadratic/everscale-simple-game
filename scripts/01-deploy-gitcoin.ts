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
  const promptsData = [];
  program
    .allowUnknownOption()
    .option("-kn, --key_number <key_number>", "Public key number")
    .option(
      "-b, --balance <balance>",
      "Initial balance in EVERs (will send from Your wallet)",
    )
    .option("-r, --reward <reward>", "Amount of reward for 1 game")
    .option("-mp, --max_players <max_players>", "Number of players for 1 game")
    //.option("-tr, --token_root <token_root>", "TIP3 Token root")
    .option("-cn, --contract_name <contract_name>", "Wallet contract name");

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

  let contractName;
  if (!options.contract_name) {
    contractName = (
      await prompts({
        type: "select",
        name: "contractName",
        message: "Select Gitcoin Warmup contract name",
        choices: [
          ...new Set(fs.readdirSync(contractPath).map(o => o.split(".")[0])),
        ]
          .filter((value, index, self) => self.indexOf(value) === index)
          .map(e => new Object({ title: e, value: e })),
      })
    ).contractName;
  } else {
    contractName = options.contract_name;
  }

  const signer = (await locklift.keystore.getSigner("0"))!;

  const { contract: sample, tx } = await locklift.factory.deployContract({
    contract: contractName,
    publicKey: signer.publicKey,
    initParams: {
      _nonce: 0, //locklift.utils.getRandomNonce(),
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
    "GitcoinWarmup", //name infered from your contracts
    `${sample.address.toString()}`,
  );

  const tokenWallet = await gitcoin.methods.tokenWallet({}).call();
  const balanceWallet = await gitcoin.methods.balance({}).call();
  console.log(tokenWallet);
  console.log(balanceWallet);
  console.log(`Gitcoin deployed at: ${sample.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
