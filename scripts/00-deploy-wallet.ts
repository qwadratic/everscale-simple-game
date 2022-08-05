import { Command } from "commander";
import prompts from "prompts";

import { isNumeric, Migration } from "./../scripts/utils";

const program = new Command();

const migration = new Migration();

async function main() {
  const promptsData: object[] = [];
  program
    .allowUnknownOption()
    .option("-kn, --key_number <key_number>", "Public key number")
    .option(
      "-b, --balance <balance>",
      "Initial balance in EVERs (will send from Giver)",
    );

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
      message: "Initial balance (will send from Giver)",
      validate: value => (isNumeric(value) ? true : "Invalid number"),
    });
  }

  const response = await prompts(promptsData);

  const keyNumber = +(options.key_number || response.keyNumber);
  const balance = +(options.balance || response.balance);

  const signer = (await locklift.keystore.getSigner(keyNumber.toString()))!;
  let accountsFactory = locklift.factory.getAccountsFactory("Account");

  const { account: Account } = await accountsFactory.deployNewAccount({
    publicKey: signer.publicKey,
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    constructorParams: {},
    value: locklift.utils.toNano(balance),
  });
  console.log(`Wallet deployed at: ${Account.address}`);
  migration.store(Account, "wallet");
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
