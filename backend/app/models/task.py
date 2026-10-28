"""
Pydantic Task Models for Cognitive Task Planning, Schema Validation, and Execution Timelines.
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
import uuid
import time

TaskAction = Literal[
    "pick_and_place",
    "move_to_zone",
    "inspect_object",
    "query_inventory",
    "home_robot",
    "emergency_stop",
    "cancel_task",
    "clarify"
]

StepStatus = Literal["pending", "running", "completed", "failed", "cancelled"]
OverallTaskStatus = Literal["idle", "planning", "clarifying", "executing", "completed", "failed", "cancelled"]

class ExecutionStep(BaseModel):
    step_id: int
    name: str
    description: str
    status: StepStatus = "pending"
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    duration_s: Optional[float] = None
    details: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class CognitiveTaskPlan(BaseModel):
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:8]}")
    action: TaskAction
    object_id: Optional[str] = None
    source_zone: Optional[str] = None
    target_zone: Optional[str] = None
    target_position: Optional[List[float]] = None
    language: str = "en"  # en, ta, ml, hi
    confidence: float = 1.0
    raw_command: str = ""
    translated_command: Optional[str] = None
    requires_clarification: bool = False
    clarification_question: Optional[str] = None
    clarification_options: Optional[List[Dict[str, str]]] = None
    
    # Standard 9-step planning decomposition
    steps: List[str] = Field(
        default_factory=lambda: [
            "validate_object",
            "check_target_zone",
            "plan_motion",
            "move_to_object",
            "grasp_object",
            "verify_grasp",
            "move_to_target",
            "release_object",
            "verify_placement"
        ]
    )
    
    # Full 13-step live execution timeline
    execution_timeline: List[ExecutionStep] = Field(default_factory=list)
    status: OverallTaskStatus = "idle"
    created_at: float = Field(default_factory=time.time)
    completed_at: Optional[float] = None
    assistant_response: Optional[str] = None
    error_reason: Optional[str] = None

class TaskCommandRequest(BaseModel):
    command: str
    language: Optional[str] = None  # Auto-detected if empty or 'auto'
    mode: Optional[str] = "simulation"  # 'simulation' or 'hardware'
    session_id: Optional[str] = "default"

class ClarificationResponse(BaseModel):
    task_id: str
    selected_option: str
    selected_object_id: Optional[str] = None
    selected_target_zone: Optional[str] = None

class TaskHistoryItem(BaseModel):
    task_id: str
    original_command: str
    recognized_language: str
    parsed_intent: str
    object_id: Optional[str] = None
    source_zone: Optional[str] = None
    target_zone: Optional[str] = None
    status: OverallTaskStatus
    start_time: float
    completion_time: Optional[float] = None
    duration_s: Optional[float] = None
    step_count: int = 13
    completed_steps: int = 0
    error_message: Optional[str] = None
    assistant_reply: Optional[str] = None
