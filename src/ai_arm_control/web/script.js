/**
 * 6-DOF Industrial Robotic Arm Dashboard Controller
 * Native Three.js 3D Visualizer, ROS 2 WebSocket Bridge & Web Speech API Voice Commander
 */

// =========================================================
// 1. GLOBAL STATE & CONFIGURATION
// =========================================================
const CONFIG = {
  rosbridgeUrl: `ws://${window.location.hostname || 'localhost'}:9090`,
  reconnectInterval: 3000,
  defaultDuration: 2.0
};

const STATE = {
  rosConnected: false,
  simMode: false,
  isRecordingVoice: false,
  isMoving: false,
  activeIntent: 'STANDBY',
  // Joint values in radians: [j1, j2, j3, j4, j5, j6, gripper]
  joints: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  simTargetJoints: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  simStartJoints: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  simStartTime: 0,
  simDuration: 2.0
};

// Preset Poses
const PRESETS = {
  home: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
  ready: [0.0, -0.6, 1.2, 0.0, 0.6, 0.0],
  pick_pose: [0.0, 0.5, 0.8, 0.0, 0.3, 0.0],
  bend_down: [0.0, 1.1, 0.9, 0.0, -0.4, 0.0]
};

// UI Elements
const ui = {
  rosDot: document.getElementById('ros-dot'),
  rosText: document.getElementById('ros-status-text'),
  aiDot: document.getElementById('ai-dot'),
  aiText: document.getElementById('ai-status-text'),
  modeBtn: document.getElementById('sim-mode-toggle'),
  modeLabel: document.getElementById('current-mode-label'),
  voiceBtn: document.getElementById('voice-record-btn'),
  voiceStatus: document.getElementById('voice-status-text'),
  transcript: document.getElementById('transcript-preview'),
  commandForm: document.getElementById('command-form'),
  commandInput: document.getElementById('ai-command-input'),
  terminal: document.getElementById('log-terminal'),
  clearLogBtn: document.getElementById('clear-log-btn'),
  estopBtn: document.getElementById('estop-btn'),
  hudTcp: document.getElementById('hud-tcp-coords'),
  hudIntent: document.getElementById('hud-active-intent'),
  hudTraj: document.getElementById('hud-traj-status'),
  jointsList: document.getElementById('joints-list'),
  syncSlidersBtn: document.getElementById('sync-sliders-btn'),
  applySlidersBtn: document.getElementById('apply-sliders-btn'),
  resetCamBtn: document.getElementById('reset-cam-btn'),
  toggleGridBtn: document.getElementById('toggle-grid-btn'),
  toggleShadowsBtn: document.getElementById('toggle-shadows-btn'),
  threeContainer: document.getElementById('three-canvas-container'),
  toastContainer: document.getElementById('toast-container')
};

// =========================================================
// 2. THREE.JS 3D SCENE SETUP & PROCEDURAL ROBOT ARM
// =========================================================
let scene, camera, renderer, controls;
let robotRoot;
let jointNodes = []; // References to 3D joint rotation pivots
let fingerLeft, fingerRight;
let floorGrid;
let dirLight;

// Shared Materials matching URDF specification
const materials = {
  metallicSilver: new THREE.MeshStandardMaterial({
    color: 0xc8c8d2,
    metalness: 0.85,
    roughness: 0.25
  }),
  matteBlack: new THREE.MeshStandardMaterial({
    color: 0x1f1f22,
    metalness: 0.35,
    roughness: 0.65
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    color: 0x3f3f45,
    metalness: 0.7,
    roughness: 0.35
  }),
  accentCyan: new THREE.MeshBasicMaterial({
    color: 0x00f0ff
  }),
  rubberPad: new THREE.MeshStandardMaterial({
    color: 0x0d0d0d,
    roughness: 0.95
  })
};

function initThreeScene() {
  const width = ui.threeContainer.clientWidth;
  const height = ui.threeContainer.clientHeight;

  // 1. Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d14);
  scene.fog = new THREE.FogExp2(0x0a0d14, 0.12);

  // 2. Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 50);
  camera.position.set(1.4, 1.2, 1.6);

  // 3. Renderer with antialiasing and shadows
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  ui.threeContainer.appendChild(renderer.domElement);

  // 4. OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0.45, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underground
  controls.minDistance = 0.4;
  controls.maxDistance = 5.0;

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(2.5, 4.0, 2.0);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 10;
  dirLight.shadow.camera.left = -1.5;
  dirLight.shadow.camera.right = 1.5;
  dirLight.shadow.camera.top = 1.5;
  dirLight.shadow.camera.bottom = -1.5;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x00f0ff, 0.35);
  fillLight.position.set(-2.0, 1.5, -2.0);
  scene.add(fillLight);

  // 6. Environment Floor & Grid
  const floorGeo = new THREE.PlaneGeometry(12, 12);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0c0f17,
    roughness: 0.8,
    metalness: 0.2
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  floorGrid = new THREE.GridHelper(10, 20, 0x00f0ff, 0x1f293d);
  floorGrid.position.y = 0.002;
  scene.add(floorGrid);

  // Concentric range rings on ground
  for (let r of [0.4, 0.7, 1.0]) {
    const ringGeo = new THREE.RingGeometry(r - 0.003, r + 0.003, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, opacity: 0.15, transparent: true, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.003;
    scene.add(ring);
  }

  // 7. Build Procedural Robotic Arm matching URDF Kinematics
  buildProceduralArm();

  // 8. Event Listeners for Resize & Animation Loop
  window.addEventListener('resize', onWindowResize);
  animate();
}

