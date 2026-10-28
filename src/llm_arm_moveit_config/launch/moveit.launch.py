import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import Command, LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue
import yaml

def load_yaml(file_path):
    try:
        with open(file_path, 'r') as file:
            return yaml.safe_load(file)
    except Exception:
        return {}

def generate_launch_description():
    desc_pkg = get_package_share_directory('detailed_arm_description')
    moveit_pkg = get_package_share_directory('llm_arm_moveit_config')

    urdf_file = os.path.join(desc_pkg, 'urdf', 'detailed_arm.urdf.xacro')
    srdf_file = os.path.join(moveit_pkg, 'config', 'detailed_arm.srdf')
    kinematics_file = os.path.join(moveit_pkg, 'config', 'kinematics.yaml')
    joint_limits_file = os.path.join(moveit_pkg, 'config', 'joint_limits.yaml')

    robot_description = ParameterValue(
        Command(['xacro ', urdf_file]),
        value_type=str
    )

    with open(srdf_file, 'r') as f:
        robot_description_semantic = f.read()

    kinematics_config = load_yaml(kinematics_file)
    joint_limits_config = load_yaml(joint_limits_file)

    move_group_node = Node(
        package='moveit_ros_move_group',
        executable='move_group',
        output='screen',
        parameters=[
            {'robot_description': robot_description},
            {'robot_description_semantic': robot_description_semantic},
            {'robot_description_kinematics': kinematics_config},
            {'robot_description_planning': joint_limits_config},
            {'publish_robot_description_semantic': True},
            {'planning_pipelines': ['ompl']},
        ]
    )

    return LaunchDescription([
        move_group_node
    ])
