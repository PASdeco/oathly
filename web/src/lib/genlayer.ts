import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { Hash } from "genlayer-js/types";
import type { Pledge, Policy } from "@/lib/types";
import { MOCK_OATHS } from "@/lib/mock";
import { CONTRACT_ADDRESS, MOCK_MODE } from "@/lib/config";

function contractAddress(): `0x${string}` {
  return (CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000") as `0x${string}`;
}

export function isMockMode(): boolean {
  return MOCK_MODE;
}

function readClient() {
  return createClient({
    chain: studionet,
    account: createAccount(),
  });
}

function browserClient(address: string, provider: unknown) {
  return createClient({
    chain: studionet,
    account: address as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: provider as any,
  });
}

/**
 * genlayer-js `connect()` demands the MetaMask Flask Snap
 * (wallet_getSnaps), which most wallets don't support. Signing itself only
 * needs standard EIP-1193 (eth_sendTransaction), so connect is best-effort:
 * chain placement is enforced by our own switcher + the client's
 * send-time chain check, which throws a clear message when wrong.
 */
async function bestEffortConnect(
  client: ReturnType<typeof readClient>
): Promise<void> {
  try {
    await client.connect("studionet");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("genlayer connect (snap setup) skipped:", e);
  }
}

export async function fetchWall(status = "ALL", cursor = 0) {
  if (isMockMode()) {
    const filtered =
      status === "ALL"
        ? MOCK_OATHS
        : MOCK_OATHS.filter((p) => {
            if (status === "IN_PROGRESS")
              return ["ACTIVE", "UNCLEAR_HOLD", "AWAITING_VERDICT"].includes(
                p.status
              );
            return p.status === status;
          });
    return {
      pledges: filtered as Pledge[],
      next_cursor: -1,
      total: filtered.length,
    };
  }
  const client = readClient();
  return (await client.readContract({
    address: contractAddress(),
    functionName: "list_pledges",
    args: [status, cursor],
  })) as unknown as {
    pledges: Pledge[];
    next_cursor: number;
    total: number;
  };
}

export async function fetchPledge(id: string): Promise<Pledge> {
  if (isMockMode()) {
    const found = MOCK_OATHS.find((p) => p.pledge_id === id);
    if (!found) throw new Error("Oath not found.");
    return found;
  }
  const client = readClient();
  return (await client.readContract({
    address: contractAddress(),
    functionName: "get_pledge",
    args: [id],
  })) as unknown as Pledge;
}

export interface WriteResult {
  txId: string;
}

export async function fetchByOwner(owner: string): Promise<Pledge[]> {
  if (isMockMode()) {
    return MOCK_OATHS.filter(
      (p) => p.owner.toLowerCase() === owner.toLowerCase()
    ) as Pledge[];
  }
  const client = readClient();
  const res = (await client.readContract({
    address: contractAddress(),
    functionName: "list_by_owner",
    args: [owner],
  })) as unknown as { pledges: Pledge[]; count: number };
  return res.pledges;
}

export async function fetchByRecipient(recipient: string): Promise<Pledge[]> {
  if (isMockMode()) {
    return MOCK_OATHS.filter(
      (p) => p.recipient.toLowerCase() === recipient.toLowerCase()
    ) as Pledge[];
  }
  const client = readClient();
  const res = (await client.readContract({
    address: contractAddress(),
    functionName: "list_by_recipient",
    args: [recipient],
  })) as unknown as { pledges: Pledge[]; count: number };
  return res.pledges;
}

export interface ProfileStats {
  address: string;
  kept: number;
  broken: number;
  active: number;
  settled: number;
  inconclusive: number;
  claimable: number;
}

export async function fetchProfile(address: string): Promise<ProfileStats> {
  if (isMockMode()) {
    const mine = MOCK_OATHS.filter(
      (p) => p.owner.toLowerCase() === address.toLowerCase()
    );
    return {
      address,
      kept: mine.filter((p) => p.verdict === "KEPT").length,
      broken: mine.filter((p) => p.verdict === "BROKEN").length,
      active: mine.filter((p) =>
        ["ACTIVE", "UNCLEAR_HOLD", "AWAITING_VERDICT"].includes(p.status)
      ).length,
      settled: mine.filter((p) => p.settled).length,
      inconclusive: mine.filter((p) => p.verdict === "INCONCLUSIVE").length,
      claimable: mine.filter(
        (p) => p.payout.state === "UNCLAIMED" || p.bond.state === "UNCLAIMED"
      ).length,
    };
  }
  const client = readClient();
  return (await client.readContract({
    address: contractAddress(),
    functionName: "get_profile",
    args: [address],
  })) as unknown as ProfileStats;
}

export async function fetchPolicy(): Promise<Policy> {
  if (isMockMode()) {
    return {
      min_stake_wei: 1e15,
      bond_wei: 1e15,
      min_lead_seconds: 300,
      cooling_seconds: 3600,
      grace_seconds: 172800,
      appeal_window_seconds: 172800,
      max_sources: 3,
      max_extra_sources: 2,
      max_appeal_evidence: 2,
      max_checkins: 20,
      treasury: "0x0000000000000000000000000000000000000000",
      templates: ["ship_code", "publish_posts", "public_page", "custom"],
    };
  }
  const client = readClient();
  return (await client.readContract({
    address: contractAddress(),
    functionName: "get_policy",
    args: [],
  })) as unknown as Policy;
}

async function waitAccepted(txId: string) {
  const client = readClient();
  const receipt = await client.waitForTransactionReceipt({
    hash: txId as Hash,
    status: TransactionStatus.ACCEPTED,
    interval: 3000,
    retries: 100,
  });
  const execName =
    (receipt as { txExecutionResultName?: string }).txExecutionResultName ??
    (receipt as { tx_execution_result_name?: string }).tx_execution_result_name;
  if (execName === "FINISHED_WITH_ERROR") {
    const reason = String(
      (receipt as { revert_reason?: string }).revert_reason ?? ""
    );
    throw new Error(
      reason ? "Transaction reverted: " + reason : "Transaction failed consensus."
    );
  }
  return receipt;
}

export async function createPledgeTx(args: {
  from: string;
  provider: unknown;
  goal: string;
  criteria: string;
  template: string;
  proof_sources: string[];
  deadline: number;
  recipient: string;
  stakeWei: bigint;
}): Promise<WriteResult> {
  const client = browserClient(args.from, args.provider);
  await bestEffortConnect(client);
  const txId = (await client.writeContract({
    address: contractAddress(),
    functionName: "create_pledge",
    args: [
      args.goal,
      args.criteria,
      args.template,
      args.proof_sources,
      args.deadline,
      args.recipient,
    ],
    value: args.stakeWei,
  })) as unknown as string;
  await waitAccepted(txId);
  return { txId };
}

export async function callPledgeMethod(args: {
  from: string;
  provider: unknown;
  method: string;
  methodArgs: unknown[];
  value?: bigint;
}): Promise<WriteResult> {
  const client = browserClient(args.from, args.provider);
  await bestEffortConnect(client);
  const base = {
    address: contractAddress(),
    functionName: args.method,
    args: args.methodArgs as never[],
  };
  const txId = (
    args.value !== undefined
      ? await client.writeContract({ ...base, value: args.value })
      : await client.writeContract({ ...base, value: BigInt(0) })
  ) as unknown as string;
  await waitAccepted(txId);
  return { txId };
}

export function explorerTxUrl(txId: string): string {
  const base =
    process.env.NEXT_PUBLIC_EXPLORER_URL ??
    "https://explorer-studio.genlayer.com";
  return base.replace(/\/$/, "") + "/tx/" + txId;
}
