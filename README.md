# Cognitive Task Planning and Manipulation in Robotic Arms Using LLMs and ROS 2

A modular, professional robotic manipulation platform with a LeetCode-inspired dark developer interface, an interactive 3D robotic arm digital twin, 4-language conversational voice interaction (English, Tamil, Malayalam, Hindi), LLM-based task planning, schema validation, and ROS 2 Jazzy integration.

---

## 1. System Overview & Architecture

```
+--------------------------------------------------------------------------------------------------------+
|                                    LeetCode-Inspired Frontend Web Studio                               |
|   - Interactive Three.js 3D Twin (6-DOF Articulated Arm matching detailed_arm.urdf.xacro + 4 Zones)    |
|   - Multilingual Voice Assistant (Web Speech API STT/TTS in EN, TA, ML, HI + Interruption Mute)        |
|   - LeetCode Command Editor with Preset Pills & Syntax Formatting                                      |
|   - 13-Step Live Execution Timeline with State Transition Telemetry                                    |
|   - Object Inventory & Zone Occupancy Panel (Red Apple, Blue Ball, Green Cube, Cylinder, Bottle, Box)  |
|   - Real-Time Joint Telemetry HUD (J1..J6 angles in rad/deg, forward kinematics, gripper stroke)      |
|   - Task History & Severity-Filtered Execution Terminal Logs                                           |
|   - Prominent Emergency Stop (E-Stop) Control Strip                                                    |
+----------------------------------------------------+---------------------------------------------------+
                                                     |
                                   HTTP / WebSockets | (Port 8000 & Port 3000)
                                                     v
+--------------------------------------------------------------------------------------------------------+
|                                       FastAPI Cognitive Backend Core                                   |
|   - Multilingual NLP Parser (English, Tamil Script/Tanglish, Malayalam Script/Manglish, Hindi/Hinglish)|
|   - Cognitive Task Planner & LLM Adapter (Gemini / OpenAI / Anthropic / Rule-Based Fallback)           |
|   - Deterministic Schema & Safety Validator (Reachability Envelope, Zone Constraints, Collision Avoid) |
|   - Asynchronous 13-Step Action Execution Coordinator & S-Curve Quintic Trajectory Generator           |
|   - In-Memory & Persistent Task History Store with Filtered Observability                              |
|   - ROS 2 Bridge Adapter (Seamless fallback to simulation mode when ROS 2 is offline)                  |
+----------------------------------------------------+---------------------------------------------------+
                                                     |
                                   ROS 2 WebSocket   | (ws://localhost:9090)
                                                     v
+--------------------------------------------------------------------------------------------------------+
|                                  ROS 2 Workspace (Jazzy Jalisco / Ubuntu 24.04)                        |
|   - detailed_arm_description: URDF/Xacro procedural arm model with mimic pneumatic gripper             |
|   - llm_arm_moveit_config: MoveIt 2 motion planning, SRDF, KDL kinematics, trajectory controllers       |
|   - ai_arm_control: ROS 2 action executor, joint state publisher, and AI commander node                |
+--------------------------------------------------------------------------------------------------------+
```

---

## 2. Key Features

### LeetCode-Inspired Developer Interface
- **Dark Charcoal Aesthetic**: Dark surfaces (`#0a0d12`, `#11141c`), restrained vibrant orange accents (`#ff7a00`), subtle borders (`#222938`), and crisp typography (Inter and JetBrains Mono).
- **Navigation Sidebar**: Quick navigation between Workspace (3D Twin), Task Planner, Voice Assistant, Task History, Robot Kinematics, and System Diagnostics.
- **Top Navigation Bar**: Live ROS 2 bridge indicator, simulation vs. hardware mode pill, multilingual selector, microphone state pill, reset scene button, and prominent E-Stop control.

### Interactive 3D Robot Workspace
- **Procedural 6-DOF Robotic Arm**: Faithfully represents `detailed_arm.urdf.xacro` with base flange, turntable shoulder, upper arm beam, elbow, 3-axis wrist, and parallel pneumatic gripper with mimic claw synchronization.
- **4 Distinct Workspace Zones**: Zone A (Inbound), Zone B (Sorting), Zone C (Assembly), and Zone D (Outbound) surrounding the robot base with coordinate boundaries and floating labels.
- **Movable 3D Objects**:
  - `apple_red_01`: Red Apple
  - `ball_blue_01`: Blue Ball
  - `cube_green_01`: Green Cube
  - `cyl_yellow_01`: Yellow Cylinder
  - `bottle_01`: Water Bottle
  - `box_small_01`: Small Box
- **Interactive Orbit, Zoom & Click-to-Select**: Raycasting allows clicking any object to select it, highlight its target zone, and inspect its real-time telemetry.

### Natural Language Command Interface (4 Languages)
Supports natural instructions, colloquial phrasing, and code-switching across:
1. **English**: *"Pick up the ball and place it in Zone B."*
2. **Tamil**:
   - Tanglish: *"Antha ball-a eduthu Zone B-la vai."*
   - Tamil Script: *"அந்த பந்தை எடுத்து Zone B-ல் வை."*
3. **Malayalam**:
   - Manglish: *"Aa panthu eduthu Zone B-yil vekkoo."*
   - Malayalam Script: *"ആ പന്ത് എടുത്ത് Zone B-യിൽ വെക്കൂ."*
4. **Hindi**:
   - Hinglish: *"Gend ko uthakar Zone B me rakho."*
   - Devanagari: *"गेंद को उठाकर Zone B में रखो।"*