/**
 * Builds the 6-DOF Robotic Arm hierarchy identical to detailed_arm.urdf.xacro.
 * Root is rotated so ROS coordinate conventions (Z up, X forward, Y left) map naturally.
 */
function buildProceduralArm() {
  robotRoot = new THREE.Group();
  // Rotate root so Three.js Y-up represents ROS Z-up, X forward, Y left
  // URDF: Z is up, X is forward, Y is left
  // Three.js: Y is up, -Z is forward, X is right
  // We attach meshes directly along Y-up in Three.js coordinates for clean visual elegance:
  scene.add(robotRoot);

  // =====================
  // BASE LINK
  // =====================
  const baseGroup = new THREE.Group();
  robotRoot.add(baseGroup);

  // Flange Plate (Radius: 0.18, Height: 0.04)
  const baseFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.04, 32),
    materials.darkMetal
  );
  baseFlange.position.y = 0.02;
  baseFlange.castShadow = true;
  baseFlange.receiveShadow = true;
  baseGroup.add(baseFlange);

  // Chamfered ring
  const baseChamfer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.02, 32),
    materials.metallicSilver
  );
  baseChamfer.position.y = 0.05;
  baseChamfer.castShadow = true;
  baseGroup.add(baseChamfer);

  // Base Pedestal Column (Radius: 0.13, Height: 0.08)
  const baseCol = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.08, 32),
    materials.metallicSilver
  );
  baseCol.position.y = 0.10;
  baseCol.castShadow = true;
  baseGroup.add(baseCol);

  // Glowing Cyan Ring
  const cyanRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.132, 0.132, 0.01, 32),
    materials.accentCyan
  );
  cyanRing.position.y = 0.145;
  baseGroup.add(cyanRing);

  // Bearing Top Mount
  const bearingMount = new THREE.Mesh(
    new THREE.CylinderGeometry(0.125, 0.125, 0.01, 32),
    materials.matteBlack
  );
  bearingMount.position.y = 0.155;
  baseGroup.add(bearingMount);

  // Base Bolts
  const boltGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.008, 12);
  const boltPositions = [[0.14, 0], [-0.14, 0], [0, 0.14], [0, -0.14]];
  boltPositions.forEach(([bx, bz]) => {
    const bolt = new THREE.Mesh(boltGeo, materials.matteBlack);
    bolt.position.set(bx, 0.042, bz);
    baseGroup.add(bolt);
  });

  // =====================
  // JOINT 1 (YAW - Axis: Y in Three.js, origin: y=0.16)
  // =====================
  const j1Node = new THREE.Group();
  j1Node.position.set(0, 0.16, 0);
  baseGroup.add(j1Node);
  jointNodes[0] = { node: j1Node, axis: 'y', sign: 1 };

  // SHOULDER LINK
  const shoulderGroup = new THREE.Group();
  j1Node.add(shoulderGroup);

  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.04, 32),
    materials.metallicSilver
  );
  turntable.position.y = 0.02;
  turntable.castShadow = true;
  shoulderGroup.add(turntable);

  const shoulderBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.16),
    materials.metallicSilver
  );
  shoulderBox.position.set(0, 0.08, 0.01);
  shoulderBox.castShadow = true;
  shoulderGroup.add(shoulderBox);

  // Side Motor Hubs (Left & Right)
  const shoulderHubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 24);
  const hubL = new THREE.Mesh(shoulderHubGeo, materials.matteBlack);
  hubL.rotation.z = Math.PI / 2;
  hubL.position.set(0.085, 0.10, 0);
  hubL.castShadow = true;
  shoulderGroup.add(hubL);

  const hubR = new THREE.Mesh(shoulderHubGeo, materials.matteBlack);
  hubR.rotation.z = Math.PI / 2;
  hubR.position.set(-0.085, 0.10, 0);
  hubR.castShadow = true;
  shoulderGroup.add(hubR);

  // =====================
  // JOINT 2 (PITCH - Axis: X in Three.js, origin: y=0.10, z=0.06)
  // =====================
  const j2Node = new THREE.Group();
  j2Node.position.set(0, 0.10, 0.06);
  shoulderGroup.add(j2Node);
  jointNodes[1] = { node: j2Node, axis: 'x', sign: -1 };

  // UPPER ARM LINK
  const upperArmGroup = new THREE.Group();
  j2Node.add(upperArmGroup);

  // Joint Pivot Hub
  const j2PivotHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.10, 24),
    materials.matteBlack
  );
  j2PivotHub.rotation.z = Math.PI / 2;
  upperArmGroup.add(j2PivotHub);

  // Arm Structural Beam (Length: 0.40m along Y)
  const upperArmBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.36, 0.09),
    materials.metallicSilver
  );
  upperArmBeam.position.set(0, 0.20, 0);
  upperArmBeam.castShadow = true;
  upperArmGroup.add(upperArmBeam);

  // Structural Side Ribs
  const ribFront = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.32, 0.07), materials.darkMetal);
  ribFront.position.set(0.058, 0.20, 0);
  upperArmGroup.add(ribFront);

  const ribBack = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.32, 0.07), materials.darkMetal);
  ribBack.position.set(-0.058, 0.20, 0);
  upperArmGroup.add(ribBack);

  // Cyan Accent Stripe
  const upperCyan = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.005), materials.accentCyan);
  upperCyan.position.set(0, 0.20, 0.048);
  upperArmGroup.add(upperCyan);

  // Elbow Actuator Housing at y=0.40
  const elbowHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.10, 24),
    materials.matteBlack
  );
  elbowHub.rotation.z = Math.PI / 2;
  elbowHub.position.set(0, 0.40, 0);
  upperArmGroup.add(elbowHub);

  // =====================
  // JOINT 3 (ELBOW PITCH - Axis: X in Three.js, origin: y=0.40, z=-0.06)
  // =====================
  const j3Node = new THREE.Group();
  j3Node.position.set(0, 0.40, -0.06);
  upperArmGroup.add(j3Node);
  jointNodes[2] = { node: j3Node, axis: 'x', sign: -1 };

  // FOREARM LINK
  const forearmGroup = new THREE.Group();
  j3Node.add(forearmGroup);

  const elbowPivotHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.09, 24),
    materials.matteBlack
  );
  elbowPivotHub.rotation.z = Math.PI / 2;
  forearmGroup.add(elbowPivotHub);

  // Forearm Column (Length 0.30)
  const forearmCol = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.30, 24),
    materials.metallicSilver
  );
  forearmCol.position.set(0, 0.175, 0);
  forearmCol.castShadow = true;
  forearmGroup.add(forearmCol);

  // Forearm Side Enclosure
  const forearmBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.26, 0.08),
    materials.metallicSilver
  );
  forearmBox.position.set(0, 0.175, 0);
  forearmBox.castShadow = true;
  forearmGroup.add(forearmBox);

  // Motor Pack
  const motorPack = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.16, 0.03),
    materials.matteBlack
  );
  motorPack.position.set(0, 0.14, 0.048);
  forearmGroup.add(motorPack);

  // Forearm Indicator Ring
  const forearmRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.008, 24),
    materials.accentCyan
  );
  forearmRing.position.set(0, 0.32, 0);
  forearmGroup.add(forearmRing);

  // Forearm Top Flange
  const forearmFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.01, 24),
    materials.matteBlack
  );
  forearmFlange.position.set(0, 0.345, 0);
  forearmGroup.add(forearmFlange);

  // =====================
  // JOINT 4 (WRIST 1 ROLL - Axis: Y in Three.js, origin: y=0.35)
  // =====================
  const j4Node = new THREE.Group();
  j4Node.position.set(0, 0.35, 0);
  forearmGroup.add(j4Node);
  jointNodes[3] = { node: j4Node, axis: 'y', sign: 1 };

  // WRIST 1 LINK
  const wrist1Group = new THREE.Group();
  j4Node.add(wrist1Group);

  const wrist1Plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.03, 24),
    materials.matteBlack
  );
  wrist1Plate.position.set(0, 0.015, 0);
  wrist1Group.add(wrist1Plate);

  const wrist1Box = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.06, 0.07),
    materials.metallicSilver
  );
  wrist1Box.position.set(0, 0.05, 0.01);
  wrist1Group.add(wrist1Box);

  // Lateral Pitch Hubs
  const lateralHubGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.02, 16);
  const latHubL = new THREE.Mesh(lateralHubGeo, materials.matteBlack);
  latHubL.rotation.z = Math.PI / 2;
  latHubL.position.set(0.045, 0.055, 0);
  wrist1Group.add(latHubL);

  const latHubR = new THREE.Mesh(lateralHubGeo, materials.matteBlack);
  latHubR.rotation.z = Math.PI / 2;
  latHubR.position.set(-0.045, 0.055, 0);
  wrist1Group.add(latHubR);

  // =====================
  // JOINT 5 (WRIST 2 PITCH - Axis: X in Three.js, origin: y=0.055, z=0.03)
  // =====================
  const j5Node = new THREE.Group();
  j5Node.position.set(0, 0.055, 0.03);
  wrist1Group.add(j5Node);
  jointNodes[4] = { node: j5Node, axis: 'x', sign: -1 };

  // WRIST 2 LINK
  const wrist2Group = new THREE.Group();
  j5Node.add(wrist2Group);

  const w2Pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16),
    materials.matteBlack
  );
  w2Pivot.rotation.z = Math.PI / 2;
  wrist2Group.add(w2Pivot);

  const w2Body = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.05, 0.055),
    materials.metallicSilver
  );
  w2Body.position.set(0, 0.035, -0.015);
  wrist2Group.add(w2Body);

  // =====================
  // JOINT 6 (WRIST 3 ROLL - Axis: Y in Three.js, origin: y=0.06, z=-0.03)
  // =====================
  const j6Node = new THREE.Group();
  j6Node.position.set(0, 0.06, -0.03);
  wrist2Group.add(j6Node);
  jointNodes[5] = { node: j6Node, axis: 'y', sign: 1 };

  // WRIST 3 LINK & TOOL FLANGE
  const wrist3Group = new THREE.Group();
  j6Node.add(wrist3Group);

  const toolFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.016, 24),
    materials.metallicSilver
  );
  toolFlange.position.set(0, 0.008, 0);
  toolFlange.castShadow = true;
  wrist3Group.add(toolFlange);

  // =====================
  // GRIPPER ASSEMBLY (Fixed to wrist 3 at y=0.02)
  // =====================
  const gripperBase = new THREE.Group();
  gripperBase.position.set(0, 0.02, 0);
  wrist3Group.add(gripperBase);

  // Gripper Actuator Body
  const gripperBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.04, 0.08),
    materials.matteBlack
  );
  gripperBody.position.set(0, 0.02, 0);
  gripperBody.castShadow = true;
  gripperBase.add(gripperBody);

  // Faceplate
  const gripperFace = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.005, 0.075),
    materials.metallicSilver
  );
  gripperFace.position.set(0, 0.042, 0);
  gripperBase.add(gripperFace);

  // Gripper Status LED
  const gripperLed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.01, 12),
    materials.accentCyan
  );
  gripperLed.position.set(0.028, 0.025, 0);
  gripperBase.add(gripperLed);

  // Articulated Left Finger (moves along +Z / -Z or X)
  fingerLeft = new THREE.Group();
  fingerLeft.position.set(0, 0.045, 0.01);
  gripperBase.add(fingerLeft);

  const fingerLCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.015), materials.metallicSilver);
  fingerLCarrier.position.set(0, 0.012, 0.005);
  fingerLeft.add(fingerLCarrier);

  const fingerLClaw = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.01), materials.darkMetal);
  fingerLClaw.position.set(0, 0.04, 0.008);
  fingerLeft.add(fingerLClaw);

  const fingerLPad = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.003), materials.rubberPad);
  fingerLPad.position.set(0, 0.045, 0.002);
  fingerLeft.add(fingerLPad);

  // Articulated Right Finger
  fingerRight = new THREE.Group();
  fingerRight.position.set(0, 0.045, -0.01);
  gripperBase.add(fingerRight);

  const fingerRCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.015), materials.metallicSilver);
  fingerRCarrier.position.set(0, 0.012, -0.005);
  fingerRight.add(fingerRCarrier);

  const fingerRClaw = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.01), materials.darkMetal);
  fingerRClaw.position.set(0, 0.04, -0.008);
  fingerRight.add(fingerRClaw);

  const fingerRPad = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.003), materials.rubberPad);
  fingerRPad.position.set(0, 0.045, -0.002);
  fingerRight.add(fingerRPad);
}

