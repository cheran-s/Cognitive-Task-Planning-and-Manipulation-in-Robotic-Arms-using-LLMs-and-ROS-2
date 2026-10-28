import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RobotObject, ZoneConfig, JointAngles, GripperState } from '../../types/robot';
import { Maximize2, RotateCcw, Eye } from 'lucide-react';

interface RobotScene3DProps {
  joints: JointAngles;
  gripper: GripperState;
  objects: Record<string, RobotObject>;
  zones: Record<string, ZoneConfig>;
  selectedObjectId?: string;
  targetZoneId?: string;
  onSelectObject: (objectId: string) => void;
  onSelectZone?: (zoneId: string) => void;
}

export const RobotScene3D: React.FC<RobotScene3DProps> = ({
  joints,
  gripper,
  objects,
  zones,
  selectedObjectId,
  targetZoneId,
  onSelectObject,
  onSelectZone
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Articulated Joint Pivots matching reference cobot arm
  const jointNodesRef = useRef<any[]>([]);
  const gripperFingersRef = useRef<{ left: THREE.Group; right: THREE.Group } | null>(null);
  const tcpMarkerRef = useRef<THREE.Group | null>(null);

  // Mesh registries
  const objectMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const zoneMeshesRef = useRef<Map<string, THREE.Group>>(new Map());

  // Real-time references for 60fps physics synchronization
  const gripperRef = useRef(gripper);
  gripperRef.current = gripper;
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Clear mesh registries for clean mount
    objectMeshesRef.current.clear();
    zoneMeshesRef.current.clear();

    // Sizing with safe fallbacks
    const width = Math.max(container.clientWidth || container.parentElement?.clientWidth || 800, 400);
    const height = Math.max(container.clientHeight || container.parentElement?.clientHeight || 500, 350);

    // 1. Scene with Deep Dark Studio Background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d12);
    scene.fog = new THREE.FogExp2(0x0b0d12, 0.05);
    sceneRef.current = scene;

    // 2. Camera: Centered and framed prominently on the robot arm
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.05, 50);
    camera.position.set(1.1, 0.85, 1.25);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e: any) {
      setInitError(`WebGL Initialization Failed: ${e.message}`);
      return;
    }

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.35, 0); // Focus at center of arm workspace
    controls.maxPolarAngle = Math.PI / 2 - 0.01; // Keep above floor
    controls.minDistance = 0.4;
    controls.maxDistance = 3.5;
    controlsRef.current = controls;

    // 5. Studio Lighting Setup (Highlighting silver curves and matte black accents)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Key directional light with soft shadows
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(2.5, 4.0, 2.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 8;
    keyLight.shadow.camera.left = -1.5;
    keyLight.shadow.camera.right = 1.5;
    keyLight.shadow.camera.top = 1.5;
    keyLight.shadow.camera.bottom = -1.5;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cool cyan fill light for industrial contrast
    const fillLight = new THREE.DirectionalLight(0x00e5ff, 0.45);
    fillLight.position.set(-2.5, 2.5, -2.0);
    scene.add(fillLight);

    // Warm orange rim backlight matching studio theme
    const rimLight = new THREE.DirectionalLight(0xff8a00, 0.6);
    rimLight.position.set(0.5, 2.0, -2.5);
    scene.add(rimLight);

    // Top soft overhead light
    const topLight = new THREE.PointLight(0xffffff, 0.5, 5.0);
    topLight.position.set(0, 2.0, 0);
    scene.add(topLight);

    // 6. Studio Floor & Engineering Grid
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0e1118,
      roughness: 0.9,
      metalness: 0.1
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Subtle dual-tone grid
    const floorGrid = new THREE.GridHelper(8, 24, 0xff8a00, 0x222836);
    floorGrid.position.y = 0.001;
    scene.add(floorGrid);

    // Workspace Reach Envelopes
    [0.4, 0.7, 0.85].forEach((r) => {
      const ringGeo = new THREE.RingGeometry(r - 0.002, r + 0.002, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: r === 0.85 ? 0xff8a00 : 0x00e5ff,
        opacity: r === 0.85 ? 0.3 : 0.15,
        transparent: true,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.003;
      scene.add(ring);
    });

    // 7. BUILD ROBOT ARM MATCHING EXACT REFERENCE IMAGE
    buildReferenceRobotArm(scene);

    // 8. Animation & Render Loop (60 FPS Physical Real-Time Sync)
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Physical Grasp Synchronization:
      // An object is attached ONLY after simulated grasp verification succeeds (is_grasp_secured === true)
      const currentGripper = gripperRef.current;
      if (
        currentGripper?.is_closed &&
        currentGripper?.is_grasp_secured &&
        currentGripper?.grasped_object_id &&
        tcpMarkerRef.current
      ) {
        const graspedGrp = objectMeshesRef.current.get(currentGripper.grasped_object_id);
        if (graspedGrp) {
          const tcpWorldPos = new THREE.Vector3();
          tcpMarkerRef.current.getWorldPosition(tcpWorldPos);
          graspedGrp.position.copy(tcpWorldPos);
          graspedGrp.position.y -= 0.025; // Align centered between parallel rubber finger pads
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // 9. ResizeObserver for robust layout changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Click Raycasting for Object Selection
    const handleClick = (e: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const interactableMeshes: THREE.Object3D[] = [];
      objectMeshesRef.current.forEach((grp) => {
        if (grp) {
          grp.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              interactableMeshes.push(child);
            }
          });
        }
      });
      zoneMeshesRef.current.forEach((grp) => {
        if (grp) {
          grp.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              interactableMeshes.push(child);
            }
          });
        }
      });

      const intersects = raycasterRef.current.intersectObjects(interactableMeshes);
      if (intersects.length > 0) {
        let cur: THREE.Object3D | null = intersects[0].object;
        while (cur && cur.parent && !cur.userData.objectId && !cur.userData.zoneId) {
          cur = cur.parent;
        }
        if (cur && cur.userData.objectId) {
          onSelectObject(cur.userData.objectId);
        } else if (cur && cur.userData.zoneId && onSelectZone) {
          onSelectZone(cur.userData.zoneId);
        }
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      objectMeshesRef.current.clear();
      zoneMeshesRef.current.clear();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  /**
   * PROCEDURALLY BUILDS THE ROBOT ARM TO MATCH THE REFERENCE IMAGE:
   * Features:
   * - Square mounting base plate with perimeter bolt holes (pearl metallic silver)
   * - Flared turret pedestal collar
   * - Matte graphite/black ribbed actuator collar (Joint 1 hub)
   * - Streamlined curved shoulder link with circular joint disc caps
   * - Tapered pearl silver upper arm with subtle mid-joint transition ring
   * - Cylindrical elbow knuckle (Joint 3) with side disc hubs
   * - Forearm link connecting to compact 3-axis articulated wrist assembly
   * - Matte black cylindrical end-effector adapter flange
   * - Industrial black two-finger claw gripper with angled bevels and rubber grip pads
   */
  const buildReferenceRobotArm = (scene: THREE.Scene) => {
    jointNodesRef.current = [];

    // Reference-Matched PBR Materials
    const pearlSilverMat = new THREE.MeshStandardMaterial({
      color: 0xd8dde4,
      metalness: 0.65,
      roughness: 0.28
    });

    const brushedAluMat = new THREE.MeshStandardMaterial({
      color: 0xc4cbd5,
      metalness: 0.8,
      roughness: 0.22
    });

    const matteBlackMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      metalness: 0.3,
      roughness: 0.6
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x2e3340,
      metalness: 0.7,
      roughness: 0.35
    });

    const rubberPadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0c,
      roughness: 0.95
    });

    const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const orangeTcpMat = new THREE.MeshBasicMaterial({ color: 0xff8a00 });

    const armRoot = new THREE.Group();
    scene.add(armRoot);

    // ==========================================
    // 1. BASE ASSEMBLY (Reference: Square plate with bolt holes & flared riser)
    // ==========================================
    const baseGroup = new THREE.Group();
    armRoot.add(baseGroup);

    // Square Mounting Base Plate (0.34m x 0.34m x 0.02m)
    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.02, 0.34),
      pearlSilverMat
    );
    basePlate.position.y = 0.01;
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    baseGroup.add(basePlate);

    // Perimeter Mounting Bolt Holes / Rivets (8 holes as shown in reference)
    const boltGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.022, 16);
    const boltCoords = [
      [0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13],
      [0.13, 0], [-0.13, 0], [0, 0.13], [0, -0.13]
    ];
    boltCoords.forEach(([bx, bz]) => {
      const bolt = new THREE.Mesh(boltGeo, matteBlackMat);
      bolt.position.set(bx, 0.011, bz);
      baseGroup.add(bolt);
    });

    // Flared Circular Pedestal Riser
    const pedestalRiser = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.04, 36),
      brushedAluMat
    );
    pedestalRiser.position.y = 0.04;
    pedestalRiser.castShadow = true;
    baseGroup.add(pedestalRiser);

    // Dark Actuator Collar Ring directly under Joint 1 (Reference Image feature)
    const blackActuatorHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.05, 36),
      matteBlackMat
    );
    blackActuatorHub.position.y = 0.085;
    blackActuatorHub.castShadow = true;
    baseGroup.add(blackActuatorHub);

    // Decorative ribbed collar rings
    const collarRib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.01, 36),
      darkMetalMat
    );
    collarRib.position.y = 0.085;
    baseGroup.add(collarRib);

    // Thin accent indicator ring
    const accentRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.096, 0.096, 0.006, 36),
      cyanGlowMat
    );
    accentRing.position.y = 0.112;
    baseGroup.add(accentRing);

    // ==========================================
    // 2. JOINT 1: BASE YAW (Origin: y=0.12)
    // ==========================================
    const j1Node = new THREE.Group();
    j1Node.position.set(0, 0.12, 0);
    baseGroup.add(j1Node);
    jointNodesRef.current[0] = { node: j1Node, axis: 'y', sign: 1 };

    // SHOULDER TURRET / LINK 1 (Cobot rounded cylindrical body)
    const shoulderGroup = new THREE.Group();
    j1Node.add(shoulderGroup);

    // Lower Turret Cylinder
    const turretLower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.06, 36),
      pearlSilverMat
    );
    turretLower.position.y = 0.03;
    turretLower.castShadow = true;
    shoulderGroup.add(turretLower);

    // Shoulder Pivot Housing (Curved organic cylinder with rounded end caps)
    const shoulderKnuckle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.13, 36),
      pearlSilverMat
    );
    shoulderKnuckle.rotation.z = Math.PI / 2;
    shoulderKnuckle.position.set(0, 0.08, 0.02);
    shoulderKnuckle.castShadow = true;
    shoulderGroup.add(shoulderKnuckle);

    // Side joint circular disc caps (Reference Image detail)
    const discCapGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.005, 32);
    const discLeft = new THREE.Mesh(discCapGeo, brushedAluMat);
    discLeft.rotation.z = Math.PI / 2;
    discLeft.position.set(0.068, 0.08, 0.02);
    shoulderGroup.add(discLeft);

    const discRight = new THREE.Mesh(discCapGeo, brushedAluMat);
    discRight.rotation.z = Math.PI / 2;
    discRight.position.set(-0.068, 0.08, 0.02);
    shoulderGroup.add(discRight);

    // ==========================================
    // 3. JOINT 2: SHOULDER PITCH (Origin: y=0.08, z=0.02)
    // ==========================================
    const j2Node = new THREE.Group();
    j2Node.position.set(0, 0.08, 0.02);
    shoulderGroup.add(j2Node);
    jointNodesRef.current[1] = { node: j2Node, axis: 'x', sign: -1 };

    // UPPER ARM LINK (Reference: Aerodynamic tapered pearl-silver cobot beam)
    const upperArmGroup = new THREE.Group();
    j2Node.add(upperArmGroup);

    // Inner Pivot Hub Core
    const j2Core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.11, 32),
      darkMetalMat
    );
    j2Core.rotation.z = Math.PI / 2;
    upperArmGroup.add(j2Core);

    // Main Upper Arm Column (0.42m height, organic rounded cylinder)
    const upperArmBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.075, 0.42, 36),
      pearlSilverMat
    );
    upperArmBeam.position.set(0, 0.21, 0);
    upperArmBeam.castShadow = true;
    upperArmGroup.add(upperArmBeam);

    // Reference Seam Transition Ring (mid-link ring seen in reference image)
    const midRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.072, 0.012, 36),
      brushedAluMat
    );
    midRing.position.set(0, 0.21, 0);
    upperArmGroup.add(midRing);

    // ==========================================
    // 4. JOINT 3: ELBOW PITCH (Origin: y=0.42)
    // ==========================================
    const j3Node = new THREE.Group();
    j3Node.position.set(0, 0.42, 0);
    upperArmGroup.add(j3Node);
    jointNodesRef.current[2] = { node: j3Node, axis: 'x', sign: -1 };

    // FOREARM LINK (Reference: Streamlined cylindrical link with curved elbow knuckle)
    const forearmGroup = new THREE.Group();
    j3Node.add(forearmGroup);

    // Elbow Knuckle Cylinder
    const elbowPivot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.12, 36),
      pearlSilverMat
    );
    elbowPivot.rotation.z = Math.PI / 2;
    elbowPivot.castShadow = true;
    forearmGroup.add(elbowPivot);

    // Elbow Side Caps with circular recess
    const elbowCapL = new THREE.Mesh(discCapGeo, brushedAluMat);
    elbowCapL.rotation.z = Math.PI / 2;
    elbowCapL.position.set(0.062, 0, 0);
    forearmGroup.add(elbowCapL);

    const elbowCapR = new THREE.Mesh(discCapGeo, brushedAluMat);
    elbowCapR.rotation.z = Math.PI / 2;
    elbowCapR.position.set(-0.062, 0, 0);
    forearmGroup.add(elbowCapR);

    // Forearm Beam (0.38m length, sleek tapered cylinder)
    const forearmBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.062, 0.38, 36),
      pearlSilverMat
    );
    forearmBeam.position.set(0, 0.19, 0);
    forearmBeam.castShadow = true;
    forearmGroup.add(forearmBeam);

    // Subtle decorative groove on forearm
    const forearmGroove = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.008, 36),
      darkMetalMat
    );
    forearmGroove.position.set(0, 0.24, 0);
    forearmGroup.add(forearmGroove);

    // ==========================================
    // 5. JOINT 4: WRIST 1 YAW / ROLL (Origin: y=0.38)
    // ==========================================
    const j4Node = new THREE.Group();
    j4Node.position.set(0, 0.38, 0);
    forearmGroup.add(j4Node);
    jointNodesRef.current[3] = { node: j4Node, axis: 'y', sign: 1 };

    // WRIST 1 LINK
    const wrist1Group = new THREE.Group();
    j4Node.add(wrist1Group);

    const w1Housing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.052, 0.06, 32),
      pearlSilverMat
    );
    w1Housing.position.y = 0.03;
    w1Housing.castShadow = true;
    wrist1Group.add(w1Housing);

    // ==========================================
    // 6. JOINT 5: WRIST 2 PITCH (Origin: y=0.06)
    // ==========================================
    const j5Node = new THREE.Group();
    j5Node.position.set(0, 0.06, 0);
    wrist1Group.add(j5Node);
    jointNodesRef.current[4] = { node: j5Node, axis: 'x', sign: -1 };

    // WRIST 2 LINK
    const wrist2Group = new THREE.Group();
    j5Node.add(wrist2Group);

    const w2Knuckle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.046, 0.08, 32),
      pearlSilverMat
    );
    w2Knuckle.rotation.z = Math.PI / 2;
    w2Knuckle.castShadow = true;
    wrist2Group.add(w2Knuckle);

    // ==========================================
    // 7. JOINT 6: WRIST 3 ROLL (Origin: y=0.05)
    // ==========================================
    const j6Node = new THREE.Group();
    j6Node.position.set(0, 0.05, 0);
    wrist2Group.add(j6Node);
    jointNodesRef.current[5] = { node: j6Node, axis: 'y', sign: 1 };

    // ==========================================
    // 8. END EFFECTOR & TWO-FINGER CLAW GRIPPER (EXACT REFERENCE DESIGN)
    // ==========================================
    const toolGroup = new THREE.Group();
    j6Node.add(toolGroup);

    // Cylindrical Tool Adapter Flange (Matte Black matching reference)
    const toolFlange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.045, 0.035, 32),
      matteBlackMat
    );
    toolFlange.position.y = 0.018;
    toolFlange.castShadow = true;
    toolGroup.add(toolFlange);

    // Gripper Main Actuator Chassis (Angular Black Industrial Enclosure)
    const gripperChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.045, 0.065),
      matteBlackMat
    );
    gripperChassis.position.y = 0.055;
    gripperChassis.castShadow = true;
    toolGroup.add(gripperChassis);

    // Chassis Side Accent Brackets
    const sidePlateGeo = new THREE.BoxGeometry(0.01, 0.035, 0.055);
    const sidePlateL = new THREE.Mesh(sidePlateGeo, darkMetalMat);
    sidePlateL.position.set(0.056, 0.055, 0);
    toolGroup.add(sidePlateL);

    const sidePlateR = new THREE.Mesh(sidePlateGeo, darkMetalMat);
    sidePlateR.position.set(-0.056, 0.055, 0);
    toolGroup.add(sidePlateR);

    // Two Articulated Claw Fingers (Reference: Angular, faceted black robotic claws)
    const leftFingerGroup = new THREE.Group();
    leftFingerGroup.position.set(0.032, 0.075, 0);
    toolGroup.add(leftFingerGroup);

    // Left Main Claw Finger (Beveled Angular Claw)
    const leftClawMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.08, 0.035),
      matteBlackMat
    );
    leftClawMesh.position.set(0, 0.04, 0);
    leftClawMesh.castShadow = true;
    leftFingerGroup.add(leftClawMesh);

    // Left Tapered Finger Tip (Angular Faceted Profile)
    const leftTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.016, 0.03, 4),
      matteBlackMat
    );
    leftTip.position.set(0, 0.085, 0);
    leftTip.rotation.y = Math.PI / 4;
    leftFingerGroup.add(leftTip);

    // Left High-Friction Grip Pad (Facing inward)
    const leftPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.06, 0.026),
      rubberPadMat
    );
    leftPad.position.set(-0.009, 0.045, 0);
    leftFingerGroup.add(leftPad);

    // Right Finger Group
    const rightFingerGroup = new THREE.Group();
    rightFingerGroup.position.set(-0.032, 0.075, 0);
    toolGroup.add(rightFingerGroup);

    // Right Main Claw Finger
    const rightClawMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.08, 0.035),
      matteBlackMat
    );
    rightClawMesh.position.set(0, 0.04, 0);
    rightClawMesh.castShadow = true;
    rightFingerGroup.add(rightClawMesh);

    // Right Tapered Finger Tip
    const rightTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.016, 0.03, 4),
      matteBlackMat
    );
    rightTip.position.set(0, 0.085, 0);
    rightTip.rotation.y = Math.PI / 4;
    rightFingerGroup.add(rightTip);

    // Right High-Friction Grip Pad (Facing inward)
    const rightPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, 0.06, 0.026),
      rubberPadMat
    );
    rightPad.position.set(0.009, 0.045, 0);
    rightFingerGroup.add(rightPad);

    gripperFingersRef.current = { left: leftFingerGroup, right: rightFingerGroup };

    // Tool Center Point (TCP) Marker
    const tcpGroup = new THREE.Group();
    tcpGroup.position.set(0, 0.155, 0);
    const tcpMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.006, 16, 16),
      orangeTcpMat
    );
    tcpGroup.add(tcpMarker);
    toolGroup.add(tcpGroup);
    tcpMarkerRef.current = tcpGroup;
  };

  // Sync Dynamic Joint Values to 3D Nodes
  useEffect(() => {
    if (!jointNodesRef.current || jointNodesRef.current.length < 6) return;
    const angles = [
      joints?.joint1 ?? 0,
      joints?.joint2 ?? 0,
      joints?.joint3 ?? 0,
      joints?.joint4 ?? 0,
      joints?.joint5 ?? 0,
      joints?.joint6 ?? 0
    ];

    angles.forEach((angle, idx) => {
      const jEntry = jointNodesRef.current[idx];
      if (jEntry && jEntry.node) {
        const safeAngle = typeof angle === 'number' && !isNaN(angle) ? angle : 0;
        const val = safeAngle * jEntry.sign;
        if (jEntry.axis === 'y') jEntry.node.rotation.y = val;
        else if (jEntry.axis === 'x') jEntry.node.rotation.x = val;
        else if (jEntry.axis === 'z') jEntry.node.rotation.z = val;
      }
    });

    // Update Parallel Gripper Fingers (Prismatic stroke)
    if (gripperFingersRef.current) {
      const fingerVal =
        typeof joints?.finger_joint === 'number' && !isNaN(joints.finger_joint)
          ? joints.finger_joint
          : 0.04;
      const openOffset = fingerVal / 2.0;
      gripperFingersRef.current.left.position.x = 0.015 + openOffset;
      gripperFingersRef.current.right.position.x = -0.015 - openOffset;
    }
  }, [joints]);

  // Synchronize 4 Workspace Zones
  useEffect(() => {
    if (!sceneRef.current || !zones) return;
    const scene = sceneRef.current;

    Object.values(zones || {}).forEach((zone) => {
      if (!zone || !zone.id) return;
      let zoneGrp = zoneMeshesRef.current.get(zone.id);
      const isTarget = zone.id === targetZoneId;
      let zoneColor = 0xff8a00;
      try {
        zoneColor = isTarget ? 0xff8a00 : new THREE.Color(zone.color || '#ff8a00').getHex();
      } catch (_) {
        zoneColor = isTarget ? 0xff8a00 : 0x10b981;
      }

      if (!zoneGrp || !scene.children.includes(zoneGrp)) {
        zoneGrp = new THREE.Group();
        zoneGrp.userData.zoneId = zone.id;
        const cx = zone.center?.[0] ?? 0;
        const cy = zone.center?.[1] ?? 0;
        zoneGrp.position.set(cx, 0.005, cy);

        // Zone Ground Platform
        const minX = zone.bounds?.min_x ?? -0.3;
        const maxX = zone.bounds?.max_x ?? 0.3;
        const minY = zone.bounds?.min_y ?? -0.3;
        const maxY = zone.bounds?.max_y ?? 0.3;
        const w = Math.max(0.1, Math.abs(maxX - minX));
        const d = Math.max(0.1, Math.abs(maxY - minY));
        const platformGeo = new THREE.PlaneGeometry(w, d);
        const platformMat = new THREE.MeshStandardMaterial({
          color: zoneColor,
          opacity: 0.18,
          transparent: true,
          roughness: 0.6,
          side: THREE.DoubleSide
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.rotation.x = -Math.PI / 2;
        platform.receiveShadow = true;
        platform.userData.zoneId = zone.id;
        zoneGrp.add(platform);

        // Border Outline
        const borderGeo = new THREE.EdgesGeometry(platformGeo);
        const borderMat = new THREE.LineBasicMaterial({
          color: zoneColor,
          linewidth: 2
        });
        const border = new THREE.LineSegments(borderGeo, borderMat);
        border.rotation.x = -Math.PI / 2;
        zoneGrp.add(border);

        // Zone Floating Label Canvas Sprite
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 72;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#131720';
            ctx.fillRect(0, 0, 256, 72);
            ctx.strokeStyle = zone.color || '#ff8a00';
            ctx.lineWidth = 4;
            ctx.strokeRect(3, 3, 250, 66);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 30px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(zone.name || zone.id, 128, 36);
          }
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(0, 0.16, 0);
          sprite.scale.set(0.26, 0.07, 1);
          sprite.userData.zoneId = zone.id;
          zoneGrp.add(sprite);
        } catch (_) {}

        scene.add(zoneGrp);
        zoneMeshesRef.current.set(zone.id, zoneGrp);
      } else {
        const platformMesh = zoneGrp.children[0] as THREE.Mesh;
        if (platformMesh && (platformMesh.material as THREE.MeshStandardMaterial)) {
          (platformMesh.material as THREE.MeshStandardMaterial).color.setHex(zoneColor);
          (platformMesh.material as THREE.MeshStandardMaterial).opacity = isTarget ? 0.35 : 0.18;
        }
      }
    });
  }, [zones, targetZoneId]);

  // Synchronize 6 Movable Objects
  useEffect(() => {
    if (!sceneRef.current || !objects) return;
    const scene = sceneRef.current;

    Object.values(objects || {}).forEach((obj) => {
      if (!obj || !obj.id) return;
      let objGrp = objectMeshesRef.current.get(obj.id);
      const isSelected = obj.id === selectedObjectId;

      if (!objGrp || !scene.children.includes(objGrp)) {
        objGrp = new THREE.Group();
        objGrp.userData.objectId = obj.id;

        let colorHex = 0x3b82f6;
        try {
          colorHex = new THREE.Color(obj.color || '#3b82f6').getHex();
        } catch (_) {
          colorHex = 0x3b82f6;
        }

        const mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          metalness: 0.25,
          roughness: 0.35
        });

        let mesh: THREE.Mesh;
        if (obj.type === 'apple') {
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 24), mat);
        } else if (obj.type === 'ball') {
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 32, 32), mat);
        } else if (obj.type === 'cube') {
          mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), mat);
        } else if (obj.type === 'cylinder') {
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 24), mat);
        } else if (obj.type === 'bottle') {
          mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.14, 24), mat);
        } else {
          mesh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), mat);
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.objectId = obj.id;
        objGrp.add(mesh);

        // Selection Aura Ring
        const selRing = new THREE.Mesh(
          new THREE.RingGeometry(0.055, 0.065, 32),
          new THREE.MeshBasicMaterial({ color: 0xff8a00, side: THREE.DoubleSide })
        );
        selRing.rotation.x = -Math.PI / 2;
        selRing.position.y = -0.02;
        selRing.visible = isSelected;
        objGrp.add(selRing);

        scene.add(objGrp);
        objectMeshesRef.current.set(obj.id, objGrp);
      }

      // Grasping Attachment Simulation: Attached only when grasp is verified
      const isGrasped = Boolean(
        gripper?.is_closed &&
        gripper?.is_grasp_secured &&
        gripper?.grasped_object_id === obj.id
      );
      if (isGrasped && tcpMarkerRef.current) {
        const worldPos = new THREE.Vector3();
        tcpMarkerRef.current.getWorldPosition(worldPos);
        objGrp.position.copy(worldPos);
        objGrp.position.y -= 0.025;
      } else {
        // Stationary position on the workspace floor until grasp verification or after release
        const px = obj.position?.[0] ?? 0;
        const py = obj.position?.[1] ?? 0;
        const pz = obj.position?.[2] ?? 0.04;
        objGrp.position.set(px, pz, py);
      }

      // Update selection ring
      if (objGrp.children.length > 1) {
        objGrp.children[1].visible = isSelected;
      }
    });
  }, [objects, selectedObjectId, gripper]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(1.1, 0.85, 1.25);
    controlsRef.current.target.set(0, 0.35, 0);
    controlsRef.current.update();
  };

  return (
    <div className="w-full h-full relative flex-1 min-h-[420px] bg-[#0b0d12] overflow-hidden select-none">
      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0d12ee] p-6 z-20">
          <div className="bg-[#131720] border border-[#ef4444] rounded p-4 max-w-md text-center">
            <h3 className="text-sm font-semibold text-[#ef4444] mb-2">3D Viewport Notice</h3>
            <p className="text-xs text-[#94a3b8] font-mono mb-3">{initError}</p>
            <button onClick={() => window.location.reload()} className="btn-primary text-xs">
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Floating HUD Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#131720dd] border border-[#282e3a] rounded px-3 py-1.5 backdrop-blur-md pointer-events-auto">
        <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
        <span className="text-xs font-semibold text-[#f1f5f9]">Cobot 6-DOF Twin</span>
        <span className="text-[10px] text-[#ff8a00] font-mono bg-[#ff8a0022] px-1.5 py-0.5 rounded">
          Reference Model Active
        </span>
      </div>

      {/* Camera Controls Overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#131720dd] border border-[#282e3a] rounded p-1 backdrop-blur-md">
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded hover:bg-[#1c2230] text-[#94a3b8] hover:text-[#f1f5f9] transition-colors"
          title="Reset Camera View"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Interactive Helper Legend */}
      <div className="absolute bottom-3 left-3 bg-[#131720cc] border border-[#282e3a] rounded px-3 py-2 text-[11px] text-[#94a3b8] font-mono backdrop-blur-md pointer-events-none">
        <div className="text-[#f1f5f9] font-semibold mb-0.5">3D Scene Navigation:</div>
        <div>Rotate: Left-Click + Drag • Pan: Right-Click + Drag</div>
        <div>Zoom: Mouse Scroll • Click any object to inspect & target</div>
      </div>
    </div>
  );
};
