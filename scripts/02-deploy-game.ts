import { Command } from "commander";
import { isNumeric, Migration } from "./../scripts/utils";

import prompts from "prompts";

const migration = new Migration();
const program = new Command();

async function main() {
  const CONTRACT_NAME = "GitcoinWarmup";
  const signer = (await locklift.keystore.getSigner("0"))!;
  const promptsData: Object[] = [];
  program
    .allowUnknownOption()
    .option("-kn, --key_number <key_number>", "Public key number")
    .option(
      "-b, --balance <balance>",
      "Initial balance in EVERs (will send from Your wallet)",
    )
    .option("-r, --reward <reward>", "Amount of reward for 1 game")
    .option("-mp, --max_players <max_players>", "Number of players for 1 game");
  //.option("-cn, --contract_name <contract_name>", "Wallet contract name");

  program.parse(process.argv);

  const options = program.opts();

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
  const response = await prompts(promptsData);
  const balance = +(options.balance || response.balance);
  const reward = +(options.reward || response.reward);
  const maxPlayers = +(options.max_players || response.maxPlayers);
  // const contractPath =
  //   options.contract_path || response.contractPath || "build";
  // let contractName1;
  // if (!options.contract_name) {
  //   const contracts = locklift.factory.getAllArtifacts();
  //   console.log(11);
  //   const contractName = (
  //     await prompts({
  //       type: "select",
  //       name: "contractName",
  //       message: "Select Gitcoin Warmup contract name",
  //       choices: [
  //         ...new Set(fs.readdirSync(contractPath).map(o => o.split(".")[0])),
  //       ]
  //         .filter((value, index, self) => self.indexOf(value) === index)
  //         .map(e => new Object({ title: e, value: e })),
  //     })
  //   ).contractName;
  //   console.log;
  // } else {
  //   contractName = options.contract_name;
  // }

  const tokenRootCtr = migration.load("TokenRoot", "token");

  const { contract: gitcoin } = await locklift.factory.deployContract({
    contract: CONTRACT_NAME,
    publicKey: signer.publicKey,
    initParams: {
      _randomNonce: locklift.utils.getRandomNonce(),
    },
    constructorParams: {
      _deployWalletBalance: locklift.utils.toNano(5),
      _reward: reward,
      _maxPlayers: maxPlayers,
      _tokenRoot: tokenRootCtr.address,
      _maxBid: 10,
    },
    value: locklift.utils.toNano(balance),
  });

  console.log(`Gitcoin deployed at: ${gitcoin.address}`);

  const tw = await gitcoin.methods.tokenWallet({}).call();
  console.log(tw);

  migration.store(gitcoin, "gitcoin");
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
