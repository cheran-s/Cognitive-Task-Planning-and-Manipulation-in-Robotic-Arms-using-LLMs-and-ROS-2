"""
Unit tests for end-to-end task planner pipeline and timeline generation.
"""
import pytest
from backend.app.config import settings
from backend.app.models.task import TaskCommandRequest
from backend.app.planner.task_planner import task_planner

@pytest.fixture
def test_setup():
    zones = dict(settings.ZONES)
    inventory = {k: v.model_dump() for k, v in settings.INITIAL_OBJECTS.items()}
    return zones, inventory

@pytest.mark.asyncio
async def test_full_pick_and_place_planning(test_setup):
    zones, inventory = test_setup
    req = TaskCommandRequest(command="Pick up the ball and place it in Zone B.")
    plan = await task_planner.plan_command(
        request=req,
        inventory=inventory,
        zones=zones
    )
    
    assert plan.action == "pick_and_place"
    assert plan.object_id == "ball_blue_01"
    assert plan.target_zone == "zone_b"
    assert plan.language == "en"
    assert plan.requires_clarification is False
    assert len(plan.execution_timeline) == 13
    assert plan.status == "idle"  # Ready to execute
    assert "Blue Ball" in plan.assistant_response

@pytest.mark.asyncio
async def test_tamil_command_planning(test_setup):
    zones, inventory = test_setup
    req = TaskCommandRequest(command="Antha ball-a eduthu Zone B-la vai.")
    plan = await task_planner.plan_command(
        request=req,
        inventory=inventory,
        zones=zones
    )
    assert plan.language == "ta"
    assert plan.object_id == "ball_blue_01"
    assert plan.target_zone == "zone_b"
    assert plan.requires_clarification is False
    assert "அடையாளம்" in plan.assistant_response

@pytest.mark.asyncio
async def test_ambiguous_command_triggers_clarification(test_setup):
    zones, inventory = test_setup
    # Missing destination zone
    req = TaskCommandRequest(command="Pick up the bottle.")
    plan = await task_planner.plan_command(
        request=req,
        inventory=inventory,
        zones=zones
    )
    assert plan.requires_clarification is True
    assert plan.status == "clarifying"
    assert plan.clarification_question is not None
    assert len(plan.clarification_options) > 0
