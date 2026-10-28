import requests
import sys
import json
sys.stdout.reconfigure(encoding='utf-8')

h = requests.get('http://127.0.0.1:8000/api/history').json()
print("Total history items:", len(h))
for i, item in enumerate(h[:5]):
    print(f"[{i}] task_id={item.get('task_id')}, status={item.get('status')}, lang={item.get('recognized_language')}")
    print(f"    reply={item.get('assistant_reply')}")
