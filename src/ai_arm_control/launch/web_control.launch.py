import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import Command, LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue

def generate_launch_description():
    desc_pkg = get_package_share_directory('detailed_arm_description')
    xacro_file = os.path.join(desc_pkg, 'urdf', 'detailed_arm.urdf.xacro')

    port_arg = DeclareLaunchArgument(
        name='web_port',
        default_value='8000',
        description='Port for HTTP web server'
    )

    rosbridge_port_arg = DeclareLaunchArgument(
        name='rosbridge_port',
        default_value='9090',
        description='Port for rosbridge websocket server'
    )

    robot_description = ParameterValue(
        Command(['xacro ', xacro_file]),
        value_type=str
    )

    # 1. Robot State Publisher Node
    robot_state_publisher_node = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        name='robot_state_publisher',
        output='screen',
        parameters=[{'robot_description': robot_description}]
    )

    # 2. Rosbridge WebSocket Server Node (Port 9090)
    rosbridge_node = Node(
        package='rosbridge_server',
        executable='rosbridge_websocket',
        name='rosbridge_websocket',
        output='screen',
        parameters=[{
            'port': LaunchConfiguration('rosbridge_port'),
            'address': '',
            'retry_startup_delay': 5.0
        }]
    )

    # 3. AI Commander Node (Subscribes to /ai_arm_command, publishes smooth trajectories)
    ai_commander_node = Node(
        package='ai_arm_control',
        executable='ai_commander',
        name='ai_commander',
        output='screen'
    )

    # 4. Lightweight Web Server Node (Port 8000)
    web_server_node = Node(
        package='ai_arm_control',
        executable='web_server',
        name='web_server',
        output='screen',
        parameters=[{'port': LaunchConfiguration('web_port')}]
    )

    return LaunchDescription([
        port_arg,
        rosbridge_port_arg,
        robot_state_publisher_node,
        rosbridge_node,
        ai_commander_node,
        web_server_node
    ])
