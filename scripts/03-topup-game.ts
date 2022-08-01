import { Address } from "locklift/.";

const { Command } = require("commander");
const {
  logContract,
  isValidEverAddress,
  isNumeric,
  Migration,
} = require("./utils");
const zeroAddress =
  "0:0000000000000000000000000000000000000000000000000000000000000000";
const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 257 });
const logger = require("mocha-logger");
const program = new Command();
const prompts = require("prompts");

const fs = require("fs");
const migration = new Migration();

async function main() {
  const promptsData = [];

  program
    .allowUnknownOption()
    .option("-ro, --root_owner <root_owner>", "Root owner");

  program.parse(process.argv);
  const options = program.opts();
  const signer = await locklift.keystore.getSigner("0");

  const f = locklift.factory.getAccountsFactory("Account");

  const wallet = migration.load("Account", "wallet");
  const gtc = migration.load("GitcoinWarmup", "gitcoin");
  const tr = migration.load("TokenRoot", "token");
  const twaddr = (await tr.methods.walletOf({answerId: 0, walletOwner: wallet.address}).call({responsible: true})).value0;
  const tw = locklift.factory.getDeployedContract("TokenWallet", twaddr);

  const account = f.getAccount(wallet.address, signer.publicKey);
  const balance = (
    await tw.methods.balance({ answerId: 0 }).call({ responsible: true })
  ).value0;
  console.log(balance);

  await account.runTarget(
    {
      contract: tw,
      value: locklift.utils.toNano(1),
    },
    (tw) =>
      tw.methods.transfer({
        amount: 100,
        recipient: gtc.address,
        deployWalletValue: 0,
        remainingGasTo: wallet.address,
        notify: true,
        payload: "te6ccgEBAQEAAgAAAA==",
      })
  );
  console.log(await gtc.methods.balance({}).call());
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