/**
 * Apply joint angles to the 3D visual arm hierarchy
 */
function applyJointsTo3D(angles) {
  // Update 6 Revolute Joints
  for (let i = 0; i < 6; i++) {
    const jInfo = jointNodes[i];
    if (jInfo && jInfo.node) {
      const val = angles[i] * jInfo.sign;
      if (jInfo.axis === 'y') {
        jInfo.node.rotation.y = val;
      } else if (jInfo.axis === 'x') {
        jInfo.node.rotation.x = val;
      } else if (jInfo.axis === 'z') {
        jInfo.node.rotation.z = val;
      }
    }
  }

  // Update Gripper Fingers (prismatic stroke along Z)
  if (fingerLeft && fingerRight) {
    const stroke = angles[6] || 0.0; // 0.0 to 0.04
    fingerLeft.position.z = 0.01 + stroke;
    fingerRight.position.z = -0.01 - stroke;
  }

  // Update Forward Kinematics (FK) TCP HUD
  updateForwardKinematicsHUD();
}

/**
 * Computes End-Effector TCP Cartesian coordinates in 3D world space
 */
function safeFormatNum(val, digits = 2, fallback = '0.00') {
  if (val === null || val === undefined || typeof val !== 'number' || !Number.isFinite(val)) {
    return fallback;
  }
  return val.toFixed(digits);
}

