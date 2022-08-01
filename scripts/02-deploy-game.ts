import { Address } from "locklift/.";

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
const migration = new Migration();

async function main() {
  const promptsData: Object[] = [];
  program
    .allowUnknownOption()
    .option("-kn, --key_number <key_number>", "Public key number")
    .option(
      "-b, --balance <balance>",
      "Initial balance in EVERs (will send from Your wallet)"
    )
    .option("-cn, --contract_name <contract_name>", "Wallet contract name");

  program.parse(process.argv);

  const options = program.opts();

  if (!options.balance) {
    promptsData.push({
      type: "text",
      name: "balance",
      message: "Initial balance (will send from Your wallet)",
      validate: (value) => (isNumeric(value) ? true : "Invalid number"),
    });
  }

  const response = await prompts(promptsData);
  const balance = +(options.balance || response.balance);

  let contractName;
  if (!options.contract_name) {
    const contractPath =
      options.contract_path || response.contractPath || "build";
    contractName = (
      await prompts({
        type: "select",
        name: "contractName",
        message: "Select Gitcoin Warmup contract name",
        choices: [
          ...new Set(fs.readdirSync(contractPath).map((o) => o.split(".")[0])),
        ]
          .filter((value, index, self) => self.indexOf(value) === index)
          .map((e) => new Object({ title: e, value: e })),
      })
    ).contractName;
  } else {
    contractName = options.contract_name;
  }
  let contractName1 = "GitcoinWarmup"

  const signer = (await locklift.keystore.getSigner("0"))!;
  const tokenRootCtr = migration.load("TokenRoot", "token");
  const { contract: gitcoin } = await locklift.factory.deployContract({
    contract: contractName1,
    publicKey: signer.publicKey,
    initParams: {
      tokenRoot: tokenRootCtr.address,
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    constructorParams: {},
    value: locklift.utils.toNano(balance),
  });

  console.log(`Gitcoin deployed at: ${gitcoin.address}`);

  const tw = await gitcoin.methods.tokenWallet({}).call();
  const balanceWallet = await gitcoin.methods.balance({}).call();
  console.log(tw);

  migration.store(gitcoin, "gitcoin");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
