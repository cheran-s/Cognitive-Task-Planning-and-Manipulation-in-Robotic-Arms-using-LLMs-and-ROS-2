#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import time

class ActionExecutorNode(Node):
    def __init__(self):
        super().__init__('action_executor_node')
        self.get_logger().info('Action Executor Node starting up...')
        
        # Subscribe to the robot action plan
        self.plan_sub = self.create_subscription(
            String,
            '/robot_action_plan',
            self.plan_callback,
            10
        )
        self.get_logger().info('Subscribed to /robot_action_plan')
        
        # In a real MoveIt 2 integration, you would initialize MoveGroupCommander:
        # from moveit_commander import MoveGroupCommander
        # self.arm = MoveGroupCommander("ur_manipulator")

    def plan_callback(self, msg):
        self.get_logger().info('Received action plan. Executing...')
        try:
            plan_data = json.loads(msg.data)
            steps = plan_data.get("steps", [])
            
            for i, step in enumerate(steps):
                action = step.get("action")
                self.get_logger().info(f"Executing Step {i+1}: {action} - {step}")
                
                # Mock execution latency
                time.sleep(1.0)
                
                if action == "detect":
                    self.get_logger().info(f"Looking for {step.get('target')}...")
                elif action == "pick":
                    self.get_logger().info(f"Grasping {step.get('target')}...")
                elif action == "place":
                    self.get_logger().info(f"Placing at {step.get('destination')}...")
                elif action == "home":
                    self.get_logger().info("Moving to home position...")
                else:
                    self.get_logger().warn(f"Unknown action: {action}")
                    
            self.get_logger().info('Execution completed successfully.')
            
        except json.JSONDecodeError:
            self.get_logger().error('Failed to parse action plan JSON.')
        except Exception as e:
            self.get_logger().error(f'Execution error: {str(e)}')

def main(args=None):
    rclpy.init(args=args)
    node = ActionExecutorNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