function updateForwardKinematicsHUD() {
  if (!fingerLeft) return;
  const worldPos = new THREE.Vector3();
  fingerLeft.getWorldPosition(worldPos);

  const xStr = (worldPos && Number.isFinite(worldPos.x) && worldPos.x >= 0 ? '+' : '') + safeFormatNum(worldPos?.x, 2, '0.00');
  const yStr = (worldPos && Number.isFinite(worldPos.z) && worldPos.z >= 0 ? '+' : '') + safeFormatNum(worldPos?.z, 2, '0.00'); // Local horizontal
  const zStr = (worldPos && Number.isFinite(worldPos.y) && worldPos.y >= 0 ? '+' : '') + safeFormatNum(worldPos?.y, 2, '0.00'); // Height

  ui.hudTcp.textContent = `X: ${xStr}  Y: ${yStr}  Z: ${zStr} m`;
}

function onWindowResize() {
  const width = ui.threeContainer.clientWidth;
  const height = ui.threeContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  // If in Simulation Mode or executing local trajectory
  if (STATE.isMoving) {
    const elapsed = (Date.now() - STATE.simStartTime) / 1000.0;
    const tau = Math.min(1.0, Math.max(0.0, elapsed / STATE.simDuration));
    
    // Quintic S-Curve blend: 10*tau^3 - 15*tau^4 + 6*tau^5
    const blend = 10.0 * Math.pow(tau, 3) - 15.0 * Math.pow(tau, 4) + 6.0 * Math.pow(tau, 5);

    for (let i = 0; i < 7; i++) {
      const delta = STATE.simTargetJoints[i] - STATE.simStartJoints[i];
      STATE.joints[i] = STATE.simStartJoints[i] + delta * blend;
    }

    applyJointsTo3D(STATE.joints);
    updateJointSlidersUI();

    ui.hudTraj.textContent = `MOVING (${(elapsed).toFixed(1)}s / ${STATE.simDuration.toFixed(1)}s)`;

    if (tau >= 1.0) {
      STATE.isMoving = false;
      STATE.joints = [...STATE.simTargetJoints];
      applyJointsTo3D(STATE.joints);
      updateJointSlidersUI();
      ui.hudTraj.textContent = `IDLE (0.00s)`;
      setAiStateBadge('Standby', 'idle');
      addLogEntry(`[SIM] Trajectory target [${STATE.activeIntent}] reached.`, 'log-info');
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

// =========================================================
// 3. ROS 2 WEBSOCKET BRIDGE (ROSLIB.JS)
// =========================================================
let ros = null;
let jointStatesTopic = null;
let aiCommandTopic = null;
let aiStatusTopic = null;

function initRosbridge() {
  addLogEntry(`[ROS] Connecting to WebSocket ${CONFIG.rosbridgeUrl}...`, 'log-ros');

  try {
    ros = new ROSLIB.Ros({
      url: CONFIG.rosbridgeUrl
    });

    ros.on('connection', () => {
      STATE.rosConnected = true;
      setRosStateBadge(true);
      addLogEntry('[ROS] Connected to ROS 2 rosbridge_server successfully!', 'log-ros');
      showToast('ROS 2 WebSocket Connected');

      // 1. Subscribe to /joint_states
      jointStatesTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/joint_states',
        messageType: 'sensor_msgs/JointState'
      });

      jointStatesTopic.subscribe((msg) => {
        // Map JointState message array to our internal joint order
        const nameMap = {};
        for (let i = 0; i < msg.name.length; i++) {
          nameMap[msg.name[i]] = msg.position[i];
        }

        const newJoints = [
          nameMap['joint1'] !== undefined ? nameMap['joint1'] : STATE.joints[0],
          nameMap['joint2'] !== undefined ? nameMap['joint2'] : STATE.joints[1],
          nameMap['joint3'] !== undefined ? nameMap['joint3'] : STATE.joints[2],
          nameMap['joint4'] !== undefined ? nameMap['joint4'] : STATE.joints[3],
          nameMap['joint5'] !== undefined ? nameMap['joint5'] : STATE.joints[4],
          nameMap['joint6'] !== undefined ? nameMap['joint6'] : STATE.joints[5],
          nameMap['finger_joint'] !== undefined ? nameMap['finger_joint'] : STATE.joints[6]
        ];

        STATE.joints = newJoints;
        applyJointsTo3D(STATE.joints);
        updateJointSlidersUI();
      });

      // 2. Subscribe to /ai_arm_status
      aiStatusTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/ai_arm_status',
        messageType: 'std_msgs/String'
      });

      aiStatusTopic.subscribe((msg) => {
        try {
          const status = JSON.parse(msg.data);
          if (status.level !== 'HEARTBEAT') {
            addLogEntry(`[AI] ${status.message}`, 'log-ai');
          }
          if (status.intent) {
            ui.hudIntent.textContent = status.intent.toUpperCase();
          }
          if (status.is_moving) {
            setAiStateBadge(`Moving: ${status.intent}`, 'active');
            ui.hudTraj.textContent = `PLANNING (${(status.progress * 100).toFixed(0)}%)`;
          } else {
            setAiStateBadge('Standby', 'idle');
            ui.hudTraj.textContent = `IDLE (0.00s)`;
          }
        } catch (e) {
          addLogEntry(`[AI] ${msg.data}`, 'log-ai');
        }
      });

      // 3. Publisher to /ai_arm_command
      aiCommandTopic = new ROSLIB.Topic({
        ros: ros,
        name: '/ai_arm_command',
        messageType: 'std_msgs/String'
      });
    });

    ros.on('error', (error) => {
      if (STATE.rosConnected) {
        addLogEntry(`[ROS] Bridge Error: ${error}`, 'log-error');
      }
      STATE.rosConnected = false;
      setRosStateBadge(false);
    });

    ros.on('close', () => {
      STATE.rosConnected = false;
      setRosStateBadge(false);
      setTimeout(initRosbridge, CONFIG.reconnectInterval);
    });

  } catch (err) {
    addLogEntry(`[ROS] ROSLIB initialization failed: ${err.message}`, 'log-warn');
    setRosStateBadge(false);
    setTimeout(initRosbridge, CONFIG.reconnectInterval);
  }
}

