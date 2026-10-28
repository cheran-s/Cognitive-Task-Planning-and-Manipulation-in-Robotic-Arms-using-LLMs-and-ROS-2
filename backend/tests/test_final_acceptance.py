"""
Comprehensive Acceptance Test Suite verifying the Voice-to-Command Pipeline,
Functional Validation and Run Buttons, and Robotic Grasping Kinematics.
"""
import sys
import time
import requests

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def test_1_voice_to_editor_translation():
    print("\n--- TEST 1: Voice to Editor Translation ---")
    voice_inputs = [
        ("Tamil (Tanglish)", "Blue ball ah Zone A la irundhu eduthu Zone B la vai.", "ta"),
        ("Malayalam (Script)", "നീല പന്ത് Zone A-യിൽ നിന്ന് എടുത്ത് Zone B-യിൽ വെക്കൂ.", "ml"),
        ("Hindi (Script)", "नीली गेंद को ज़ोन A से उठाकर ज़ोन B में रखो।", "hi"),
        ("Tamil (Script)", "நீல பந்தை Zone A-ல் இருந்து எடுத்து Zone B-ல் வை.", "ta"),
        ("Manglish", "Blue ball Zone A il ninnu eduthu Zone B il vekku.", "ml"),
        ("Hinglish", "Blue ball ko Zone A se uthakar Zone B me rakho.", "hi")
    ]
    
    for label, transcript, expected_lang in voice_inputs:
        resp = requests.post(f"{BASE_URL}/api/voice/translate", json={"transcript": transcript})
        assert resp.status_code == 200, f"Translation failed for {label}: {resp.text}"
        data = resp.json()
        assert data["success"] is True
        assert data["original"] == transcript
        assert data["detected_language"] == expected_lang, f"Expected {expected_lang}, got {data['detected_language']}"
        assert "blue ball" in data["english_command"].lower(), f"Missing object in: {data['english_command']}"
        assert "zone a" in data["english_command"].lower(), f"Missing source in: {data['english_command']}"
        assert "zone b" in data["english_command"].lower(), f"Missing target in: {data['english_command']}"
        print(f"  [PASS] {label}:")
        print(f"         Spoken:     {transcript}")
        print(f"         Detected:   {data['detected_language']} (conf: {data['confidence']:.2f})")
        print(f"         Translated: {data['english_command']}")

def test_2_parse_and_validate():
    print("\n--- TEST 2: Parse & Validate Functional Button ---")
    # Reset scene first
    requests.post(f"{BASE_URL}/api/scene/reset")
    
    cmd = "Pick up the blue ball from Zone A and place it in Zone B."
    resp = requests.post(f"{BASE_URL}/api/plan", json={"command": cmd, "language": "en"})
    assert resp.status_code == 200, f"Plan failed: {resp.text}"
    plan = resp.json()
    assert plan["status"] == "idle", f"Expected plan status 'idle', got {plan['status']}"
    assert plan["action"] == "pick_and_place"
    assert plan["object_id"] == "ball_blue_01"
    assert plan["source_zone"] == "zone_a"
    assert plan["target_zone"] == "zone_b"
    assert len(plan["execution_timeline"]) == 13, f"Expected 13 steps, got {len(plan['execution_timeline'])}"
    print(f"  [PASS] Plan created and validated successfully:")
    print(f"         Task ID: {plan['task_id']}")
    print(f"         Action: {plan['action']} | Object: {plan['object_id']}")
    print(f"         Source: {plan['source_zone']} -> Target: {plan['target_zone']}")
    print(f"         Steps: {len(plan['execution_timeline'])} verified steps")
    return plan

def test_3_execution_and_timeline():
    print("\n--- TEST 3: Run Plan Execution & Timeline Progression ---")
    requests.post(f"{BASE_URL}/api/scene/reset")
    
    plan_resp = requests.post(f"{BASE_URL}/api/plan", json={
        "command": "Pick up the blue ball from Zone A and place it in Zone B.",
        "language": "en"
    })
    plan = plan_resp.json()
    
    # Trigger execution
    exec_resp = requests.post(f"{BASE_URL}/api/execute", json=plan)
    assert exec_resp.status_code == 200, f"Execution failed: {exec_resp.text}"
    print(f"  [PASS] Dispatched execution for task: {plan['task_id']}")
    
    # Wait for execution completion
    print("  ... Monitoring execution steps ...")
    completed = False
    for i in range(25):
        time.sleep(0.5)
        hist = requests.get(f"{BASE_URL}/api/history?limit=5").json()
        matching = [item for item in hist if item["task_id"] == plan["task_id"]]
        if matching:
            m = matching[0]
            if m["status"] in ["completed", "failed"]:
                completed = True
                assert m["status"] == "completed", f"Task failed: {m.get('error_reason')}"
                print(f"  [PASS] Task {m['task_id']} completed successfully with status '{m['status']}'!")
                break
    assert completed, "Task did not finish within timeout"

