"""
Unit tests for deterministic safety, reachability, and schema validation.
"""
import pytest
from backend.app.config import settings
from backend.app.models.task import CognitiveTaskPlan
from backend.app.planner.validator import validator

@pytest.fixture
def test_setup():
    zones = dict(settings.ZONES)
    inventory = {k: v.model_dump() for k, v in settings.INITIAL_OBJECTS.items()}
    return zones, inventory

def test_valid_plan(test_setup):
    zones, inventory = test_setup
    plan = CognitiveTaskPlan(
        action="pick_and_place",
        object_id="ball_blue_01",
        source_zone="zone_a",
        target_zone="zone_b"
    )
    is_valid, err = validator.validate_plan(
        plan=plan,
        inventory=inventory,
        zones=zones,
        is_robot_busy=False,
        estop_active=False
    )
    assert is_valid is True
    assert err is None

def test_estop_blocks_execution(test_setup):
    zones, inventory = test_setup
    plan = CognitiveTaskPlan(
        action="pick_and_place",
        object_id="ball_blue_01",
        target_zone="zone_b"
    )
    is_valid, err = validator.validate_plan(
        plan=plan,
        inventory=inventory,
        zones=zones,
        is_robot_busy=False,
        estop_active=True
    )
    assert is_valid is False
    assert "Emergency Stop" in err

def test_busy_robot_blocks_execution(test_setup):
    zones, inventory = test_setup
    plan = CognitiveTaskPlan(
        action="pick_and_place",
        object_id="ball_blue_01",
        target_zone="zone_b"
    )
    is_valid, err = validator.validate_plan(
        plan=plan,
        inventory=inventory,
        zones=zones,
        is_robot_busy=True,
        estop_active=False
    )
    assert is_valid is False
    assert "busy" in err

def test_nonexistent_object(test_setup):
    zones, inventory = test_setup
    plan = CognitiveTaskPlan(
        action="pick_and_place",
        object_id="non_existent_thing",
        target_zone="zone_b"
    )
    is_valid, err = validator.validate_plan(
        plan=plan,
        inventory=inventory,
        zones=zones,
        is_robot_busy=False,
        estop_active=False
    )
    assert is_valid is False
    assert "does not exist" in err

def test_same_zone_error(test_setup):
    zones, inventory = test_setup
    plan = CognitiveTaskPlan(
        action="pick_and_place",
        object_id="ball_blue_01",  # initially in zone_a
        source_zone="zone_a",
        target_zone="zone_a"
    )
    is_valid, err = validator.validate_plan(
        plan=plan,
        inventory=inventory,
        zones=zones,
        is_robot_busy=False,
        estop_active=False
    )
    assert is_valid is False
    assert "already located" in err
