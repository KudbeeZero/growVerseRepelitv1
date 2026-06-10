"""GrowPod University: enroll, time-gated + practical completion, degrees, perks."""

import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest

from growpodempire.db.models import Player, DegreeProgress, Strain
from growpodempire.enums import LedgerEntryType
from growpodempire.economy.ledger import post, balance
from growpodempire.services import leveling_service
from growpodempire.services.game_service import GameService, GameError
from growpodempire.services.university_service import UniversityService
from growpodempire.simulation.clock import FrozenClock

BASE = datetime(2026, 1, 1)
LATER = BASE + timedelta(hours=72)  # past intro-course durations (<=60h)


def _player(session, name="student", level=2, grow=2000):
    svc = GameService(session)
    p = svc.create_player(name)
    # Grant XP to reach `level` (award_xp recomputes level from cumulative XP, so
    # later harvest XP only raises it — never drops below what courses require).
    need = 100 * level * (level - 1) // 2   # curve_base * L*(L-1)/2
    if need:
        leveling_service.award_xp(session, p.id, need)
    post(session, p.id, Decimal(str(grow)), LedgerEntryType.ADJUSTMENT)
    session.flush()
    return svc, p


def _harvest(svc, pid, quality=80):
    from growpodempire.db.models import Strain
    strain = svc.session.query(Strain).filter(Strain.slug == "blue-dream").one()
    stack = svc.buy_seed(pid, strain.id)
    pod = svc.create_pod(pid, "Tent", charge=False)
    plant = svc.plant_seed(pid, stack.id, pod.id)
    return svc.harvest_plant(pid, plant.id, weight_g=100, quality=quality, sell=False)


def test_enroll_charges_tuition(session):
    svc, p = _player(session, "enrollee")
    before = balance(session, p.id)
    uni = UniversityService(session, clock=FrozenClock(BASE))
    e = uni.enroll(p.id, "cult-101")
    assert e.status == "enrolled"
    assert balance(session, p.id) == before - 150   # cult-101 tuition


def test_enroll_gated_by_level_and_prereqs(session):
    svc, p = _player(session, "gated", level=1)
    uni = UniversityService(session, clock=FrozenClock(BASE))
    with pytest.raises(GameError):
        uni.enroll(p.id, "cult-201")            # needs level 3
    p.level = 3
    session.flush()
    with pytest.raises(GameError):
        uni.enroll(p.id, "cult-201")            # needs cult-101 first


def test_complete_requires_time_then_practical(session):
    svc, p = _player(session, "studious")
    UniversityService(session, clock=FrozenClock(BASE)).enroll(p.id, "cult-101")
    # Too early: study time not elapsed.
    with pytest.raises(GameError):
        UniversityService(session, clock=FrozenClock(BASE)).complete_course(p.id, "cult-101")
    # Time elapsed but practical (harvest 1) not met yet.
    with pytest.raises(GameError):
        UniversityService(session, clock=FrozenClock(LATER)).complete_course(p.id, "cult-101")
    # Do the practical, then it completes.
    _harvest(svc, p.id)
    out = UniversityService(session, clock=FrozenClock(LATER)).complete_course(p.id, "cult-101")
    assert out["status"] == "completed" and out["xp_awarded"] == 50


def test_full_path_to_a_degree(session):
    svc, p = _player(session, "grad")
    _harvest(svc, p.id)
    _harvest(svc, p.id)                          # 2 harvests satisfy all 3 practicals
    early = UniversityService(session, clock=FrozenClock(BASE))
    for course in ("cult-101", "nut-101", "ipm-101"):
        early.enroll(p.id, course)
    late = UniversityService(session, clock=FrozenClock(LATER))
    for course in ("cult-101", "nut-101", "ipm-101"):
        late.complete_course(p.id, course)
    res = late.claim_degree(p.id, "cert-cultivation")
    assert res["title"] == "Certified Grower"
    assert session.get(Player, p.id).university_title == "Certified Grower"
    assert session.get(Player, p.id).xp >= 200


