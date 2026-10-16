/**
 * Deploys OathlyPledge to StudioNet. Run: node scripts/deploy.mjs
 * Env: BACKEND_PRIVATE_KEY in oathly/.env
 */
import { readFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

process.loadEnvFile(new URL("../../.env", import.meta.url));

const account = createAccount(process.env.BACKEND_PRIVATE_KEY);
const client = createClient({ chain: studionet, account });
console.log("network: studionet deployer:", account.address);

const code = readFileSync(new URL("../../contracts/oathly_pledge.py", import.meta.url), "utf8");
const txHash = await client.deployContract({ code });
console.log("tx:", txHash);
const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: "ACCEPTED",
  interval: 3000,
  retries: 100,
  fullTransaction: true,
});
const address =
  receipt?.contract_address ??
  receipt?.contractAddress ??
  receipt?.data?.contract_address ??
  receipt?.address;
console.log("OATHLY_CONTRACT_ADDRESS=" + address);
