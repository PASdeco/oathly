export type PledgeStatus =
  | "ACTIVE"
  | "AWAITING_VERDICT"
  | "KEPT"
  | "BROKEN"
  | "SETTLED"
  | "UNCLEAR_HOLD"
  | "CANCELLED"
  | "INCONCLUSIVE";

export interface Checkin {
  t: number;
  note: string;
  url: string;
}

export interface EvidenceAudit {
  url: string;
  ok: boolean;
  status: number;
  fp: string;
  dates: string[];
  fetched_at: number;
}

export type PayoutState = "NONE" | "UNCLAIMED" | "EMITTED";

export interface Payout {
  to: string;
  kind: string;
  state: PayoutState;
  amount_wei: number;
}

export interface Bond {
  to: string;
  state: PayoutState;
  amount_wei: number;
}

export interface AppealRecord {
  by: string;
  reason: string;
  evidence: string[];
  rerun_outcome: string;
  rerun_class: string;
  flipped: boolean;
  decided_at: number;
}

export interface FirstReview {
  verdict: string;
  reason: string;
  evidence: EvidenceAudit[];
  verified_at: number;
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
  evidence: EvidenceAudit[];
  checkins: Checkin[];
  activity: { t: number; e: string; d: string }[];
  created_at: number;
  verified_at: number;
  appeal_used: boolean;
  settled: boolean;
  hold_until: number;
  hold_used: boolean;
  hold_class: string;
  appeal_deadline: number;
  payout: Payout;
  bond: Bond;
  appeal: AppealRecord | null;
  first_review: FirstReview | null;
}

export interface Policy {
  min_stake_wei: number;
  bond_wei: number;
  min_lead_seconds: number;
  cooling_seconds: number;
  grace_seconds: number;
  appeal_window_seconds: number;
  max_sources: number;
  max_extra_sources: number;
  max_appeal_evidence: number;
  max_checkins: number;
  treasury: string;
  templates: string[];
}

export function stakeToGen(wei: number): string {
  return (wei / 1e18).toFixed(4).replace(/0+$/, "").replace(/\.$/, ".0");
}
