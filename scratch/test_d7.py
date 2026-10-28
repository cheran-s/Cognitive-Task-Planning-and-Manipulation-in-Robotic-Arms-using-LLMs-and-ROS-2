import requests
import json

BASE_URL = "http://127.0.0.1:8000"
r7_stt = requests.post(f"{BASE_URL}/api/voice/transcribe", json={
    "audio_base64": "mock_en_pcm",
    "language": "en"
})
d7_stt = r7_stt.json()
print("STT:", json.dumps(d7_stt, indent=2))
d7_plan = requests.post(f"{BASE_URL}/api/plan", json={"command": d7_stt["transcript"], "language": "en"}).json()
print("PLAN:", json.dumps(d7_plan, indent=2))