### Ambiguity Detection & Clarification
- When a command is underspecified (e.g., *"Pick up the bottle"* without a destination or *"Move the ball"* when multiple targets exist), the system asks a natural clarification question in the user's detected language and provides clickable options instead of guessing.

### 13-Step Live Execution Timeline
Live step-by-step progress tracking with real execution status:
1. `Command Received`
2. `Language & Intent Identified`
3. `Target Object Located`
4. `Source & Destination Validated`
5. `Robot State & Workspace Checked`
6. `Motion Plan Generated`
7. `Robot Moves Toward Object`
8. `Gripper Closes Around Object`
9. `Grasp Success Verified`
10. `Robot Transports Object`
11. `Robot Releases Object`
12. `Final Object Position Verified`
13. `Task Completed`

---

## 3. Quickstart Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm
- (Optional for Hardware/Gazebo) ROS 2 Jazzy Jalisco on Ubuntu 24.04 (native or WSL2)

### 1. Backend Setup & Startup
In PowerShell:
```powershell
cd c:\Users\cheran\OneDrive\Documents\ir_project
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
- API Health Endpoint: `http://127.0.0.1:8000/api/health`
- Interactive API Docs (Swagger): `http://127.0.0.1:8000/docs`

### 2. Frontend Setup & Startup
In a second terminal:
```powershell
cd c:\Users\cheran\OneDrive\Documents\ir_project\frontend
npm install
npm run dev -- --port 3000
```
Open your browser at `http://localhost:3000`.

### 3. Running Automated Tests
Run the comprehensive pytest suite covering multilingual parsing, safety validation, reachability constraints, and timeline generation:
```powershell
cd c:\Users\cheran\OneDrive\Documents\ir_project
python -m pytest backend/tests -v
```

---

## 4. ROS 2 Jazzy Launch Instructions

When running with ROS 2 in WSL2 / Ubuntu 24.04:

```bash
# Source ROS 2 Jazzy workspace
source /opt/ros/jazzy/setup.bash
source /home/cheran_s/ir_project/install/setup.bash

# Launch unified display and MoveIt controllers
ros2 launch detailed_arm_description display.launch.py

# Launch ROS 2 bridge for web integration
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
```

When ROS 2 is running, the top navigation pill will automatically turn **GREEN (LIVE ws:9090)**. When ROS 2 is not detected, the system safely falls back to high-fidelity simulation mode with an explicit indicator.

---

## 5. Project Folder Structure

```
ir_project/
├── backend/
│   ├── app/
│   │   ├── config.py                 # Zone definitions, object inventory, physical limits
│   │   ├── main.py                   # FastAPI application, REST endpoints & WebSockets
│   │   ├── models/
│   │   │   ├── robot.py              # Pydantic models for joints, telemetry, gripper, logs
│   │   │   └── task.py               # Pydantic models for cognitive task plans & steps
│   │   ├── planner/
│   │   │   ├── multilingual_parser.py # English, Tamil, Malayalam, Hindi NLP parser
│   │   │   ├── llm_adapter.py        # Pluggable Gemini / OpenAI / Rule adapter
│   │   │   ├── task_planner.py       # Orchestrator & conversational reply generator
│   │   │   └── validator.py          # Safety checks, reachability & collision boundaries
│   │   ├── execution/
│   │   │   ├── executor.py           # 13-step timeline coordinator & state machine
│   │   │   └── trajectory.py         # Quintic S-curve trajectory & geometric IK
│   │   ├── storage/
│   │   │   └── task_history.py       # Task history storage with filters
│   │   └── ros2/
│   │       └── bridge_adapter.py     # rosbridge WebSocket client & topic publishers
│   ├── tests/
│   │   ├── test_multilingual_parser.py # Tests for EN, TA, ML, HI intent & entities
│   │   ├── test_validator.py         # Tests for safety rules, E-stop, and reachability
│   │   └── test_task_planner.py      # Tests for plan decomposition & ambiguity
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/               # TopNav (E-Stop, Lang, Mode) & Sidebar
│   │   │   ├── workspace/            # RobotScene3D (Three.js procedural arm & 4 zones)
│   │   │   ├── command/              # LeetCode-style CommandEditor with quick presets
│   │   │   ├── timeline/             # 13-step live ExecutionTimeline
│   │   │   ├── assistant/            # VoiceAssistantPanel with mic & TTS
│   │   │   ├── telemetry/            # JointTelemetryHUD & InventoryPanel
│   │   │   ├── history/              # TaskHistoryView with language & status filters
│   │   │   └── logs/                 # ExecutionLogs terminal view
│   │   ├── context/
│   │   │   └── RobotContext.tsx      # State store & WebSocket synchronization
│   │   ├── hooks/
│   │   │   └── useVoiceAssistant.ts  # Web Speech API STT/TTS hook
│   │   ├── types/
│   │   │   └── robot.ts              # TypeScript interfaces
│   │   ├── index.css                 # LeetCode dark charcoal design system tokens
│   │   ├── App.tsx                   # Master responsive application layout
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── src/                              # Preserved ROS 2 Jazzy workspace packages
│   ├── detailed_arm_description/     # Procedural 6-DOF URDF/Xacro and RViz2 configs
│   ├── llm_arm_moveit_config/        # MoveIt 2 motion planning, SRDF, KDL kinematics
│   └── ai_arm_control/               # ROS 2 commander node, execution controllers
├── .env.example                      # Sample configuration without secrets
└── README.md
```