function sendArmCommand(cmdText) {
  cmdText = cmdText.trim();
  if (!cmdText) return;

  addLogEntry(`[CMD] Sending: "${cmdText}"`, 'log-info');
  ui.hudIntent.textContent = cmdText.toUpperCase().slice(0, 24);

  // If connected to ROS 2, publish to /ai_arm_command
  if (STATE.rosConnected && aiCommandTopic) {
    const msg = new ROSLIB.Message({ data: cmdText });
    aiCommandTopic.publish(msg);
    showToast(`Command Sent: ${cmdText}`);
  } else {
    // Standalone Simulation fallback
    showToast(`Simulating: ${cmdText}`);
    simulateCommandLocally(cmdText);
  }
}

/**
 * Local simulation execution when ROS 2 Bridge is offline
 */
function simulateCommandLocally(cmdText) {
  const norm = cmdText.toLowerCase();

  if (norm.includes('stop') || norm.includes('halt')) {
    STATE.isMoving = false;
    addLogEntry('[SIM] E-STOP Triggered locally.', 'log-warn');
    return;
  }

  let targetPose = null;
  let targetGripper = STATE.joints[6];
  let intentName = 'Custom Pose';

  if (norm.includes('home') || norm.includes('reset')) {
    targetPose = PRESETS.home;
    intentName = 'Home Position';
  } else if (norm.includes('ready') || norm.includes('standby')) {
    targetPose = PRESETS.ready;
    intentName = 'Ready Pose';
  } else if (norm.includes('pick') || norm.includes('reach')) {
    targetPose = PRESETS.pick_pose;
    intentName = 'Pick Pose';
  } else if (norm.includes('bend') || norm.includes('lower') || norm.includes('ground')) {
    targetPose = PRESETS.bend_down;
    intentName = 'Bend Down';
  } else if (norm.includes('open hand') || norm.includes('release')) {
    targetPose = [...STATE.joints.slice(0, 6)];
    targetGripper = 0.04;
    intentName = 'Open Hand';
  } else if (norm.includes('close hand') || norm.includes('grasp')) {
    targetPose = [...STATE.joints.slice(0, 6)];
    targetGripper = 0.0;
    intentName = 'Close Hand';
  } else if (norm.includes('wave')) {
    // Quick wave simulation
    simulateLocalMacroWave();
    return;
  } else if (norm.includes('pick and place')) {
    simulateLocalMacroPickPlace();
    return;
  } else {
    // Check for "joint X to Y"
    const m = norm.match(/(?:joint|j)\s*([1-6])\s*(?:to|by)?\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      const idx = parseInt(m[1]) - 1;
      const deg = parseFloat(m[2]);
      const rad = deg * (Math.PI / 180.0);
      targetPose = [...STATE.joints.slice(0, 6)];
      targetPose[idx] = rad;
      intentName = `Joint ${idx+1} -> ${deg}°`;
    }
  }

  if (targetPose) {
    startLocalTrajectory(targetPose, targetGripper, intentName, 2.0);
  }
}

