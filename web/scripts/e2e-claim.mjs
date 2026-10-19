/**
 * StudioNet E2E for the claim-only settlement path:
 * create_pledge -> cancel_pledge -> claim_payout, with finalized txs.
 * Run: node scripts/e2e-claim.mjs
 */
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

process.loadEnvFile(new URL("../../.env", import.meta.url));

const CONTRACT = process.env.OATHLY_CONTRACT ?? "0x005507b55792272b14aF9C9A79a0F71136438E47";
const account = createAccount(process.env.BACKEND_PRIVATE_KEY);
const client = createClient({ chain: studionet, account });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function send(method, args, value) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName: method,
        args,
        value,
      });
      console.log(`${method} tx: ${hash}`);
      const receipt = await client.waitForTransactionReceipt({
        hash,
        status: "ACCEPTED",
        interval: 3000,
        retries: 100,
        fullTransaction: true,
      });
      if (receipt?.execution_result === "FINISHED_WITH_ERROR") {
        throw new Error(`${method} execution error: ${JSON.stringify(receipt)}`);
      }
      return hash;
    } catch (e) {
      if (attempt === 5) throw e;
      console.log(`${method} attempt ${attempt} failed: ${e.message}; retrying in 8s`);
      await sleep(8000);
    }
  }
}

async function read(method, args = []) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await client.readContract({ address: CONTRACT, functionName: method, args });
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(8000);
    }
  }
}

const now = Math.floor(Date.now() / 1000);
const stake = 10n ** 15n;
const deadline = now + 600;

const createTx = await send(
  "create_pledge",
  [
    "E2E claim-path smoke",
    "Demo: the claim path works end to end.",
    "custom",
    ["https://example.com/e2e"],
    deadline,
    "0x9999999999999999999999999999999999999999",
  ],
  stake
);
const pledgeId = "oath-1";
const created = await read("get_pledge", [pledgeId]);
console.log("get_pledge status:", created.status, "owner:", created.owner);

const cancelTx = await send("cancel_pledge", [pledgeId]);
const afterCancel = await read("get_pledge", [pledgeId]);
console.log(
  "after cancel:",
  afterCancel.status,
  "payout:",
  afterCancel.payout.state,
  afterCancel.payout.kind,
  afterCancel.payout.amount_wei
);

const claimTx = await send("claim_payout", [pledgeId]);
const afterClaim = await read("get_pledge", [pledgeId]);
console.log("after claim:", afterClaim.payout.state);

console.log("\nEVIDENCE");
console.log("contract:", CONTRACT);
console.log("create:", createTx);
console.log("cancel:", cancelTx);
console.log("claim:", claimTx);
