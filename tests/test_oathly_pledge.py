"""Direct-mode tests for OathlyPledge validation + views (no LLM)."""
import pytest

CONTRACT = "contracts/oathly_pledge.py"
RECIP = "0x2222222222222222222222222222222222222222"


def addr_hex(raw) -> str:
    if isinstance(raw, bytes):
        return "0x" + raw.hex()
    text = str(raw)
    if not text.startswith("0x"):
        text = "0x" + text
    return text.lower()


def _deploy(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    return direct_deploy(CONTRACT)


def _future(vm, days=7):
    try:
        ts = int(vm._datetime.timestamp())
    except Exception:
        import datetime as _dt
        ts = int(_dt.datetime.now(_dt.timezone.utc).timestamp())
    return ts + days * 86400


def test_stats_empty(direct_vm, direct_deploy, direct_alice):
    c = _deploy(direct_vm, direct_deploy, direct_alice)
    stats = c.get_stats()
    assert stats["pledge_count"] == 0


def test_reject_owner_equals_recipient(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 10**15
    with pytest.raises(Exception, match="Recipient cannot be the owner"):
        c.create_pledge(
            "Ship my app",
            "This criteria text is long enough to pass validation here",
            "public_page",
            ["https://example.com/app"],
            _future(direct_vm),
            addr_hex(direct_alice),
        )


def test_reject_short_goal(direct_vm, direct_deploy, direct_alice):
    c = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 10**15
    with pytest.raises(Exception, match="Goal must be"):
        c.create_pledge(
            "abc",
            "This criteria text is long enough to pass validation here",
            "custom",
            ["https://example.com/x"],
            _future(direct_vm),
            RECIP,
        )


def test_reject_bad_url(direct_vm, direct_deploy, direct_alice):
    c = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 10**15
    with pytest.raises(Exception):
        c.create_pledge(
            "Ship my app v1",
            "Public page shows the shipped app with release notes",
            "public_page",
            ["not-a-url"],
            _future(direct_vm),
            RECIP,
        )


def test_reject_shortener(direct_vm, direct_deploy, direct_alice):
    c = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 10**15
    with pytest.raises(Exception, match="shorteners"):
        c.create_pledge(
            "Ship my app v1",
            "Public page shows the shipped app with release notes",
            "public_page",
            ["https://bit.ly/abc123"],
            _future(direct_vm),
            RECIP,
        )


def test_create_and_get(direct_vm, direct_deploy, direct_alice):
    c = _deploy(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_alice
    direct_vm.value = 2 * 10**15
    created = c.create_pledge(
        "Ship my portfolio",
        "Public portfolio shows five projects with live links",
        "public_page",
        ["https://example.com/portfolio"],
        _future(direct_vm),
        RECIP,
    )
    assert created["pledge_id"] == "oath-1"
    assert created["status"] == "ACTIVE"
    got = c.get_pledge("oath-1")
    assert got["goal"] == "Ship my portfolio"
    wall = c.list_pledges("ALL", 0)
    assert wall["total"] == 1
    stats = c.get_stats()
    assert stats["pledge_count"] == 1