function startLocalTrajectory(armAngles, gripperVal, label, duration = 2.0) {
  STATE.simStartJoints = [...STATE.joints];
  STATE.simTargetJoints = [...armAngles, gripperVal];
  STATE.simStartTime = Date.now();
  STATE.simDuration = duration;
  STATE.activeIntent = label;
  STATE.isMoving = true;
  setAiStateBadge(`Moving: ${label}`, 'active');
  addLogEntry(`[SIM] Trajectory started: ${label} (${duration}s)`, 'log-info');
}

function simulateLocalMacroWave() {
  startLocalTrajectory(PRESETS.ready, 0.04, 'Wave Routine (1/3)', 1.5);
  setTimeout(() => {
    startLocalTrajectory([0.0, -0.6, 1.2, 0.5, 0.6, 0.5], 0.04, 'Wave Routine (2/3)', 0.8);
    setTimeout(() => {
      startLocalTrajectory([0.0, -0.6, 1.2, -0.5, 0.6, -0.5], 0.04, 'Wave Routine (3/3)', 0.8);
      setTimeout(() => {
        startLocalTrajectory(PRESETS.home, 0.0, 'Wave Routine -> Home', 2.0);
      }, 1000);
    }, 1000);
  }, 1800);
}

function simulateLocalMacroPickPlace() {
  startLocalTrajectory(PRESETS.pick_pose, 0.04, 'Pick & Place: Reach', 1.8);
  setTimeout(() => {
    startLocalTrajectory(PRESETS.pick_pose, 0.0, 'Pick & Place: Grasp', 0.8);
    setTimeout(() => {
      startLocalTrajectory(PRESETS.ready, 0.0, 'Pick & Place: Lift', 1.5);
      setTimeout(() => {
        startLocalTrajectory([1.2, 0.5, 0.8, 0.0, 0.3, 0.0], 0.0, 'Pick & Place: Move Zone', 1.8);
        setTimeout(() => {
          startLocalTrajectory([1.2, 0.5, 0.8, 0.0, 0.3, 0.0], 0.04, 'Pick & Place: Release', 0.8);
          setTimeout(() => {
            startLocalTrajectory(PRESETS.home, 0.0, 'Pick & Place: Return Home', 2.0);
          }, 1000);
        }, 2000);
      }, 1700);
    }, 1000);
  }, 2000);
}