def test_degree_perk_applies_to_a_harvest(session):
    svc, p = _player(session, "perked")
    # Grant the degree directly to isolate the perk-application path.
    session.add(DegreeProgress(player_id=p.id, degree_key="cert-cultivation"))
    session.flush()
    uni = UniversityService(session)
    assert uni.degree_effects(p.id)["quality_bonus"] == 2.0
    # The +2 quality_bonus flows through harvest quality (80 -> 82).
    h = _harvest(svc, p.id, quality=80)
    assert h.quality == 82.0


def test_claim_degree_is_idempotent(session):
    svc, p = _player(session, "dupe")
    session.add(DegreeProgress(player_id=p.id, degree_key="cert-cultivation"))
    session.flush()
    with pytest.raises(GameError):
        UniversityService(session).claim_degree(p.id, "cert-cultivation")


def test_public_catalog_lists_courses_and_degrees(session):
    cat = UniversityService(session).catalog()
    keys = {c["key"] for c in cat["courses"]}
    assert "cult-101" in keys and "ms-master-grower" in {d["key"] for d in cat["degrees"]}


def test_transcript_reports_status_and_locks(session):
    svc, p = _player(session, "transcriber", level=1)
    UniversityService(session, clock=FrozenClock(BASE)).enroll(p.id, "cult-101")
    t = UniversityService(session, clock=FrozenClock(BASE)).transcript(p.id)
    by_key = {c["key"]: c for c in t["courses"]}
    assert by_key["cult-101"]["status"] == "enrolled"
    assert by_key["cult-101"]["progress"] is not None
    assert by_key["cult-201"]["status"] == "locked"      # needs level 3 + prereq
    assert t["title"] is None
    assert any(d["key"] == "cert-cultivation" for d in t["degrees"])


def test_practical_checks_cover_all_types(session):
    svc, p = _player(session, "practico", level=1)
    uni = UniversityService(session)
    assert uni._practical_met(p.id, {})[0] is True                       # no practical
    assert uni._practical_met(p.id, {"type": "level", "threshold": 1})[0] is True
    for t in ("breed", "stabilize", "cure", "cup_entry", "research", "harvest_count", "harvest_quality"):
        assert uni._practical_met(p.id, {"type": t, "threshold": 1})[0] is False
    # a breed satisfies the breed practical
    a = session.query(Strain).filter(Strain.slug == "white-widow").one()
    b = session.query(Strain).filter(Strain.slug == "blue-dream").one()
    svc.breed(p.id, a.id, b.id)
    assert uni._practical_met(p.id, {"type": "breed", "threshold": 1})[0] is True


def test_unknown_course_and_double_enroll(session):
    svc, p = _player(session, "edge", level=1)
    uni = UniversityService(session, clock=FrozenClock(BASE))
    with pytest.raises(GameError):
        uni.enroll(p.id, "nope-999")
    uni.enroll(p.id, "cult-101")
    with pytest.raises(GameError):
        uni.enroll(p.id, "cult-101")                     # already enrolled
    with pytest.raises(GameError):
        uni.complete_course(p.id, "nut-101")             # not enrolled


# ----- Quiz tests ---------------------------------------------------------

def test_generate_quiz_returns_five_questions(session):
    _, p = _player(session, "quizzer")
    uni = UniversityService(session)
    result = uni.generate_quiz(p.id, "cult-101")
    assert result["course_key"] == "cult-101"
    assert "id" in result
    questions = result["questions"]
    assert len(questions) == 5
    for q in questions:
        assert "question" in q
        assert len(q["options"]) == 4
        # correct_idx must NOT be exposed to the client
        assert "correct_idx" not in q
        assert "explanation" not in q


def test_generate_quiz_unknown_course(session):
    _, p = _player(session, "quizzer-unk")
    uni = UniversityService(session)
    with pytest.raises(GameError):
        uni.generate_quiz(p.id, "does-not-exist")


