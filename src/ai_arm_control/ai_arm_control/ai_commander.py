#!/usr/bin/env python3
"""
AI Natural Language Commander Node for 6-DOF Industrial Robotic Arm.
Features:
- Natural Language Intent Parsing (Exact & Semantic keyword matching, custom angles, sequential macros)
- S-Curve / Quintic Polynomial Smooth Trajectory Generation
- Synchronous Joint State and Trajectory Publisher for ROS 2, MoveIt 2, and Web 3D Viewer
"""

import math
import re
import json
import time
import rclpy
from rclpy.node import Node
from std_msgs.msg import String, Header
from sensor_msgs.msg import JointState
from trajectory_msgs.msg import JointTrajectory, JointTrajectoryPoint
from builtin_interfaces.msg import Duration

class AiCommanderNode(Node):
    # Joint definitions matching detailed_arm.urdf.xacro
    ARM_JOINTS = ['joint1', 'joint2', 'joint3', 'joint4', 'joint5', 'joint6']
    GRIPPER_JOINTS = ['finger_joint', 'finger_joint_mimic']
    ALL_JOINTS = ARM_JOINTS + GRIPPER_JOINTS

    # Preset named states (joint1..joint6 in radians)
    PRESET_POSES = {
        'home': [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        'ready': [0.0, -0.6, 1.2, 0.0, 0.6, 0.0],
        'pick_pose': [0.0, 0.5, 0.8, 0.0, 0.3, 0.0],
        'bend_down': [0.0, 1.1, 0.9, 0.0, -0.4, 0.0]
    }

    # Gripper bounds (prismatic stroke in meters)
    GRIPPER_OPEN = 0.04
    GRIPPER_CLOSED = 0.0

    def __init__(self):
        super().__init__('ai_arm_commander')

        # Publishers
        self.joint_state_pub = self.create_publisher(JointState, '/joint_states', 10)
        self.trajectory_pub = self.create_publisher(JointTrajectory, '/llm_arm_controller/joint_trajectory', 10)
        self.status_pub = self.create_publisher(String, '/ai_arm_status', 10)

        # Subscriber
        self.command_sub = self.create_subscription(
            String,
            '/ai_arm_command',
            self.command_callback,
            10
        )

        # Current Joint Positions
        # Indices: 0..5 = J1..J6, 6 = finger_joint, 7 = finger_joint_mimic
        self.current_positions = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        self.target_positions = list(self.current_positions)
        self.start_positions = list(self.current_positions)

        # Trajectory Interpolation State
        self.is_moving = False
        self.trajectory_start_time = 0.0
        self.trajectory_duration = 2.0  # seconds
        self.action_queue = []
        self.current_action_label = "Idle"

        # 50 Hz Control Loop Timer (20ms interval)
        self.control_timer = self.create_timer(0.02, self.control_loop)

        # Status heartbeat timer (1 Hz)
        self.heartbeat_timer = self.create_timer(1.0, self.publish_heartbeat)

        self.get_logger().info('==================================================')
        self.get_logger().info(' AI Natural Language Robotic Arm Commander Online ')
        self.get_logger().info(' Subscribed to: /ai_arm_command                  ')
        self.get_logger().info(' Publishing to: /joint_states, /llm_arm_controller/joint_trajectory')
        self.get_logger().info('==================================================')

    def publish_status(self, level: str, message: str, intent: str = "", progress: float = 0.0):
        """Publish JSON status message for Web Dashboard telemetry."""
        payload = {
            'timestamp': time.time(),
            'level': level,
            'message': message,
            'intent': intent or self.current_action_label,
            'is_moving': self.is_moving,
            'progress': round(progress, 3),
            'joints': {
                'j1': round(self.current_positions[0], 4),
                'j2': round(self.current_positions[1], 4),
                'j3': round(self.current_positions[2], 4),
                'j4': round(self.current_positions[3], 4),
                'j5': round(self.current_positions[4], 4),
                'j6': round(self.current_positions[5], 4),
                'gripper': round(self.current_positions[6], 4)
            }
        }
        msg = String()
        msg.data = json.dumps(payload)
        self.status_pub.publish(msg)

    def publish_heartbeat(self):
        if not self.is_moving:
            self.publish_status("HEARTBEAT", f"Arm standby at [{self.current_action_label}]", self.current_action_label, 1.0)

    def command_callback(self, msg: String):
        """Receive natural language or programmatic commands."""
        raw_cmd = msg.data.strip()
        self.get_logger().info(f'Received Command: "{raw_cmd}"')
        self.parse_natural_language_command(raw_cmd)

    def parse_natural_language_command(self, text: str):
        """Parse natural language command into actions or trajectories."""
        normalized = text.lower().strip()

        # Handle Emergency Stop / Halt
        if any(term in normalized for term in ['stop', 'emergency', 'halt', 'abort', 'freeze']):
            self.get_logger().warn('EMERGENCY STOP TRIGGERED')
            self.is_moving = False
            self.action_queue.clear()
            self.target_positions = list(self.current_positions)
            self.current_action_label = "Stopped"
            self.publish_status("WARN", "Emergency Stop executed. Movement halted.", "STOP", 0.0)
            return

        # Check for sequential chaining ("then", "and then", "after that")
        if " then " in normalized or " and then " in normalized:
            delimiters = [" and then ", " then "]
            for delim in delimiters:
                if delim in normalized:
                    sub_cmds = normalized.split(delim)
                    self.action_queue.clear()
                    self.get_logger().info(f"Queued sequential compound commands: {sub_cmds}")
                    for sc in sub_cmds:
                        parsed_step = self._resolve_intent_to_target(sc.strip())
                        if parsed_step:
                            self.action_queue.append(parsed_step)
                    if self.action_queue:
                        self._start_next_queued_action()
                    return

        # Macro: Pick and Place sequence
        if any(macro in normalized for macro in ['pick and place', 'pick up object', 'grab and move']):
            self.get_logger().info('Executing Autonomous Pick and Place Macro')
            self.action_queue = [
                {'name': 'Open Gripper', 'type': 'gripper', 'val': self.GRIPPER_OPEN, 'dur': 1.0},
                {'name': 'Reach to Pick Pose', 'type': 'arm', 'val': self.PRESET_POSES['pick_pose'], 'dur': 2.0},
                {'name': 'Close Gripper on Object', 'type': 'gripper', 'val': self.GRIPPER_CLOSED, 'dur': 1.0},
                {'name': 'Lift to Ready Pose', 'type': 'arm', 'val': self.PRESET_POSES['ready'], 'dur': 2.0},
                {'name': 'Rotate Base to Drop Zone', 'type': 'arm', 'val': [1.2, -0.6, 1.2, 0.0, 0.6, 0.0], 'dur': 2.0},
                {'name': 'Lower to Drop Point', 'type': 'arm', 'val': [1.2, 0.5, 0.8, 0.0, 0.3, 0.0], 'dur': 1.8},
                {'name': 'Release Object', 'type': 'gripper', 'val': self.GRIPPER_OPEN, 'dur': 1.0},
                {'name': 'Retract to Ready', 'type': 'arm', 'val': [1.2, -0.6, 1.2, 0.0, 0.6, 0.0], 'dur': 1.5},
                {'name': 'Return to Home', 'type': 'arm', 'val': self.PRESET_POSES['home'], 'dur': 2.2}
            ]
            self._start_next_queued_action()
            return

        # Macro: Wave Hello routine
        if any(macro in normalized for macro in ['wave', 'say hello', 'greeting']):
            self.get_logger().info('Executing Wave Greeting Routine')
            self.action_queue = [
                {'name': 'Move to Standby', 'type': 'arm', 'val': [0.0, -0.5, 1.0, 0.0, 0.8, 0.0], 'dur': 1.8},
                {'name': 'Wave Right', 'type': 'arm', 'val': [0.0, -0.5, 1.0, 0.6, 0.8, 0.6], 'dur': 0.8},
                {'name': 'Wave Left', 'type': 'arm', 'val': [0.0, -0.5, 1.0, -0.6, 0.8, -0.6], 'dur': 0.8},
                {'name': 'Wave Right', 'type': 'arm', 'val': [0.0, -0.5, 1.0, 0.6, 0.8, 0.6], 'dur': 0.8},
                {'name': 'Return to Standby', 'type': 'arm', 'val': [0.0, -0.5, 1.0, 0.0, 0.8, 0.0], 'dur': 1.0},
                {'name': 'Home Position', 'type': 'arm', 'val': self.PRESET_POSES['home'], 'dur': 2.0}
            ]
            self._start_next_queued_action()
            return

        # Single intent or custom angular command
        step = self._resolve_intent_to_target(normalized)
        if step:
            self.action_queue = [step]
            self._start_next_queued_action()
        else:
            self.get_logger().warn(f'Could not understand command: "{text}"')
            self.publish_status("ERROR", f"Unrecognized intent: '{text}'. Try 'home', 'pick pose', 'open hand', or 'wave'.", "UNKNOWN", 0.0)

    def _resolve_intent_to_target(self, text: str):
        """Map text to arm/gripper target."""
        # 1. Preset Arm Poses
        if any(k in text for k in ['home', 'reset', 'default', 'origin', 'zero']):
            return {'name': 'Home Position', 'type': 'arm', 'val': self.PRESET_POSES['home'], 'dur': 2.2}

        if any(k in text for k in ['ready', 'standby', 'upright']):
            return {'name': 'Ready Pose', 'type': 'arm', 'val': self.PRESET_POSES['ready'], 'dur': 2.0}

        if any(k in text for k in ['pick', 'reach forward', 'grab ready', 'reach out']):
            return {'name': 'Pick Pose', 'type': 'arm', 'val': self.PRESET_POSES['pick_pose'], 'dur': 2.2}

        if any(k in text for k in ['bend down', 'lower area', 'inspect lower', 'look down', 'ground']):
            return {'name': 'Bend Down', 'type': 'arm', 'val': self.PRESET_POSES['bend_down'], 'dur': 2.2}

        # 2. Gripper Open / Close
        if any(k in text for k in ['open hand', 'release', 'open claw', 'open gripper', 'let go', 'drop']):
            return {'name': 'Open Hand', 'type': 'gripper', 'val': self.GRIPPER_OPEN, 'dur': 1.0}

        if any(k in text for k in ['close hand', 'grasp', 'grab', 'pinch', 'clamp', 'grip']):
            return {'name': 'Close Hand', 'type': 'gripper', 'val': self.GRIPPER_CLOSED, 'dur': 1.0}

        # 3. Direct JSON or Array inputs: e.g. [0.1, -0.4, 0.8, 0, 0.5, 0]
        array_match = re.search(r'\[([\s\d\.\,\-]+)\]', text)
        if array_match:
            try:
                vals = [float(x.strip()) for x in array_match.group(1).split(',')]
                if len(vals) == 6:
                    return {'name': 'Custom Joint Array', 'type': 'arm', 'val': vals, 'dur': 2.5}
            except Exception as e:
                self.get_logger().error(f"Failed to parse array: {e}")

        # 4. Custom Single Joint Rotation: "set joint 1 to 45 deg", "rotate j3 -30"
        joint_match = re.search(r'(?:joint|j)\s*([1-6])\s*(?:to|by)?\s*(-?\d+(?:\.\d+)?)\s*(deg|degree|degrees|rad|radians)?', text)
        if joint_match:
            j_idx = int(joint_match.group(1)) - 1
            val = float(joint_match.group(2))
            unit = joint_match.group(3) or 'rad'
            if 'deg' in unit:
                rad_val = math.radians(val)
            else:
                rad_val = val

            new_arm_vals = list(self.current_positions[:6])
            new_arm_vals[j_idx] = rad_val
            return {'name': f'Move Joint {j_idx+1} to {round(val, 2)} {unit}', 'type': 'arm', 'val': new_arm_vals, 'dur': 1.8}

        return None

    def _start_next_queued_action(self):
        """Trigger execution of the next action in queue."""
        if not self.action_queue:
            self.is_moving = False
            self.current_action_label = "Standby"
            self.publish_status("INFO", "All operations completed successfully.", "Standby", 1.0)
            return

        action = self.action_queue.pop(0)
        self.current_action_label = action['name']
        self.start_positions = list(self.current_positions)
        self.target_positions = list(self.current_positions)

        if action['type'] == 'arm':
            for i in range(6):
                self.target_positions[i] = action['val'][i]
        elif action['type'] == 'gripper':
            self.target_positions[6] = action['val']
            self.target_positions[7] = action['val']  # Mimic

        self.trajectory_duration = max(0.5, float(action.get('dur', 2.0)))
        self.trajectory_start_time = time.time()
        self.is_moving = True

        self.get_logger().info(f"Starting Action: [{self.current_action_label}] (Duration: {self.trajectory_duration}s)")
        self.publish_status("INFO", f"Executing: {self.current_action_label}", self.current_action_label, 0.0)

        # Publish JointTrajectory message for MoveIt / Controller
        self.publish_trajectory_message(self.target_positions, self.trajectory_duration)

    def publish_trajectory_message(self, target_pos, duration_sec):
        """Publish trajectory message conforming to MoveIt 2 FollowJointTrajectory."""
        traj_msg = JointTrajectory()
        traj_msg.header.stamp = self.get_clock().now().to_msg()
        traj_msg.header.frame_id = 'base_link'
        traj_msg.joint_names = list(self.ARM_JOINTS)

        pt_start = JointTrajectoryPoint()
        pt_start.positions = [float(x) for x in self.current_positions[:6]]
        pt_start.time_from_start = Duration(sec=0, nanosec=0)

        pt_end = JointTrajectoryPoint()
        pt_end.positions = [float(x) for x in target_pos[:6]]
        secs = int(duration_sec)
        nsecs = int((duration_sec - secs) * 1e9)
        pt_end.time_from_start = Duration(sec=secs, nanosec=nsecs)

        traj_msg.points = [pt_start, pt_end]
        self.trajectory_pub.publish(traj_msg)

    def control_loop(self):
        """50 Hz periodic execution generating smooth quintic polynomial interpolation."""
        if self.is_moving:
            elapsed = time.time() - self.trajectory_start_time
            tau = min(1.0, max(0.0, elapsed / self.trajectory_duration))

            # Quintic S-Curve polynomial: s(tau) = 10*tau^3 - 15*tau^4 + 6*tau^5
            # Zero initial and final velocity & acceleration
            blend = 10.0 * (tau ** 3) - 15.0 * (tau ** 4) + 6.0 * (tau ** 5)

            for i in range(len(self.ALL_JOINTS)):
                delta = self.target_positions[i] - self.start_positions[i]
                self.current_positions[i] = self.start_positions[i] + delta * blend

            if tau >= 1.0:
                self.current_positions = list(self.target_positions)
                self.publish_status("PROGRESS", f"Completed: {self.current_action_label}", self.current_action_label, 1.0)
                # Next step in sequence
                self._start_next_queued_action()

        # Always publish joint state at steady 50 Hz rate
        state_msg = JointState()
        state_msg.header.stamp = self.get_clock().now().to_msg()
        state_msg.name = list(self.ALL_JOINTS)
        state_msg.position = [float(p) for p in self.current_positions]
        state_msg.velocity = [0.0] * len(self.ALL_JOINTS)
        state_msg.effort = [0.0] * len(self.ALL_JOINTS)
        self.joint_state_pub.publish(state_msg)

def main(args=None):
    rclpy.init(args=args)
    node = AiCommanderNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        node.get_logger().info('AI Commander Node shut down gracefully.')
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
