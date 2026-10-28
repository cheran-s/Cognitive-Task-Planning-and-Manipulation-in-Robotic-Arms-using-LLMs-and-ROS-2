import urllib.request
import json
import time

# 1. Plan command
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/plan',
    data=json.dumps({'command': 'Pick up the ball and place it in Zone B.', 'language': 'en'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
plan = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
print(f"Plan created: {plan['task_id']}")

# 2. Execute plan
exec_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/execute',
    data=json.dumps(plan).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
exec_res = json.loads(urllib.request.urlopen(exec_req).read().decode('utf-8'))
print(f"Execution started: {exec_res}")

# 3. Monitor execution progress for ~9 seconds
for i in range(10):
    time.sleep(1.0)
    health = json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api/health').read().decode('utf-8'))
    print(f"t={i+1}s: Robot busy={health['is_busy']}")
    if not health['is_busy'] and i > 2:
        break

# 4. Check object inventory to verify ball is now in Zone B!
objs = json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api/objects').read().decode('utf-8'))
print(f"Ball final zone: {objs['ball_blue_01']['zone_id']}, Position: {objs['ball_blue_01']['position']}")

# 5. Check task history
hist = json.loads(urllib.request.urlopen('http://127.0.0.1:8000/api/history').read().decode('utf-8'))
print(f"History latest: Task={hist[0]['task_id']}, Status={hist[0]['status']}, Duration={hist[0]['duration_s']}s, Completed Steps={hist[0]['completed_steps']}/{hist[0]['step_count']}")