def test_4_kinematics_and_object_grasping():
    print("\n--- TEST 4: End-Effector Kinematics & Realistic Robotic Grasping ---")
    import math
    if "backend" not in sys.path:
        sys.path.insert(0, "backend")
    from app.execution.trajectory import trajectory_gen
    
    # Verify Blue Ball Grasp Pose
    ball_pos = [0.48, 0.38, 0.04]
    reach_ok, reach_msg = trajectory_gen.is_reachable(ball_pos[0], ball_pos[1], ball_pos[2])
    assert reach_ok, f"Ball pose unreachable: {reach_msg}"
    
    grasp_joints = trajectory_gen.compute_ik_for_position(ball_pos[0], ball_pos[1], ball_pos[2] + 0.01)
    assert len(grasp_joints) == 6
    print(f"  [PASS] Ball Grasp IK Joints: {[round(j, 3) for j in grasp_joints]}")
    
    # Verify Zone B Placement Pose
    zone_b_pos = [0.45, -0.35, 0.02]
    reach_tgt_ok, reach_tgt_msg = trajectory_gen.is_reachable(zone_b_pos[0], zone_b_pos[1], zone_b_pos[2])
    assert reach_tgt_ok, f"Zone B pose unreachable: {reach_tgt_msg}"
    
    place_joints = trajectory_gen.compute_ik_for_position(zone_b_pos[0], zone_b_pos[1], zone_b_pos[2])
    print(f"  [PASS] Zone B Place IK Joints: {[round(j, 3) for j in place_joints]}")
    
    # Verify that inventory shows the blue ball in zone_b after execution
    objs = requests.get(f"{BASE_URL}/api/objects").json()
    assert objs["ball_blue_01"]["zone_id"] == "zone_b", f"Ball not in zone_b: {objs['ball_blue_01']}"
    print(f"  [PASS] Object inventory verified: 'ball_blue_01' is settled inside 'zone_b' at {objs['ball_blue_01']['position']}")

def test_5_regression_typed_english():
    print("\n--- TEST 5: Regression Test (Typed English vs Voice Translated) ---")
    requests.post(f"{BASE_URL}/api/scene/reset")
    
    # 1. Typed English
    typed_plan = requests.post(f"{BASE_URL}/api/plan", json={
        "command": "Pick up the blue ball from Zone A and place it in Zone B.",
        "language": "en"
    }).json()
    
    # 2. Translated Tanglish
    translated = requests.post(f"{BASE_URL}/api/voice/translate", json={
        "transcript": "Blue ball ah Zone A la irundhu eduthu Zone B la vai."
    }).json()
    
    voice_plan = requests.post(f"{BASE_URL}/api/plan", json={
        "command": translated["english_command"],
        "language": "en"
    }).json()
    
    assert typed_plan["action"] == voice_plan["action"]
    assert typed_plan["object_id"] == voice_plan["object_id"]
    assert typed_plan["source_zone"] == voice_plan["source_zone"]
    assert typed_plan["target_zone"] == voice_plan["target_zone"]
    assert len(typed_plan["execution_timeline"]) == len(voice_plan["execution_timeline"])
    print("  [PASS] Typed English and Spoken Tanglish produced identical structured task plans:")
    print(f"         Action: {typed_plan['action']}")
    print(f"         Object: {typed_plan['object_id']}")
    print(f"         Route:  {typed_plan['source_zone']} -> {typed_plan['target_zone']}")

def test_6_failure_handling():
    print("\n--- TEST 6: Failure Handling & Safety Guards ---")
    # 1. Ambiguous Translation / Clarification
    resp = requests.post(f"{BASE_URL}/api/plan", json={
        "command": "Pick up the ball and put it in Zone B.", # no color specified
        "language": "en"
    })
    plan = resp.json()
    assert plan["requires_clarification"] is True, "Ambiguous ball should request clarification"
    print(f"  [PASS] Ambiguous command detected -> Clarification requested: {plan['clarification_question']}")
    
    # 2. Missing target zone
    resp2 = requests.post(f"{BASE_URL}/api/plan", json={
        "command": "Pick up the green cube from Zone B.", # no target zone
        "language": "en"
    })
    plan2 = resp2.json()
    assert plan2["requires_clarification"] is True
    print(f"  [PASS] Missing target zone detected -> Clarification requested: {plan2['clarification_question']}")
    
    # 3. Duplicate execution guard
    requests.post(f"{BASE_URL}/api/scene/reset")
    p = requests.post(f"{BASE_URL}/api/plan", json={
        "command": "Pick up the blue ball from Zone A and place it in Zone B.",
        "language": "en"
    }).json()
    r1 = requests.post(f"{BASE_URL}/api/execute", json=p)
    assert r1.status_code == 200
    r2 = requests.post(f"{BASE_URL}/api/execute", json=p)
    assert r2.status_code == 409, f"Expected 409 Conflict on duplicate execution, got {r2.status_code}"
    print(f"  [PASS] Duplicate execution rejected with HTTP 409: {r2.json()['detail']}")
    
    # 4. Emergency Stop Safety
    estop_resp = requests.post(f"{BASE_URL}/api/estop")
    assert estop_resp.status_code == 200
    p_estop = requests.post(f"{BASE_URL}/api/plan", json={
        "command": "Move the red apple from Zone A to Zone C.",
        "language": "en"
    }).json()
    assert p_estop["status"] == "failed"
    print(f"  [PASS] Emergency Stop blocks planning: {p_estop['error_reason']}")
    
    # Clear estop and reset scene
    requests.post(f"{BASE_URL}/api/estop/reset")
    requests.post(f"{BASE_URL}/api/scene/reset")
    print("  [PASS] System safely reset to nominal state.")

if __name__ == "__main__":
    print("================================================================")
    print("STARTING FULL COGNITIVE ROBOTICS STUDIO ACCEPTANCE TEST SUITE")
    print("================================================================")
    test_1_voice_to_editor_translation()
    test_2_parse_and_validate()
    test_3_execution_and_timeline()
    test_4_kinematics_and_object_grasping()
    test_5_regression_typed_english()
    test_6_failure_handling()
    print("\n================================================================")
    print("ALL 6 ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!")
    print("================================================================")