// =========================================================
// 4. VOICE CONTROL (WEB SPEECH API)
// =========================================================
let recognition = null;

function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    ui.voiceStatus.textContent = 'Speech API not supported in this browser';
    ui.transcript.textContent = 'Please use Chrome, Edge, or text input.';
    ui.voiceBtn.style.opacity = '0.5';
    addLogEntry('[VOICE] Web Speech API not supported in this browser environment.', 'log-warn');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    STATE.isRecordingVoice = true;
    ui.voiceBtn.classList.add('recording');
    ui.voiceStatus.textContent = 'Listening... Speak your command';
    ui.transcript.textContent = '"Listening for speech..."';
    addLogEntry('[VOICE] Microphone listening started...', 'log-voice');
  };

  recognition.onresult = (event) => {
    let transcriptText = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcriptText += event.results[i][0].transcript;
    }
    ui.transcript.textContent = `"${transcriptText}"`;

    if (event.results[0].isFinal) {
      addLogEntry(`[VOICE] Recognized: "${transcriptText}"`, 'log-voice');
      ui.commandInput.value = transcriptText;
      sendArmCommand(transcriptText);
    }
  };

  recognition.onerror = (event) => {
    STATE.isRecordingVoice = false;
    ui.voiceBtn.classList.remove('recording');
    ui.voiceStatus.textContent = `Error: ${event.error}`;
    addLogEntry(`[VOICE] Recognition Error: ${event.error}`, 'log-error');
  };

  recognition.onend = () => {
    STATE.isRecordingVoice = false;
    ui.voiceBtn.classList.remove('recording');
    ui.voiceStatus.textContent = 'Click microphone to speak';
  };

  ui.voiceBtn.addEventListener('click', () => {
    if (STATE.isRecordingVoice) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        addLogEntry(`[VOICE] Mic start error: ${e.message}`, 'log-warn');
      }
    }
  });
}

// =========================================================
// 5. TELEMETRY HUD & JOINT SLIDERS CONTROLS
// =========================================================
const JOINT_DEFS = [
  { name: 'Joint 1 (Base Yaw)', min: -180, max: 180, unit: '°' },
  { name: 'Joint 2 (Shoulder Pitch)', min: -120, max: 120, unit: '°' },
  { name: 'Joint 3 (Elbow Pitch)', min: -150, max: 150, unit: '°' },
  { name: 'Joint 4 (Wrist 1 Roll)', min: -180, max: 180, unit: '°' },
  { name: 'Joint 5 (Wrist 2 Pitch)', min: -120, max: 120, unit: '°' },
  { name: 'Joint 6 (Wrist 3 Roll)', min: -180, max: 180, unit: '°' },
  { name: 'Gripper Claw Stroke', min: 0, max: 40, unit: 'mm' }
];

function buildJointSlidersUI() {
  ui.jointsList.innerHTML = '';

  JOINT_DEFS.forEach((jDef, idx) => {
    const row = document.createElement('div');
    row.className = 'joint-row';

    const info = document.createElement('div');
    info.className = 'joint-info-line';
    info.innerHTML = `
      <span class="joint-tag">J${idx + 1 < 7 ? idx + 1 : 'G'}: ${jDef.name}</span>
      <span class="joint-val-badge" id="val-badge-${idx}">0.0${jDef.unit}</span>
    `;

    const sliderLine = document.createElement('div');
    sliderLine.className = 'joint-slider-line';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'joint-slider';
    slider.id = `slider-joint-${idx}`;
    slider.min = jDef.min;
    slider.max = jDef.max;
    slider.step = idx === 6 ? '1' : '0.5';
    slider.value = '0';

    slider.addEventListener('input', () => {
      let val = parseFloat(slider.value);
      document.getElementById(`val-badge-${idx}`).textContent = `${val.toFixed(1)}${jDef.unit}`;
    });

    sliderLine.appendChild(slider);
    row.appendChild(info);
    row.appendChild(sliderLine);
    ui.jointsList.appendChild(row);
  });
}

