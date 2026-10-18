"""Direct-mode tests for OathlyPledge covering the reviewer corrections.

Coverage map:
- deadline enforcement before verdict/appeal/settle (adversarial wallets)
- validator equivalence: outcome/class equality, evidence allowlist, dated proof
- non-affirmation policy: retrieval failures and undated claims never become
  NOT_MET; two accessible "missing" rounds are required for BROKEN; repeated
  unverifiable rounds settle INCONCLUSIVE with an owner refund
- authoritative dates: post-deadline completion claims are downgraded
- check-ins and post-hold extra proof are part of adjudication
- appeals: exact bond, new evidence, preserved first review, treasury disclosure
- settlement and claims: no duplicate payouts, retryable on insufficient balance
- pagination: examined-record cursor with filtered scans
"""
import datetime as dt
import json

import pytest

CONTRACT = "contracts/oathly_pledge.py"

GRACE = 600
WINDOW = 900
STAKE = 2 * 10**15
BOND = 10**15

T0 = int(dt.datetime(2026, 1, 10, 0, 0, 0, tzinfo=dt.timezone.utc).timestamp())
DEADLINE = T0 + 3600
PRE_KEPT = "2026-01-10T00:30:00Z"
POST_DEADLINE = "2026-01-10T02:00:00Z"
FABRICATED = "2030-01-01T00:00:00Z"

REPO_URL = "https://api.github.com/repos/acme/app"
EVENTS_URL = "https://api.github.com/users/acme/events"
RELEASES_URL = "https://api.github.com/repos/acme/app/releases"
ISSUES_URL = "https://api.github.com/repos/acme/app/issues"
RAW_URL = "https://raw.githubusercontent.com/acme/app/main/README.md"
FOREIGN_URL = "https://example.org/not-configured"
PLAIN_RECIP = "0x2222222222222222222222222222222222222222"

GOAL = "Ship the alpha build"
CRITERIA = "Repo shows a tagged release with release notes"
APPEAL_REASON = "The evidence used for the ruling was incomplete"


