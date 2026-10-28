"""
Trajectory and Kinematics Utilities for 6-DOF Robotic Arm.
Calculates S-curve quintic polynomials and target joint configurations for zone reaching.
"""
import math
from typing import List, Tuple

class TrajectoryGenerator:
    """
    Generates smooth S-curve / quintic polynomial trajectories between joint states.
    s(t) = 10*(t/T)^3 - 15*(t/T)^4 + 6*(t/T)^5 (zero velocity & acceleration at ends).
    """

    @staticmethod
    def quintic_blend(t: float, total_time: float) -> float:
        """Returns normalized blend factor [0.0 .. 1.0] with C2 continuity."""
        if total_time <= 0:
            return 1.0
        tau = max(0.0, min(1.0, t / total_time))
        return 10.0 * (tau ** 3) - 15.0 * (tau ** 4) + 6.0 * (tau ** 5)

    @staticmethod
    def interpolate_joints(start: List[float], target: List[float], fraction: float) -> List[float]:
        """Linearly blends two joint vectors given a blend factor [0.0 .. 1.0]."""
        return [s + (e - s) * fraction for s, e in zip(start, target)]

    @staticmethod
    def is_reachable(x: float, y: float, z: float) -> Tuple[bool, str]:
        """
        Validates whether target 3D coordinate (x, y, z) lies inside
        the physical kinematic workspace envelope of the 6-DOF robotic arm.
        """
        r = math.sqrt(x**2 + y**2)
        z0 = 0.20
        L1 = 0.42
        L2 = 0.44
        L3 = 0.205
        rw = max(0.05, r - 0.02)
        zw = z + L3
        D = math.sqrt(rw**2 + (zw - z0)**2)
        max_reach = (L1 + L2) * 0.98  # ~ 0.84m

        if D > max_reach:
            return False, f"Target coordinate ({x:.2f}, {y:.2f}, {z:.2f}) exceeds maximum arm reach (distance {D:.2f}m > {max_reach:.2f}m limit)"
        if r < 0.15:
            return False, f"Target coordinate ({x:.2f}, {y:.2f}, {z:.2f}) is too close to robot base axis (radius {r:.2f}m < 0.15m limit)"
        if z < -0.05:
            return False, f"Target coordinate ({x:.2f}, {y:.2f}, {z:.2f}) is below workspace table plane"
        return True, "Reachable"

    @staticmethod
    def compute_ik_for_position(x: float, y: float, z: float, approach_angle: float = -0.5) -> List[float]:
        """
        Analytical/geometric inverse kinematics for a 6-DOF articulated arm
        targeting workspace coordinate (x, y, z).
        Matches joint geometry of detailed_arm.urdf.xacro and RobotScene3D Three.js tree.
        Three.js coordinates: X = x, Y = z (height), Z = y.
        Returns [joint1, joint2, joint3, joint4, joint5, joint6].
        """
        # Joint 1: Base yaw angle to face the object in X-Z plane
        yaw = math.atan2(x, y)
        r = math.sqrt(x**2 + y**2)

        # Exact link dimensions from URDF / Three.js model
        z0 = 0.20   # Shoulder joint height
        L1 = 0.42   # Upper arm length
        L2 = 0.44   # Forearm + Wrist 1 length
        L3 = 0.205  # Wrist 2 + Gripper + TCP length

        # Account for 0.02m radial shoulder offset
        rw = max(0.08, r - 0.02)
        zw = z + L3
        dr = rw
        dz = zw - z0
        D = math.sqrt(dr**2 + dz**2)
        D = max(0.15, min(D, (L1 + L2) * 0.98))

        # Law of cosines for elbow
        cos_th2 = (D**2 - L1**2 - L2**2) / (2 * L1 * L2)
        cos_th2 = max(-1.0, min(1.0, cos_th2))
        th2 = math.acos(cos_th2)

        # Angle of target vector from horizontal
        alpha = math.atan2(dr, dz)
        cos_beta = (L1**2 + D**2 - L2**2) / (2 * L1 * D)
        cos_beta = max(-1.0, min(1.0, cos_beta))
        beta = math.acos(cos_beta)

        # Planar angles from vertical
        th1 = alpha - beta
        th3 = math.pi - (th1 + th2)

        # In RobotScene3D: sign is -1 for joint2, joint3, joint5
        q2 = -th1
        q3 = -th2
        q5 = -th3

        return [
            yaw,
            q2,
            q3,
            0.0,
            q5,
            0.0
        ]

trajectory_gen = TrajectoryGenerator()

