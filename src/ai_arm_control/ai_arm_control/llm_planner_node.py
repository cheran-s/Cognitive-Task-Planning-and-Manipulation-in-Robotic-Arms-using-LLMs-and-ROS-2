#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import os

class LLMPlannerNode(Node):
    def __init__(self):
        super().__init__('llm_planner_node')
        self.get_logger().info('LLM Planner Node starting up...')
        
        # Publisher for the decomposed action plan
        self.plan_pub = self.create_publisher(String, '/robot_action_plan', 10)
        
        # Subscriber for voice/text commands
        self.cmd_sub = self.create_subscription(
            String,
            '/voice_command',
            self.command_callback,
            10
        )
        self.get_logger().info('Subscribed to /voice_command')

    def command_callback(self, msg):
        self.get_logger().info(f"Received command: '{msg.data}'")
        
        # Process the natural language command using LLM
        action_plan = self.generate_action_plan(msg.data)
        
        # Publish the plan
        plan_msg = String()
        plan_msg.data = json.dumps(action_plan)
        self.plan_pub.publish(plan_msg)
        self.get_logger().info(f"Published plan: {plan_msg.data}")

    def generate_action_plan(self, prompt):
        # Mock cognitive decomposition for demonstration purposes.
        self.get_logger().info("Decomposing task via LLM...")
        prompt_lower = prompt.lower()
        
        plan = []
        if "clutter" in prompt_lower or "sort" in prompt_lower:
            plan = [
                {"action": "detect", "target": "all_objects"},
                {"action": "pick", "target": "red_block"},
                {"action": "place", "destination": "bin_1"},
                {"action": "home"}
            ]
        elif "screwdriver" in prompt_lower or "tool" in prompt_lower:
            plan = [
                {"action": "detect", "target": "screwdriver"},
                {"action": "approach", "target": "screwdriver"},
                {"action": "pick", "target": "screwdriver"},
                {"action": "place", "destination": "user_hand"},
                {"action": "home"}
            ]
        else:
            plan = [
                {"action": "clarify", "message": "I did not understand the instruction. Please be more specific."}
            ]
            
        return {"steps": plan, "status": "success"}

def main(args=None):
    rclpy.init(args=args)
    node = LLMPlannerNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
