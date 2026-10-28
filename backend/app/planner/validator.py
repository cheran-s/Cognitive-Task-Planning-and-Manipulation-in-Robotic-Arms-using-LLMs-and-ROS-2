"""
Deterministic Safety, Reachability, and Schema Validation Layer.
Ensures no invalid, out-of-reach, or hazardous motions are dispatched to the robot.
"""
import math
from typing import Dict, Any, Tuple, Optional
from ..config import settings
from ..models.task import CognitiveTaskPlan

class PlanValidator:
    """
    Validates task plans against kinematics reachability bounds, object availability,
    zone existence, and execution safety rules.
    """

    def validate_plan(
        self,
        plan: CognitiveTaskPlan,
        inventory: Dict[str, Any],
        zones: Dict[str, Any],
        is_robot_busy: bool,
        estop_active: bool
    ) -> Tuple[bool, Optional[str]]:
        """
        Runs comprehensive validation suite.
        Returns: (is_valid: bool, error_reason: Optional[str])
        """
        # 1. Emergency Stop Check
        if estop_active:
            return False, "Emergency Stop is active. Reset E-Stop before planning new actions."

        # 2. Concurrency Conflict Check
        if is_robot_busy and plan.action not in ["emergency_stop", "cancel_task"]:
            return False, "Robot is currently busy executing another task. Please wait or cancel the active task."

        # Non-manipulation actions (home, estop, cancel, query) pass basic safety checks
        if plan.action in ["emergency_stop", "cancel_task", "home_robot", "query_inventory"]:
            return True, None

        # 3. Clarification Check
        if plan.requires_clarification:
            return False, f"Clarification required: {plan.clarification_question}"

        # 4. Object Existence & Availability Check
        if not plan.object_id:
            return False, "Target object is missing or could not be identified."

        if plan.object_id not in inventory:
            return False, f"Object '{plan.object_id}' does not exist in the active workspace inventory."

        obj_data = inventory[plan.object_id]
        if not obj_data.get("is_available", True):
            return False, f"Object '{obj_data.get('name', plan.object_id)}' is currently unavailable or already grasped."

        # 5. Target Zone Validation
        if not plan.target_zone:
            return False, "Target zone was not specified."

        if plan.target_zone not in zones:
            return False, f"Target zone '{plan.target_zone}' is not a recognized workspace zone."

        # 6. Source Zone Validation & Current Location Verification
        actual_zone_id = obj_data.get("zone_id")
        if plan.source_zone:
            if plan.source_zone not in zones:
                return False, f"Source zone '{plan.source_zone}' is not a recognized workspace zone."
            if actual_zone_id != plan.source_zone:
                actual_data = zones.get(actual_zone_id, {})
                actual_name = actual_data.get("name") if isinstance(actual_data, dict) else getattr(actual_data, "name", actual_zone_id)
                spec_data = zones.get(plan.source_zone, {})
                specified_name = spec_data.get("name") if isinstance(spec_data, dict) else getattr(spec_data, "name", plan.source_zone)
                return False, f"Object '{obj_data.get('name', plan.object_id)}' is located in {actual_name}, not in {specified_name}."
        else:
            plan.source_zone = actual_zone_id

        # Verify target is distinct from source
        if plan.source_zone == plan.target_zone:
            target_data = zones.get(plan.target_zone, {})
            target_name = target_data.get("name") if isinstance(target_data, dict) else getattr(target_data, "name", plan.target_zone)
            return False, f"Object '{obj_data.get('name', plan.object_id)}' is already located in '{target_name}'."

        # 7. Physical Reachability Check
        # Validate object coordinates are within reach radius
        obj_pos = obj_data.get("position", [0, 0, 0])
        dist_to_obj = math.sqrt(obj_pos[0]**2 + obj_pos[1]**2)
        if dist_to_obj > settings.MAX_REACH_RADIUS:
            return False, f"Object position ({obj_pos[0]:.2f}, {obj_pos[1]:.2f}) exceeds maximum robot reach ({settings.MAX_REACH_RADIUS}m)."
        if dist_to_obj < settings.MIN_REACH_RADIUS:
            return False, f"Object position ({obj_pos[0]:.2f}, {obj_pos[1]:.2f}) is inside robot base keep-out boundary ({settings.MIN_REACH_RADIUS}m)."

        # Validate target zone center is reachable
        zone_data = zones[plan.target_zone]
        zc = zone_data.get("center", [0, 0, 0]) if isinstance(zone_data, dict) else zone_data.center
        dist_to_zone = math.sqrt(zc[0]**2 + zc[1]**2)
        if dist_to_zone > settings.MAX_REACH_RADIUS:
            return False, f"Target zone center ({zc[0]:.2f}, {zc[1]:.2f}) exceeds robot maximum reach ({settings.MAX_REACH_RADIUS}m)."

        # 8. Payload Safety Check
        weight = obj_data.get("weight_kg", 0.2)
        if weight > settings.MAX_PAYLOAD_KG:
            return False, f"Object weight ({weight}kg) exceeds gripper payload capacity ({settings.MAX_PAYLOAD_KG}kg)."

        return True, None

validator = PlanValidator()