def test_submit_quiz_scores_correctly(session):
    _, p = _player(session, "submitter")
    uni = UniversityService(session)
    gen = uni.generate_quiz(p.id, "cult-101")
    quiz_id = gen["id"]

    # Peek at the DB to get correct answers (tests bypass the anti-cheat)
    from growpodempire.db.models import CourseQuiz
    quiz_row = session.get(CourseQuiz, quiz_id)
    correct_answers = [q["correct_idx"] for q in quiz_row.questions]

    result = uni.submit_quiz(p.id, quiz_id, correct_answers)
    assert result["correct_count"] == 5
    assert result["score"] == 100.0
    assert result["passed"] is True
    assert result["xp_earned"] > 0
    assert len(result["results"]) == 5
    assert all(r["correct"] for r in result["results"])


def test_submit_quiz_partial_score(session):
    _, p = _player(session, "partial")
    uni = UniversityService(session)
    gen = uni.generate_quiz(p.id, "cult-101")
    quiz_id = gen["id"]

    from growpodempire.db.models import CourseQuiz
    quiz_row = session.get(CourseQuiz, quiz_id)
    correct_answers = [q["correct_idx"] for q in quiz_row.questions]
    # Get 2 wrong (fail threshold is 3/5 = 60%)
    wrong_answers = correct_answers[:]
    wrong_answers[0] = (wrong_answers[0] + 1) % 4
    wrong_answers[1] = (wrong_answers[1] + 1) % 4

    result = uni.submit_quiz(p.id, quiz_id, wrong_answers)
    assert result["correct_count"] == 3
    assert result["passed"] is True   # 3/5 passes
    wrong_answers[2] = (wrong_answers[2] + 1) % 4
    # Can't resubmit — new quiz needed
    with pytest.raises(GameError, match="already submitted"):
        uni.submit_quiz(p.id, quiz_id, wrong_answers)


def test_submit_quiz_failing_score_no_xp(session):
    _, p = _player(session, "failer")
    uni = UniversityService(session)
    gen = uni.generate_quiz(p.id, "cult-101")
    quiz_id = gen["id"]

    from growpodempire.db.models import CourseQuiz
    quiz_row = session.get(CourseQuiz, quiz_id)
    correct_answers = [q["correct_idx"] for q in quiz_row.questions]
    # Get 3 wrong (fail: only 2/5 = 40%)
    fail_answers = correct_answers[:]
    for i in range(3):
        fail_answers[i] = (fail_answers[i] + 1) % 4

    result = uni.submit_quiz(p.id, quiz_id, fail_answers)
    assert result["passed"] is False
    assert result["xp_earned"] == 0
    assert result["correct_count"] == 2


def test_submit_quiz_wrong_length(session):
    _, p = _player(session, "short-answers")
    uni = UniversityService(session)
    gen = uni.generate_quiz(p.id, "cult-101")
    with pytest.raises(GameError, match="exactly 5"):
        uni.submit_quiz(p.id, gen["id"], [0, 1, 2])


def test_submit_quiz_not_found(session):
    _, p = _player(session, "ghost")
    uni = UniversityService(session)
    with pytest.raises(GameError, match="not found"):
        uni.submit_quiz(p.id, "nonexistent-id", [0, 1, 2, 3, 0])


def test_latest_quiz_none_before_any_generated(session):
    _, p = _player(session, "no-quiz-yet")
    uni = UniversityService(session)
    assert uni.latest_quiz(p.id, "cult-101") is None


def test_latest_quiz_returns_pending_then_complete(session):
    _, p = _player(session, "latest-flow")
    uni = UniversityService(session)
    gen = uni.generate_quiz(p.id, "cult-101")
    quiz_id = gen["id"]

    # Before submit: no score/results
    pending = uni.latest_quiz(p.id, "cult-101")
    assert pending is not None
    assert pending["id"] == quiz_id
    assert "score" not in pending
    assert len(pending["questions"]) == 5
    assert "correct_idx" not in pending["questions"][0]

    # After submit: score and results appear
    from growpodempire.db.models import CourseQuiz
    quiz_row = session.get(CourseQuiz, quiz_id)
    correct_answers = [q["correct_idx"] for q in quiz_row.questions]
    uni.submit_quiz(p.id, quiz_id, correct_answers)

    completed = uni.latest_quiz(p.id, "cult-101")
    assert completed is not None
    assert completed["score"] == 100.0
    assert completed["passed"] is True
    assert len(completed["results"]) == 5
