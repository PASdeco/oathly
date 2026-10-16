export type PledgeStatus =
  | "ACTIVE"
  | "AWAITING_VERDICT"
  | "KEPT"
  | "BROKEN"
  | "SETTLED"
  | "UNCLEAR_HOLD"
  | "CANCELLED";

export interface Checkin {
  t: number;
  note: string;
  url: string;
}

export interface Pledge {
  pledge_id: string;
  owner: string;
  goal: string;
  criteria: string;
  template: string;
  proof_sources: string[];
  deadline: number;
  stake_wei: number;
  recipient: string;
  status: PledgeStatus;
  verdict: string;
  verdict_reason: string;
  evidence: string[];
  checkins: Checkin[];
  activity: { t: number; e: string }[];
  created_at: number;
  verified_at: number;
  appeal_used: boolean;
  settled: boolean;
  hold_until: number;
  appeal_deadline: number;
}

export function stakeToGen(wei: number): string {
  return (wei / 1e18).toFixed(4).replace(/0+$/, "").replace(/\.$/, ".0");
}
