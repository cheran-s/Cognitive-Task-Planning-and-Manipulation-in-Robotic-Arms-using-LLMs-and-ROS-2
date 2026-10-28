import math

# Let's inspect the exact forward kinematics chain of RobotScene3D.tsx:
# Joint 1: node at (0, 0.12, 0), axis: 'y', sign: 1
# Shoulder knuckle: (0, 0.08, 0.02)
# Joint 2: node at (0, 0.08, 0.02), axis: 'x', sign: -1
# Upper arm beam: length 0.42 along local +Y
# Joint 3 (elbow): node at (0, 0.42, 0), axis: 'x', sign: -1
# Forearm beam: length 0.38 along local +Y
# Joint 4 (wrist 1): node at (0, 0.38, 0), axis: 'y', sign: 1
# Wrist 1 housing: y=0.06
# Joint 5 (wrist 2): node at (0, 0.06, 0), axis: 'x', sign: -1
# Joint 6 (wrist 3): node at (0, 0.05, 0), axis: 'y', sign: 1
# Tool flange + chassis + claws: TCP at (0, 0.155, 0)

# Total links when arm is straight up:
# Base height: 0.12 + 0.08 = 0.20m (shoulder height)
# Upper arm: L1 = 0.42m
# Forearm: L2 = 0.38m
# Wrist + Tool + Gripper TCP: L3 = 0.06 + 0.05 + 0.155 = 0.265m

print("Geometry matches cobot arm:")
print("Shoulder height:", 0.20)
print("L1 (upper arm):", 0.42)
print("L2 (forearm):", 0.38)
print("L3 (wrist + TCP):", 0.265)
