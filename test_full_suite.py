import asyncio
import json
import websockets
import urllib.request
import time
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/telemetry"

def api_get(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def api_post(endpoint, data=None):
    payload = json.dumps(data or {}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

import pytest

@pytest.mark.asyncio
async def test_full_pipeline():
    print("==================================================")
    print("STEP 1: Scene Reset & Inventory Verification")
    print("==================================================")
    reset_res = api_post("/api/reset_inventory")
    print(f"Inventory Reset: {len(reset_res)} objects loaded.")
    assert "ball_blue_01" in reset_res, "ball_blue_01 missing in inventory"
    assert reset_res["ball_blue_01"]["zone_id"] == "zone_a", f"Expected zone_a, got {reset_res['ball_blue_01']['zone_id']}"
    print(f"Blue Ball initial location: {reset_res['ball_blue_01']['zone_id']} at {reset_res['ball_blue_01']['position']}")

    print("\n==================================================")
    print("STEP 2: Parse & Validate Stability Tests")
    print("==================================================")
    # Test 1: Primary user command (English)
    cmd_en = "Pick up the blue ball and place it in Zone C."
    plan_en = api_post("/api/plan", {"command": cmd_en, "language": "en"})
    print(f"Command (EN): '{cmd_en}'")
    print(f" -> Status: {plan_en['status']}")
    print(f" -> Action: {plan_en['action']}")
    print(f" -> Object: {plan_en['object_id']}")
    print(f" -> Source: {plan_en['source_zone']} -> Target: {plan_en['target_zone']}")
    print(f" -> Assistant: '{plan_en['assistant_response']}'")
    assert plan_en["status"] == "idle", f"Expected status 'idle', got {plan_en['status']}"
    assert plan_en["object_id"] == "ball_blue_01"
    assert plan_en["source_zone"] == "zone_a"
    assert plan_en["target_zone"] == "zone_c"
    assert len(plan_en["execution_timeline"]) == 13

    # Test 2: Repeat Parse & Validate 5 times to test stability
    for i in range(1, 6):
        rep_plan = api_post("/api/plan", {"command": cmd_en, "language": "en"})
        assert rep_plan["status"] == "idle", f"Repeat {i} failed: {rep_plan['status']}"
    print(" -> Successfully parsed 5 consecutive times without instability.")

    # Test 3: Multilingual Commands
    multi_tests = [
        ("ta", "அந்த பந்தை எடுத்து Zone C-ல் வை.", "Tamil"),
        ("ta", "Antha ball-a eduthu Zone C-la vai.", "Tanglish"),
        ("ml", "ആ പന്ത് എടുത്ത് Zone C-യിൽ വെക്കൂ.", "Malayalam"),
        ("hi", "गेंद को उठाकर Zone C में रखो।", "Hindi"),
        ("hi", "Gend ko uthakar Zone C me rakho.", "Hinglish")
    ]
    print("\nTesting Multilingual Speech Commands:")
    for lang, cmd, name in multi_tests:
        m_plan = api_post("/api/plan", {"command": cmd, "language": lang})
        print(f" [{name}] '{cmd}' -> Action: {m_plan['action']}, Target: {m_plan['target_zone']}, Status: {m_plan['status']}")
        assert m_plan["status"] == "idle", f"Multilingual failed for {name}"
        assert m_plan["target_zone"] == "zone_c"

    print("\n==================================================")
    print("STEP 3: Simulation Execution with WebSocket Stream")
    print("==================================================")
    ws = await websockets.connect(WS_URL)
    print("Connected to WebSocket telemetry stream ws://127.0.0.1:8000/ws/telemetry")

    # Read initial snapshot
    snapshot_msg = await ws.recv()
    snapshot = json.loads(snapshot_msg)
    print(f"Received Snapshot event: {snapshot['event']} with {len(snapshot['data']['inventory'])} items")

    # Dispatch execution of the verified English plan
    print(f"Dispatching task execution for task: {plan_en['task_id']}...")
    exec_res = api_post("/api/execute", plan_en)
    print(f"Execution started: {exec_res['status']}")

    # Listen for telemetry stream during motion execution
    event_counts = {}
    completed_steps = set()
    gripper_states = []
    object_moved_received = False
    task_finished = False

    start_t = time.time()
    while not task_finished and (time.time() - start_t) < 25:
        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
            pkt = json.loads(msg)
            ev = pkt.get("event")
            event_counts[ev] = event_counts.get(ev, 0) + 1
            data = pkt.get("data", {})

            if ev == "timeline_update":
                s_id = data.get("step_id")
                st = data.get("status")
                if st == "completed":
                    completed_steps.add(s_id)
                    print(f" [Step {s_id:02d} Completed] {data.get('details') or ''}")
            elif ev == "gripper_state":
                gripper_states.append(data)
                print(f" [Gripper State] Closed={data.get('is_closed')}, Object={data.get('grasped_object_id')}")
            elif ev == "object_moved":
                object_moved_received = True
                print(f" [Object Moved!] {data.get('object_id')} -> {data.get('new_zone')} at {data.get('position')}")
            elif ev == "task_finished":
                task_finished = True
                print(" [Task Finished] Action execution completed.")
        except asyncio.TimeoutError:
            print("WebSocket wait timeout...")
            break

    await ws.close()

    print("\nTelemetry Event Counts:", event_counts)
    print(f"Completed Steps: {len(completed_steps)} / 13")
    assert task_finished, "Task did not finish in time"
    assert object_moved_received, "object_moved event was not received"
    assert len(gripper_states) >= 2, "Gripper grasp and release states not recorded"

    print("\n==================================================")
    print("STEP 4: Post-Execution Verification")
    print("==================================================")
    objects_after = api_get("/api/objects")
    blue_ball = objects_after["ball_blue_01"]
    print(f"Blue Ball final location: Zone '{blue_ball['zone_id']}' at {blue_ball['position']}")
    assert blue_ball["zone_id"] == "zone_c", f"Expected zone_c, got {blue_ball['zone_id']}"

    # Verify safety: Trying to move it again to Zone C must be safely rejected
    print("\nSafety Validation: Attempting to move blue ball to Zone C again...")
    reject_plan = api_post("/api/plan", {"command": cmd_en, "language": "en"})
    print(f" -> Status: {reject_plan['status']}")
    print(f" -> Error reason: {reject_plan['error_reason']}")
    assert reject_plan["status"] == "failed"
    assert "already located in 'Zone C'" in reject_plan["error_reason"]
    print(" -> Safety check passed: duplicate move correctly blocked!")

    # Verify task history
    history = api_get("/api/history")
    print(f"History entries: {len(history)}")
    assert len(history) > 0
    cmd_text = history[0].get('command') or history[0].get('raw_command') or 'N/A'
    print(f"Latest history entry: {cmd_text} -> {history[0].get('status')}")

    print("\n==================================================")
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_full_pipeline())