function updateJointSlidersUI() {
  for (let i = 0; i < 7; i++) {
    const slider = document.getElementById(`slider-joint-${i}`);
    const badge = document.getElementById(`val-badge-${i}`);
    if (!slider || !badge) continue;

    let displayVal, unit;
    const jVal = (STATE.joints && typeof STATE.joints[i] === 'number' && Number.isFinite(STATE.joints[i])) ? STATE.joints[i] : 0.0;
    if (i < 6) {
      displayVal = safeFormatNum((jVal * 180.0) / Math.PI, 1, '0.0');
      unit = '°';
    } else {
      displayVal = safeFormatNum(jVal * 1000.0, 0, '0'); // m to mm
      unit = 'mm';
    }

    badge.textContent = `${displayVal}${unit}`;
    if (!document.activeElement || document.activeElement.id !== `slider-joint-${i}`) {
      slider.value = displayVal;
    }
  }
}

// =========================================================
// 6. UI LOGGING & HELPER UTILITIES
// =========================================================
function addLogEntry(text, cssClass = 'log-info') {
  const time = new Date().toTimeString().split(' ')[0];
  const div = document.createElement('div');
  div.className = `log-entry ${cssClass}`;
  div.textContent = `[${time}] ${text}`;
  ui.terminal.appendChild(div);
  ui.terminal.scrollTop = ui.terminal.scrollHeight;
}

function setRosStateBadge(connected) {
  if (connected) {
    ui.rosDot.className = 'status-dot connected';
    ui.rosText.textContent = 'ROS 2: Online (9090)';
    ui.modeLabel.textContent = 'ROS 2 LIVE';
  } else {
    ui.rosDot.className = 'status-dot disconnected';
    ui.rosText.textContent = 'ROS 2: Offline (Sim Mode)';
    ui.modeLabel.textContent = 'SIMULATION';
  }
}

function setAiStateBadge(label, stateClass) {
  ui.aiDot.className = `status-dot ${stateClass}`;
  ui.aiText.textContent = `AI: ${label}`;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  ui.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// =========================================================
// 7. INITIALIZATION & EVENT BINDINGS
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Three.js Viewport
  initThreeScene();

  // 2. Build UI sliders
  buildJointSlidersUI();

  // 3. Connect to ROS 2 rosbridge
  initRosbridge();

  // 4. Initialize Voice Recognition
  initVoiceRecognition();

  // 5. Text Command Form Submit
  ui.commandForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cmd = ui.commandInput.value.trim();
    if (cmd) {
      sendArmCommand(cmd);
      ui.commandInput.value = '';
    }
  });

  // 6. Quick Action & Preset Buttons
  document.querySelectorAll('.preset-btn, .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) {
        sendArmCommand(cmd);
      }
    });
  });

  // 7. Emergency Stop Button
  ui.estopBtn.addEventListener('click', () => {
    sendArmCommand('EMERGENCY STOP');
  });

  // 8. Manual Joint Slider Apply
  ui.applySlidersBtn.addEventListener('click', () => {
    const targetRad = [];
    for (let i = 0; i < 6; i++) {
      const slider = document.getElementById(`slider-joint-${i}`);
      const deg = parseFloat(slider.value);
      targetRad.push(deg * Math.PI / 180.0);
    }
    const gripSlider = document.getElementById('slider-joint-6');
    const gripStroke = parseFloat(gripSlider.value) / 1000.0;

    const cmdStr = `set joint angles [${targetRad.map(r => r.toFixed(3)).join(', ')}]`;
    sendArmCommand(cmdStr);
    if (!STATE.rosConnected) {
      startLocalTrajectory(targetRad, gripStroke, 'Manual Joint Tuning', 1.5);
    }
  });

  // 9. Sync Sliders to Current Live
  ui.syncSlidersBtn.addEventListener('click', () => {
    updateJointSlidersUI();
    showToast('Sliders synchronized with current pose');
  });

  // 10. Clear Terminal Log
  ui.clearLogBtn.addEventListener('click', () => {
    ui.terminal.innerHTML = '<div class="log-entry log-sys">[SYS] Log cleared by user.</div>';
  });

  // 11. Viewport Tools
  ui.resetCamBtn.addEventListener('click', () => {
    camera.position.set(1.4, 1.2, 1.6);
    controls.target.set(0, 0.45, 0);
    showToast('Camera View Reset');
  });

  ui.toggleGridBtn.addEventListener('click', () => {
    if (floorGrid) floorGrid.visible = !floorGrid.visible;
  });

  ui.toggleShadowsBtn.addEventListener('click', () => {
    if (dirLight) dirLight.castShadow = !dirLight.castShadow;
  });

  addLogEntry('[SYS] 6-DOF Industrial Robotic Arm Dashboard Ready.', 'log-sys');
});