def iso(ts: int) -> str:
    return dt.datetime.fromtimestamp(ts, tz=dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def addr_hex(raw) -> str:
    if isinstance(raw, bytes):
        return "0x" + raw.hex()
    text = str(raw)
    if not text.startswith("0x") and not text.startswith("0X"):
        text = "0x" + text
    return text.lower()


def _deploy(vm, deploy, alice):
    vm.warp(iso(T0))
    vm.sender = alice
    return deploy(CONTRACT, GRACE, WINDOW)


def _create(
    vm,
    contract,
    sender,
    sources=(REPO_URL,),
    deadline=DEADLINE,
    recipient=PLAIN_RECIP,
    value=STAKE,
    goal=GOAL,
    criteria=CRITERIA,
    template="ship_code",
):
    vm.sender = sender
    vm.value = value
    try:
        return contract.create_pledge(goal, criteria, template, list(sources), deadline, recipient)
    finally:
        vm.value = 0


def _repo_mock(vm, pushed=PRE_KEPT, updated=PRE_KEPT, status=200, body=None, headers=None):
    if body is None:
        body = json.dumps({"full_name": "acme/app", "pushed_at": pushed, "updated_at": updated})
    vm.mock_web(
        r"repos/acme/app$",
        {
            "method": "GET",
            "response": {
                "status": status,
                "headers": headers if headers is not None else {},
                "body": body.encode("utf-8"),
            },
        },
    )


def _static_mock(vm, pattern, body, status=200):
    vm.mock_web(
        pattern,
        {"method": "GET", "response": {"status": status, "headers": {}, "body": body.encode("utf-8")}},
    )


def _events_mock(vm):
    _static_mock(vm, r"users/acme/events$", json.dumps({"created_at": PRE_KEPT}))


def _llm_mock(vm, payload):
    vm.mock_llm(r"Oathly judge v2", json.dumps(payload))


def _llm(outcome, cls="", evidence=None, dated=None, checks=None, reason="Evaluation completed by the mocked judge."):
    if checks is None:
        checks = [{"id": "criterion", "met": outcome == "MET"}]
    return {
        "outcome": outcome,
        "unclear_class": cls,
        "evidence": evidence or [],
        "dated": dated or [],
        "checks": checks,
        "reason": reason,
    }


def _met_payload():
    return _llm("MET", evidence=[REPO_URL], dated=[{"url": REPO_URL, "date": PRE_KEPT}])


def _not_met_payload():
    return _llm("NOT_MET", checks=[{"id": "no-release", "met": False}])


def _unclear_payload(cls):
    return _llm("UNCLEAR", cls=cls, checks=[{"id": "unknown", "met": False}])


def _request(vm, contract, ts=None, sender=None, pledge_id="oath-1"):
    if ts is not None:
        vm.warp(iso(ts))
    if sender is not None:
        vm.sender = sender
    return contract.request_verdict(pledge_id)


def _appeal(vm, contract, sender, reason=APPEAL_REASON, urls=(), value=BOND, ts=None, pledge_id="oath-1"):
    if ts is not None:
        vm.warp(iso(ts))
    vm.sender = sender
    vm.value = value
    try:
        return contract.appeal(pledge_id, reason, list(urls))
    finally:
        vm.value = 0


def _fund(vm, amount=100 * 10**15):
    vm.deal(vm._contract_address, amount)


def _craft(outcome="MET", pid="oath-1", cls="", evidence=None, dated=None, checks=None):
    return {
        "pledge_id": pid,
        "outcome": outcome,
        "unclear_class": cls,
        "reason": "Crafted leader result used for validator equivalence checks.",
        "evidence": evidence if evidence is not None else [],
        "dated": dated if dated is not None else [],
        "checks": checks if checks is not None else [{"id": "c", "met": True}],
    }


def test_create_get_policy_and_stats(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    created = _create(direct_vm, contract, direct_alice)
    assert created["pledge_id"] == "oath-1"
    assert created["status"] == "ACTIVE"
    got = contract.get_pledge("oath-1")
    assert got["goal"] == GOAL
    assert got["owner"] == addr_hex(direct_alice)
    assert got["payout"]["state"] == "NONE"
    assert got["deadline"] == DEADLINE
    policy = contract.get_policy()
    assert policy["treasury"] == addr_hex(direct_alice)
    assert policy["bond_wei"] == BOND
    assert policy["grace_seconds"] == GRACE
    assert policy["appeal_window_seconds"] == WINDOW
    stats = contract.get_stats()
    assert stats["pledge_count"] == 1
    assert contract.list_pledges("ALL", 0)["total"] == 1


def test_reject_short_goal(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="Goal must be"):
        _create(direct_vm, contract, direct_alice, goal="abc")


def test_reject_short_criteria(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="Criteria must be"):
        _create(direct_vm, contract, direct_alice, criteria="too short")


def test_reject_unknown_template(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="Unknown template"):
        _create(direct_vm, contract, direct_alice, template="vibes")


def test_reject_invalid_source_lists(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="Provide 1-3 proof URLs"):
        _create(direct_vm, contract, direct_alice, sources=())
    with pytest.raises(Exception, match="At most 3 proof URLs"):
        _create(direct_vm, contract, direct_alice, sources=(REPO_URL, EVENTS_URL, RELEASES_URL, RAW_URL))


def test_reject_bad_url_and_shortener(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="must be http"):
        _create(direct_vm, contract, direct_alice, sources=("not-a-url",))
    with pytest.raises(Exception, match="shorteners"):
        _create(direct_vm, contract, direct_alice, sources=("https://bit.ly/abc",))
    with pytest.raises(Exception, match="shorteners"):
        _create(direct_vm, contract, direct_alice, sources=("https://t.co/abc",))


def test_accepts_raw_githubusercontent_hosts(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    created = _create(direct_vm, contract, direct_alice, sources=(REPO_URL, RAW_URL))
    assert created["proof_sources"] == [REPO_URL, RAW_URL]


def test_reject_bad_recipient(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="0x address"):
        _create(direct_vm, contract, direct_alice, recipient="0x1234")


def test_reject_recipient_equals_owner(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="cannot be the owner"):
        _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_alice))


def test_reject_below_min_stake(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="Minimum stake"):
        _create(direct_vm, contract, direct_alice, value=10**15 - 1)


def test_reject_deadline_lead_and_horizon(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    with pytest.raises(Exception, match="5 minutes ahead"):
        _create(direct_vm, contract, direct_alice, deadline=T0 + 200)
    with pytest.raises(Exception, match="too far"):
        _create(direct_vm, contract, direct_alice, deadline=T0 + 31536001)


def test_premature_verdict_rejected_for_all_wallets(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    for caller in (direct_alice, direct_bob, direct_charlie):
        direct_vm.warp(iso(DEADLINE - 60))
        direct_vm.sender = caller
        with pytest.raises(Exception, match="Deadline not reached"):
            contract.request_verdict("oath-1")
    assert contract.get_pledge("oath-1")["status"] == "ACTIVE"
    result = _request(direct_vm, contract, ts=DEADLINE + 61, sender=direct_bob)
    assert result["status"] == "KEPT"


def test_settle_and_appeal_reject_before_deadline(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    assert contract.get_pledge("oath-1")["status"] == "KEPT"
    direct_vm.warp(iso(DEADLINE - 60))
    with pytest.raises(Exception, match="Deadline not reached"):
        contract.settle("oath-1")
    with pytest.raises(Exception, match="Deadline not reached"):
        _appeal(direct_vm, contract, direct_bob)


def test_kept_flow_settle_claim_and_duplicate_guard(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    with pytest.raises(Exception, match="Appeal window still open"):
        contract.settle("oath-1")
    direct_vm.warp(iso(DEADLINE + 61 + WINDOW + 60))
    settled = contract.settle("oath-1")
    assert settled["status"] == "SETTLED"
    assert settled["settled"] is True
    assert settled["payout"]["state"] == "UNCLAIMED"
    assert settled["payout"]["to"] == addr_hex(direct_alice)
    assert settled["payout"]["kind"] == "refund_kept"
    assert settled["payout"]["amount_wei"] == STAKE
    with pytest.raises(Exception, match="Already settled"):
        contract.settle("oath-1")
    with pytest.raises(Exception, match="insufficient"):
        contract.claim_payout("oath-1")
    assert contract.get_pledge("oath-1")["payout"]["state"] == "UNCLAIMED"
    _fund(direct_vm)
    claimed = contract.claim_payout("oath-1")
    assert claimed["payout"]["state"] == "EMITTED"
    with pytest.raises(Exception, match="already claimed"):
        contract.claim_payout("oath-1")


def test_broken_flow_pays_recipient(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm, body=json.dumps({"note": "nothing shipped yet"}))
    _llm_mock(direct_vm, _not_met_payload())
    result = _request(direct_vm, contract, ts=DEADLINE + 61)
    assert result["status"] == "BROKEN"
    direct_vm.warp(iso(DEADLINE + 61 + WINDOW + 60))
    settled = contract.settle("oath-1")
    assert settled["payout"]["to"] == addr_hex(direct_bob)
    assert settled["payout"]["kind"] == "payout_broken"
    _fund(direct_vm)
    direct_vm.sender = direct_charlie
    claimed = contract.claim_payout("oath-1")
    assert claimed["payout"]["state"] == "EMITTED"


def test_met_with_post_deadline_date_downgrades(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm, pushed=POST_DEADLINE, updated=POST_DEADLINE)
    _llm_mock(direct_vm, _llm("MET", evidence=[REPO_URL], dated=[{"url": REPO_URL, "date": POST_DEADLINE}]))
    result = _request(direct_vm, contract, ts=DEADLINE + 61)
    assert result["status"] == "UNCLEAR_HOLD"
    assert result["verdict"] == "UNCLEAR"
    assert result["hold_class"] == "unverifiable"


def test_retrieval_failure_never_not_met(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _llm_mock(direct_vm, _not_met_payload())
    result = _request(direct_vm, contract, ts=DEADLINE + 61)
    assert result["status"] == "UNCLEAR_HOLD"
    assert result["verdict"] == "UNCLEAR"
    assert result["hold_class"] == "unverifiable"


def test_two_missing_rounds_become_broken(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm, body=json.dumps({"note": "nothing shipped yet"}))
    _llm_mock(direct_vm, _unclear_payload("missing"))
    first = _request(direct_vm, contract, ts=DEADLINE + 61)
    assert first["status"] == "UNCLEAR_HOLD"
    assert first["hold_class"] == "missing"
    with pytest.raises(Exception, match="Grace period still running"):
        _request(direct_vm, contract)
    second = _request(direct_vm, contract, ts=DEADLINE + 61 + GRACE + 60)
    assert second["status"] == "BROKEN"
    assert second["verdict"] == "BROKEN"
    assert second["hold_used"] is True


def test_repeated_unverifiable_becomes_inconclusive_and_refunds(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm, body=json.dumps({"note": "silent"}))
    _llm_mock(direct_vm, _unclear_payload("unverifiable"))
    first = _request(direct_vm, contract, ts=DEADLINE + 61)
    assert first["status"] == "UNCLEAR_HOLD"
    second = _request(direct_vm, contract, ts=DEADLINE + 61 + GRACE + 60)
    assert second["status"] == "INCONCLUSIVE"
    assert second["verdict"] == "INCONCLUSIVE"
    assert second["settled"] is True
    assert second["payout"]["state"] == "UNCLAIMED"
    assert second["payout"]["to"] == addr_hex(direct_alice)
    assert second["payout"]["kind"] == "refund_inconclusive"
    _fund(direct_vm)
    direct_vm.sender = direct_bob
    claimed = contract.claim_payout("oath-1")
    assert claimed["payout"]["state"] == "EMITTED"
    profile = contract.get_profile(addr_hex(direct_alice))
    assert profile["inconclusive"] == 1


def test_first_unclear_second_met_keeps(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm, body=json.dumps({"note": "silent"}))
    _llm_mock(direct_vm, _unclear_payload("missing"))
    first = _request(direct_vm, contract, ts=DEADLINE + 61)
    assert first["status"] == "UNCLEAR_HOLD"
    direct_vm.clear_mocks()
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    second = _request(direct_vm, contract, ts=DEADLINE + 61 + GRACE + 60)
    assert second["status"] == "KEPT"


def test_checkins_are_adjudicated(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_alice
    contract.add_checkin("oath-1", "Cut the release branch", EVENTS_URL)
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="Only the oath owner"):
        contract.add_checkin("oath-1", "Let me in", EVENTS_URL)
    direct_vm.sender = direct_alice
    _repo_mock(direct_vm, body=json.dumps({"note": "no dates here"}))
    _events_mock(direct_vm)
    _llm_mock(direct_vm, _llm("MET", evidence=[EVENTS_URL], dated=[{"url": EVENTS_URL, "date": PRE_KEPT}]))
    result = _request(direct_vm, contract, ts=DEADLINE + 61)
    assert result["status"] == "KEPT"
    assert {0, 1} <= set(direct_vm._web_mocks_hit)


def test_checkin_rules_and_limit(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    direct_vm.sender = direct_alice
    index = 0
    while index < 20:
        contract.add_checkin("oath-1", "progress note " + str(index), "")
        index += 1
    with pytest.raises(Exception, match="Check-in limit reached"):
        contract.add_checkin("oath-1", "one too many", "")
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="only while active"):
        contract.add_checkin("oath-1", "after the verdict", "")


def test_extra_proof_feeds_second_round(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm, body=json.dumps({"note": "silent"}))
    _llm_mock(direct_vm, _unclear_payload("missing"))
    first = _request(direct_vm, contract, ts=DEADLINE + 61)
    assert first["status"] == "UNCLEAR_HOLD"
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="Only the oath owner"):
        contract.submit_extra_proof("oath-1", RELEASES_URL)
    direct_vm.sender = direct_alice
    updated = contract.submit_extra_proof("oath-1", RELEASES_URL)
    assert RELEASES_URL in updated["proof_sources"]
    with pytest.raises(Exception, match="already registered"):
        contract.submit_extra_proof("oath-1", RELEASES_URL)
    with pytest.raises(Exception, match="already registered"):
        contract.submit_extra_proof("oath-1", REPO_URL)
    _static_mock(direct_vm, r"repos/acme/app/releases$", json.dumps({"tag_name": "none"}))
    second = _request(direct_vm, contract, ts=DEADLINE + 61 + GRACE + 60)
    assert second["status"] == "BROKEN"
    assert 1 in direct_vm._web_mocks_hit


def test_validator_accepts_consistent_met(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    assert direct_vm.run_validator() is True


def test_validator_accepts_consistent_not_met(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm, body=json.dumps({"note": "silent"}))
    _llm_mock(direct_vm, _not_met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    assert direct_vm.run_validator() is True


def test_validator_rejects_outcome_mismatch(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    fake = _craft(outcome="NOT_MET", checks=[{"id": "x", "met": False}])
    assert direct_vm.run_validator(leader_result=fake) is False


def test_validator_rejects_unclear_class_mismatch(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm, body=json.dumps({"note": "silent"}))
    _llm_mock(direct_vm, _unclear_payload("unverifiable"))
    _request(direct_vm, contract, ts=DEADLINE + 61)
    assert direct_vm.run_validator() is True
    fake = _craft(outcome="UNCLEAR", cls="missing", checks=[{"id": "x", "met": False}])
    assert direct_vm.run_validator(leader_result=fake) is False


def test_validator_rejects_unverified_dated_claims(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    fake = _craft(evidence=[REPO_URL], dated=[{"url": REPO_URL, "date": FABRICATED}])
    assert direct_vm.run_validator(leader_result=fake) is False


def test_validator_rejects_foreign_evidence_and_empty_checks(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    foreign = _craft(evidence=[FOREIGN_URL], dated=[{"url": REPO_URL, "date": PRE_KEPT}])
    assert direct_vm.run_validator(leader_result=foreign) is False
    no_checks = _craft(evidence=[REPO_URL], dated=[{"url": REPO_URL, "date": PRE_KEPT}], checks=[])
    assert direct_vm.run_validator(leader_result=no_checks) is False


def test_validator_rejects_leader_error_and_wrong_pledge(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    assert direct_vm.run_validator(leader_error=Exception("boom")) is False
    wrong = _craft(pid="oath-99", evidence=[REPO_URL], dated=[{"url": REPO_URL, "date": PRE_KEPT}])
    assert direct_vm.run_validator(leader_result=wrong) is False


def test_appeal_rejects_owner_on_kept_and_bad_bonds(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    with pytest.raises(Exception, match="Only the recipient"):
        _appeal(direct_vm, contract, direct_alice)
    with pytest.raises(Exception, match="exactly 0.001 GEN"):
        _appeal(direct_vm, contract, direct_bob, value=BOND + 1)
    with pytest.raises(Exception, match="exactly 0.001 GEN"):
        _appeal(direct_vm, contract, direct_bob, value=BOND - 1)
    with pytest.raises(Exception, match="at least 10 characters"):
        _appeal(direct_vm, contract, direct_bob, reason="too short")
    with pytest.raises(Exception, match="At most 2 appeal evidence URLs"):
        _appeal(direct_vm, contract, direct_bob, urls=(REPO_URL, ISSUES_URL, RELEASES_URL))
    view = contract.get_pledge("oath-1")
    assert view["appeal_used"] is False
    assert view["bond"]["state"] == "NONE"


def test_appeal_flips_with_new_evidence(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    direct_vm.clear_mocks()
    _repo_mock(direct_vm, body=json.dumps({"note": "silent"}))
    _static_mock(direct_vm, r"repos/acme/app/issues$", json.dumps({"state": "open", "title": "release blocked"}))
    _llm_mock(direct_vm, _not_met_payload())
    flipped = _appeal(direct_vm, contract, direct_bob, urls=(ISSUES_URL,), ts=DEADLINE + 120)
    assert flipped["status"] == "BROKEN"
    assert flipped["verdict"] == "BROKEN"
    assert flipped["appeal_used"] is True
    assert flipped["bond"]["state"] == "UNCLAIMED"
    assert flipped["bond"]["to"] == addr_hex(direct_bob)
    assert flipped["bond"]["amount_wei"] == BOND
    assert flipped["first_review"]["verdict"] == "KEPT"
    assert flipped["appeal"]["flipped"] is True
    assert flipped["appeal"]["rerun_outcome"] == "NOT_MET"
    assert ISSUES_URL in flipped["appeal"]["evidence"]
    assert 1 in direct_vm._web_mocks_hit
    with pytest.raises(Exception, match="Only one appeal"):
        _appeal(direct_vm, contract, direct_bob)
    settled = contract.settle("oath-1")
    assert settled["status"] == "SETTLED"
    assert settled["payout"]["to"] == addr_hex(direct_bob)
    _fund(direct_vm)
    direct_vm.sender = direct_charlie
    claimed = contract.claim_payout("oath-1")
    assert claimed["payout"]["state"] == "EMITTED"
    bonded = contract.claim_bond("oath-1")
    assert bonded["bond"]["state"] == "EMITTED"


def test_appeal_upheld_bond_to_treasury(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    upheld = _appeal(direct_vm, contract, direct_bob, ts=DEADLINE + 120)
    assert upheld["verdict"] == "KEPT"
    assert upheld["status"] == "KEPT"
    assert upheld["bond"]["state"] == "UNCLAIMED"
    assert upheld["bond"]["to"] == addr_hex(direct_alice)
    assert upheld["appeal"]["flipped"] is False
    assert upheld["appeal"]["rerun_outcome"] == "MET"
    _fund(direct_vm)
    bonded = contract.claim_bond("oath-1")
    assert bonded["bond"]["state"] == "EMITTED"
    with pytest.raises(Exception, match="already claimed"):
        contract.claim_bond("oath-1")


def test_appeal_inconclusive_returns_bond(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    direct_vm.clear_mocks()
    _repo_mock(direct_vm, body=json.dumps({"note": "silent"}))
    _llm_mock(direct_vm, _unclear_payload("unverifiable"))
    outcome = _appeal(direct_vm, contract, direct_bob, ts=DEADLINE + 120)
    assert outcome["verdict"] == "KEPT"
    assert outcome["status"] == "KEPT"
    assert outcome["bond"]["to"] == addr_hex(direct_bob)
    assert outcome["bond"]["state"] == "UNCLAIMED"
    assert outcome["appeal"]["rerun_outcome"] == "UNCLEAR"
    _fund(direct_vm)
    bonded = contract.claim_bond("oath-1")
    assert bonded["bond"]["state"] == "EMITTED"


def test_appeal_window_closes(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    with pytest.raises(Exception, match="Appeal window has closed"):
        _appeal(direct_vm, contract, direct_bob, ts=DEADLINE + 61 + WINDOW + 60)


def test_cancel_within_cooling_and_refund(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    direct_vm.warp(iso(T0 + 30))
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="Only the oath owner"):
        contract.cancel_pledge("oath-1")
    direct_vm.sender = direct_alice
    cancelled = contract.cancel_pledge("oath-1")
    assert cancelled["status"] == "CANCELLED"
    assert cancelled["settled"] is True
    assert cancelled["payout"]["state"] == "UNCLAIMED"
    assert cancelled["payout"]["to"] == addr_hex(direct_alice)
    assert cancelled["payout"]["kind"] == "refund_cancelled"
    _fund(direct_vm)
    direct_vm.sender = direct_charlie
    claimed = contract.claim_payout("oath-1")
    assert claimed["payout"]["state"] == "EMITTED"
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="Only active oaths"):
        contract.cancel_pledge("oath-1")


def test_cancel_rejected_after_cooling(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _create(direct_vm, contract, direct_alice)
    direct_vm.warp(iso(T0 + 3601))
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="Cooling-off window has passed"):
        contract.cancel_pledge("oath-2")
    _repo_mock(direct_vm)
    _llm_mock(direct_vm, _met_payload())
    _request(direct_vm, contract, ts=DEADLINE + 61)
    with pytest.raises(Exception, match="Only active oaths"):
        contract.cancel_pledge("oath-1")


def test_pagination_cursor_partitions_registry(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    index = 0
    while index < 15:
        _create(direct_vm, contract, direct_alice)
        index += 1
    page_one = contract.list_pledges("ALL", 0)
    assert page_one["total"] == 15
    assert len(page_one["pledges"]) == 12
    assert page_one["next_cursor"] == 12
    page_two = contract.list_pledges("ALL", page_one["next_cursor"])
    assert len(page_two["pledges"]) == 3
    assert page_two["next_cursor"] == -1
    ids = [entry["pledge_id"] for entry in page_one["pledges"]] + [
        entry["pledge_id"] for entry in page_two["pledges"]
    ]
    assert len(set(ids)) == 15


def test_pagination_filter_scans_examined_records(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    index = 0
    while index < 15:
        _create(direct_vm, contract, direct_alice)
        index += 1
    direct_vm.warp(iso(T0 + 30))
    direct_vm.sender = direct_alice
    contract.cancel_pledge("oath-1")
    contract.cancel_pledge("oath-8")
    contract.cancel_pledge("oath-15")
    cursor = 0
    found = []
    while True:
        page = contract.list_pledges("CANCELLED", cursor)
        found.extend(entry["pledge_id"] for entry in page["pledges"])
        cursor = page["next_cursor"]
        if cursor == -1:
            break
    assert sorted(found) == ["oath-1", "oath-15", "oath-8"]
    assert len(set(found)) == len(found)


def test_owner_and_recipient_views(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice, recipient=addr_hex(direct_bob))
    _create(direct_vm, contract, direct_alice, recipient=PLAIN_RECIP)
    by_owner = contract.list_by_owner(addr_hex(direct_alice))
    assert by_owner["count"] == 2
    by_bob = contract.list_by_recipient(addr_hex(direct_bob))
    assert by_bob["count"] == 1
    assert by_bob["pledges"][0]["pledge_id"] == "oath-1"
    by_plain = contract.list_by_recipient(PLAIN_RECIP)
    assert by_plain["count"] == 1
    assert by_plain["pledges"][0]["pledge_id"] == "oath-2"


def test_profile_claimable_counts(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _create(direct_vm, contract, direct_alice)
    _create(direct_vm, contract, direct_alice)
    direct_vm.warp(iso(T0 + 30))
    direct_vm.sender = direct_alice
    contract.cancel_pledge("oath-2")
    profile = contract.get_profile(addr_hex(direct_alice))
    assert profile["active"] == 1
    assert profile["settled"] == 1
    assert profile["claimable"] == 1
    other = contract.get_profile(PLAIN_RECIP)
    assert other["claimable"] == 0
