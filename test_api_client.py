import urllib.request
import json

test_cmds = [
    ('en', 'Pick up the ball and place it in Zone B.'),
    ('ta', 'Antha ball-a eduthu Zone B-la vai.'),
    ('ml', 'ആ പന്ത് എടുത്ത് Zone B-യിൽ വെക്കൂ.'),
    ('hi', 'गेंद को उठाकर Zone B में रखो।')
]

for lang, cmd in test_cmds:
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/plan',
        data=json.dumps({'command': cmd, 'language': lang}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print(f"[{lang.upper()}] Action: {res.get('action')}, Obj: {res.get('object_id')}, Target: {res.get('target_zone')}, Steps: {len(res.get('execution_timeline'))}")
    print(f"     Reply: {res.get('assistant_response')}")

# Test Ambiguity
req_ambig = urllib.request.Request(
    'http://127.0.0.1:8000/api/plan',
    data=json.dumps({'command': 'Pick up the bottle.', 'language': 'en'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
res_ambig = json.loads(urllib.request.urlopen(req_ambig).read().decode('utf-8'))
print(f"[AMBIGUITY CHECK] Requires Clarification: {res_ambig.get('requires_clarification')}")
print(f"     Question: {res_ambig.get('clarification_question')}")
print(f"     Options: {[o['label'] for o in res_ambig.get('clarification_options', [])]}")
