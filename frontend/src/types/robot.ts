export type TaskAction =
  | 'pick_and_place'
  | 'move_to_zone'
  | 'inspect_object'
  | 'query_inventory'
  | 'home_robot'
  | 'emergency_stop'
  | 'cancel_task'
  | 'clarify'
  | 'error';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type OverallTaskStatus = 'idle' | 'planning' | 'clarifying' | 'executing' | 'completed' | 'failed' | 'cancelled';
export type SupportedLanguage = 'en' | 'ta' | 'ml' | 'hi';

export type ExecutionStateMachineState =
  | 'IDLE'
  | 'PARSING'
  | 'VALIDATING'
  | 'PLANNING'
  | 'APPROACHING'
  | 'ALIGNING'
  | 'GRASPING'
  | 'GRASP_VERIFICATION'
  | 'LIFTING'
  | 'TRANSPORTING'
  | 'PLACING'
  | 'RELEASING'
  | 'PLACEMENT_VERIFICATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'STANDBY'
  | 'ESTOP';

export interface ZoneConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  center: [number, number, number];
  bounds: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
}

export interface RobotObject {
  id: string;
  name: string;
  type: string;
  zone_id: string;
  color: string;
  position: [number, number, number];
  orientation: [number, number, number];
  dimensions: number[];
  weight_kg: number;
  is_available: boolean;
}

export interface ExecutionStep {
  step_id: number;
  name: string;
  description: string;
  status: StepStatus;
  started_at?: number | null;
  completed_at?: number | null;
  duration_s?: number | null;
  details?: Record<string, any> | null;
  error_message?: string | null;
}

export interface CognitiveTaskPlan {
  task_id: string;
  action: TaskAction;
  object_id?: string;
  source_zone?: string;
  target_zone?: string;
  target_position?: [number, number, number];
  language: SupportedLanguage | string;
  confidence: number;
  raw_command: string;
  requires_clarification: boolean;
  clarification_question?: string;
  clarification_options?: Array<{ label: string; value: string }>;
  steps: string[];
  execution_timeline: ExecutionStep[];
  status: OverallTaskStatus;
  created_at: number;
  completed_at?: number;
  assistant_response?: string;
  error_reason?: string;
}

export interface JointAngles {
  joint1: number;
  joint2: number;
  joint3: number;
  joint4: number;
  joint5: number;
  joint6: number;
  finger_joint: number;
}

export interface GripperState {
  is_closed: boolean;
  opening_meters: number;
  grasped_object_id?: string;
  grasp_force_n: number;
  is_grasp_secured: boolean;
}

export interface RobotTelemetry {
  connected: boolean;
  mode: 'simulation' | 'hardware';
  ros2_available: boolean;
  estop_active: boolean;
  is_busy: boolean;
  current_task_id?: string;
  active_intent: ExecutionStateMachineState | string;
  joints: JointAngles;
  gripper: GripperState;
  controller_frequency_hz: number;
  system_load_pct: number;
}

export interface TaskHistoryItem {
  task_id: string;
  original_command: string;
  recognized_language: string;
  parsed_intent: string;
  object_id?: string;
  source_zone?: string;
  target_zone?: string;
  status: OverallTaskStatus;
  start_time: number;
  completion_time?: number | null;
  duration_s?: number | null;
  step_count: number;
  completed_steps: number;
  error_message?: string | null;
  assistant_reply?: string | null;
}

export interface LogEntry {
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'VOICE';
  subsystem: 'PLANNER' | 'VALIDATOR' | 'EXECUTOR' | 'ROS2' | 'VOICE' | 'SAFETY' | 'WORKSPACE' | 'SYSTEM' | 'NETWORK';
  task_id?: string;
  message: string;
}
