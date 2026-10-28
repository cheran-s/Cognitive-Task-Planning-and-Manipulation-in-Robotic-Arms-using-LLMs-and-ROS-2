#!/usr/bin/env python3
"""
Lightweight Web Server Node for AI Robotic Arm Dashboard.
Serves static frontend assets (HTML, CSS, JS, Three.js) on port 8000.
Supports both ROS 2 node execution and pure standalone Python execution.
"""

import os
import sys
import http.server
import socketserver
from functools import partial

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        # Keep terminal output clean
        pass

def get_web_dir():
    # 1. Check if running from source tree
    current_dir = os.path.dirname(os.path.abspath(__file__))
    candidate_source = os.path.abspath(os.path.join(current_dir, '..', 'web'))
    if os.path.exists(candidate_source) and os.path.exists(os.path.join(candidate_source, 'index.html')):
        return candidate_source

    # 2. Check ament index installed share directory if in ROS 2 environment
    try:
        from ament_index_python.packages import get_package_share_directory
        share_dir = get_package_share_directory('ai_arm_control')
        candidate_share = os.path.join(share_dir, 'web')
        if os.path.exists(candidate_share):
            return candidate_share
    except Exception:
        pass

    return candidate_source

def run_server(port, web_dir):
    handler = partial(CORSRequestHandler, directory=web_dir)
    socketserver.TCPServer.allow_reuse_address = True
    print(f"[Web Server] Serving static files from: {web_dir}")
    print(f"[Web Server] Dashboard available at: http://localhost:{port}")
    try:
        with socketserver.TCPServer(("", port), handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Web Server] Stopped.")

def main(args=None):
    port = 8000
    web_dir = get_web_dir()

    # Check for custom port in CLI args
    for i, arg in enumerate(sys.argv):
        if arg == '--port' and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])

    # Check if ROS 2 rclpy is available
    has_rclpy = False
    if '--standalone' not in sys.argv:
        try:
            import rclpy
            from rclpy.node import Node
            has_rclpy = True
        except ImportError:
            has_rclpy = False

    if not has_rclpy or '--standalone' in sys.argv:
        # Standalone execution
        run_server(port, web_dir)
        return

    # ROS 2 Node execution
    import rclpy
    from rclpy.node import Node
    import threading

    rclpy.init(args=args)
    
    class WebServerNode(Node):
        def __init__(self):
            super().__init__('web_server_node')
            self.declare_parameter('port', 8000)
            self.port = self.get_parameter('port').value
            self.web_dir = get_web_dir()
            self.get_logger().info(f"Serving 3D Web Dashboard from: {self.web_dir}")
            self.get_logger().info(f"Dashboard online at: http://localhost:{self.port}")

    node = WebServerNode()
    server_thread = threading.Thread(target=run_server, args=(node.port, node.web_dir), daemon=True)
    server_thread.start()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        node.get_logger().info('Shutting down web server...')
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
