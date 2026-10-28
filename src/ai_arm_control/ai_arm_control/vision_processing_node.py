#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import random
import time
import threading

class VisionProcessingNode(Node):
    def __init__(self):
        super().__init__('vision_processing_node')
        self.get_logger().info('Vision Processing Node starting up...')
        
        # Publish detected objects
        self.vision_pub = self.create_publisher(String, '/detected_objects', 10)
        
        # Start a background thread to simulate vision processing
        self.thread = threading.Thread(target=self.simulate_vision_loop)
        self.thread.daemon = True
        self.thread.start()

    def simulate_vision_loop(self):
        # Simulate processing an RGB-D feed and running YOLOv8 detection
        while rclpy.ok():
            objects = [
                {
                    "class": "red_block",
                    "confidence": 0.95,
                    "position_3d": {
                        "x": round(random.uniform(0.3, 0.6), 3),
                        "y": round(random.uniform(-0.2, 0.2), 3),
                        "z": 0.05
                    }
                },
                {
                    "class": "screwdriver",
                    "confidence": 0.88,
                    "position_3d": {
                        "x": round(random.uniform(0.2, 0.5), 3),
                        "y": round(random.uniform(0.1, 0.4), 3),
                        "z": 0.02
                    }
                }
            ]
            
            msg = String()
            msg.data = json.dumps({"timestamp": time.time(), "detections": objects})
            self.vision_pub.publish(msg)
            
            time.sleep(2.0) # Publish at 0.5 Hz for mock

def main(args=None):
    rclpy.init(args=args)
    node = VisionProcessingNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
