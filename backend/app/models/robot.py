"""
Pydantic Models for Robot Telemetry, Joint States, Gripper, and Workspace Occupancy.
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class JointAngles(BaseModel):
    joint1: float = 0.0  # Base yaw (rad)
    joint2: float = 0.0  # Shoulder pitch (rad)
    joint3: float = 0.0  # Elbow pitch (rad)
    joint4: float = 0.0  # Wrist yaw (rad)
    joint5: float = 0.0  # Wrist pitch (rad)
    joint6: float = 0.0  # Wrist roll (rad)
    finger_joint: float = 0.04  # Gripper opening (0.0 to 0.04 meters)

    def to_list(self) -> List[float]:
        return [
            self.joint1,
            self.joint2,
            self.joint3,
            self.joint4,
            self.joint5,
            self.joint6,
            self.finger_joint
        ]

class EndEffectorPose(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    roll: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0

class GripperState(BaseModel):
    is_closed: bool = False
    opening_meters: float = 0.04
    grasped_object_id: Optional[str] = None
    grasp_force_n: float = 0.0
    is_grasp_secured: bool = False

class RobotTelemetry(BaseModel):
    connected: bool = True
    mode: str = "simulation"  # "simulation" or "hardware"
    ros2_available: bool = False
    estop_active: bool = False
    is_busy: bool = False
    current_task_id: Optional[str] = None
    active_intent: str = "IDLE"
    joints: JointAngles = Field(default_factory=JointAngles)
    tcp_pose: EndEffectorPose = Field(default_factory=EndEffectorPose)
    gripper: GripperState = Field(default_factory=GripperState)
    controller_frequency_hz: float = 50.0
    system_load_pct: float = 12.5

class ZoneOccupancy(BaseModel):
    zone_id: str
    name: str
    object_ids: List[str] = Field(default_factory=list)
    capacity: int = 5
    is_full: bool = False

class LogEntry(BaseModel):
    timestamp: float
    level: str  # "INFO", "WARN", "ERROR", "DEBUG", "VOICE"
    subsystem: str  # "PLANNER", "EXECUTOR", "ROS2", "VOICE", "SAFETY"
    task_id: Optional[str] = None
    message: str
