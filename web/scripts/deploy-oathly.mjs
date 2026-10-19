/**
 * Deploys OathlyPledge to StudioNet. Run: node scripts/deploy-oathly.mjs
 * Env: BACKEND_PRIVATE_KEY in oathly/.env
 * Optional: GRACE_SECONDS / APPEAL_WINDOW_SECONDS (demo defaults: 600 / 900)
 */
import { readFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

process.loadEnvFile(new URL("../../.env", import.meta.url));

const grace = Number(process.env.GRACE_SECONDS ?? 600);
const appealWindow = Number(process.env.APPEAL_WINDOW_SECONDS ?? 900);
if (!Number.isInteger(grace) || grace < 60 || grace > 604800) {
  throw new Error("GRACE_SECONDS must be an integer between 60 and 604800");
}
if (!Number.isInteger(appealWindow) || appealWindow < 60 || appealWindow > 604800) {
  throw new Error("APPEAL_WINDOW_SECONDS must be an integer between 60 and 604800");
}

const account = createAccount(process.env.BACKEND_PRIVATE_KEY);
const client = createClient({ chain: studionet, account });
console.log("network: studionet deployer:", account.address);
console.log(`constructor: grace=${grace}s appeal_window=${appealWindow}s`);

const code = readFileSync(new URL("../../contracts/oathly_pledge.py", import.meta.url), "utf8");
const txHash = await client.deployContract({ code, args: [grace, appealWindow] });
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

if (address) {
  const policy = await client.readContract({
    address,
    functionName: "get_policy",
    args: [],
  });
  console.log("policy:", JSON.stringify(policy, null, 2));
}
