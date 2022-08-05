import { GitcoinWarmupAbi, TokenRootAbi } from "build/factorySource";
import { Command } from "commander";
import { Migration, EMPTY_TVM_CELL } from "./utils";
import { Contract } from "locklift";

const BigNumber = require("bignumber.js");
BigNumber.config({ EXPONENTIAL_AT: 257 });
const program = new Command();

const migration = new Migration();

async function main() {
  program.allowUnknownOption();

  program.parse(process.argv);
  const signer = (await locklift.keystore.getSigner("0"))!;

  const f = locklift.factory.getAccountsFactory("Account");

  const wallet = migration.load("Account", "wallet");
  const gtc: Contract<GitcoinWarmupAbi> = migration.load(
    "GitcoinWarmup",
    "gitcoin",
  );
  const tr: Contract<TokenRootAbi> = migration.load("TokenRoot", "token");
  const twaddr = (
    await tr.methods
      .walletOf({ answerId: 0, walletOwner: wallet.address })
      .call({ responsible: true })
  ).value0;
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
    tw =>
      tw.methods.transfer({
        amount: 100,
        recipient: gtc.address,
        deployWalletValue: 0,
        remainingGasTo: wallet.address,
        notify: true,
        payload: EMPTY_TVM_CELL,
      }),
  );
  console.log(await gtc.methods.balance({}).call());
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
