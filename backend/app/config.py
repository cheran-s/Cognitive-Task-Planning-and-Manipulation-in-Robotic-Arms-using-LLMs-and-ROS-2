"""
Application Configuration and Constants for Cognitive Robotic Manipulation Platform.
"""
import os
from typing import Dict, List, Any
from pydantic import BaseModel

class ZoneConfig(BaseModel):
    id: str
    name: str
    description: str
    color: str
    center: List[float]  # [x, y, z] in workspace coordinates (meters)
    bounds: Dict[str, float]  # min_x, max_x, min_y, max_y

class ObjectConfig(BaseModel):
    id: str
    name: str
    type: str
    zone_id: str
    color: str
    position: List[float]  # [x, y, z]
    orientation: List[float]  # [roll, pitch, yaw] in radians
    dimensions: List[float]  # [width, depth, height] or [radius, height]
    weight_kg: float = 0.2
    is_available: bool = True

class Settings:
    PROJECT_NAME: str = "Cognitive Task Planning and Manipulation Studio"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Environment
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "fallback")  # gemini, openai, anthropic, fallback
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # ROS 2 Bridge Configuration
    ROS_BRIDGE_URL: str = os.getenv("ROS_BRIDGE_URL", "ws://localhost:9090")
    ROS_BRIDGE_ENABLED: bool = os.getenv("ROS_BRIDGE_ENABLED", "false").lower() == "true"
    DEFAULT_SIMULATION_MODE: bool = True
    
    # Workspace Zones: Positioned cleanly around the central robot arm
    # URDF coordinates: base is at (0,0,0)
    # Zone A: Front-Left (+X, +Y)
    # Zone B: Front-Right (+X, -Y)
    # Zone C: Rear-Right (-X, -Y)
    # Zone D: Rear-Left (-X, +Y)
    ZONES: Dict[str, ZoneConfig] = {
        "zone_a": ZoneConfig(
            id="zone_a",
            name="Zone A",
            description="Inspection & Inbound Staging (Front-Left)",
            color="#3b82f6",  # Blue
            center=[0.45, 0.35, 0.0],
            bounds={"min_x": 0.30, "max_x": 0.60, "min_y": 0.20, "max_y": 0.50}
        ),
        "zone_b": ZoneConfig(
            id="zone_b",
            name="Zone B",
            description="Sorting & Packaging (Front-Right)",
            color="#10b981",  # Green
            center=[0.45, -0.35, 0.0],
            bounds={"min_x": 0.30, "max_x": 0.60, "min_y": -0.50, "max_y": -0.20}
        ),
        "zone_c": ZoneConfig(
            id="zone_c",
            name="Zone C",
            description="Assembly & Buffer (Rear-Right)",
            color="#f59e0b",  # Amber/Yellow
            center=[-0.40, -0.35, 0.0],
            bounds={"min_x": -0.55, "max_x": -0.25, "min_y": -0.50, "max_y": -0.20}
        ),
        "zone_d": ZoneConfig(
            id="zone_d",
            name="Zone D",
            description="Quality Control & Outbound (Rear-Left)",
            color="#ec4899",  # Pink/Red
            center=[-0.40, 0.35, 0.0],
            bounds={"min_x": -0.55, "max_x": -0.25, "min_y": 0.20, "max_y": 0.50}
        )
    }

    # Initial Object Inventory as specified:
    # Red apple, Blue ball, Green cube, Yellow cylinder, Bottle, Small box
    INITIAL_OBJECTS: Dict[str, ObjectConfig] = {
        "apple_red_01": ObjectConfig(
            id="apple_red_01",
            name="Red Apple",
            type="apple",
            zone_id="zone_a",
            color="#ef4444",
            position=[0.42, 0.32, 0.04],
            orientation=[0.0, 0.0, 0.0],
            dimensions=[0.04, 0.04, 0.05],
            weight_kg=0.18
        ),
        "ball_blue_01": ObjectConfig(
            id="ball_blue_01",
            name="Blue Ball",
            type="ball",
            zone_id="zone_a",
            color="#3b82f6",
            position=[0.48, 0.38, 0.04],
            orientation=[0.0, 0.0, 0.0],
            dimensions=[0.045, 0.045, 0.045],
            weight_kg=0.15
        ),
        "cube_green_01": ObjectConfig(
            id="cube_green_01",
            name="Green Cube",
            type="cube",
            zone_id="zone_b",
            color="#22c55e",
            position=[0.42, -0.32, 0.035],
            orientation=[0.0, 0.0, 0.2],
            dimensions=[0.05, 0.05, 0.05],
            weight_kg=0.25
        ),
        "cyl_yellow_01": ObjectConfig(
            id="cyl_yellow_01",
            name="Yellow Cylinder",
            type="cylinder",
            zone_id="zone_c",
            color="#eab308",
            position=[-0.38, -0.35, 0.05],
            orientation=[0.0, 0.0, 0.0],
            dimensions=[0.035, 0.08, 0.035],
            weight_kg=0.22
        ),
        "bottle_01": ObjectConfig(
            id="bottle_01",
            name="Water Bottle",
            type="bottle",
            zone_id="zone_c",
            color="#06b6d4",
            position=[-0.45, -0.32, 0.08],
            orientation=[0.0, 0.0, 0.0],
            dimensions=[0.04, 0.16, 0.04],
            weight_kg=0.35
        ),
        "box_small_01": ObjectConfig(
            id="box_small_01",
            name="Small Box",
            type="box",
            zone_id="zone_d",
            color="#a855f7",
            position=[-0.40, 0.35, 0.04],
            orientation=[0.0, 0.0, 0.4],
            dimensions=[0.07, 0.07, 0.05],
            weight_kg=0.30
        )
    }

    # Robot Physical Limits & Safety
    MAX_REACH_RADIUS: float = 0.85  # meters from base
    MIN_REACH_RADIUS: float = 0.18  # meters (cannot self-collide with pedestal)
    MAX_PAYLOAD_KG: float = 2.5
    DEFAULT_JOINT_SPEED_RAD_S: float = 1.0

settings = Settings()
