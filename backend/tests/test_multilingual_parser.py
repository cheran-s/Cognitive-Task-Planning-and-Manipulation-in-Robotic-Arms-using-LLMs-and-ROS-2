"""
Unit tests for multilingual natural language parsing across English, Tamil, Malayalam, and Hindi.
"""
import pytest
from backend.app.planner.multilingual_parser import parser

def test_language_detection():
    # English
    assert parser.detect_language("Pick up the ball and place it in Zone B.") == "en"
    
    # Tamil (Tanglish & Script)
    assert parser.detect_language("Antha ball-a eduthu Zone B-la vai.") == "ta"
    assert parser.detect_language("அந்த பந்தை எடுத்து Zone B-ல் வை.") == "ta"
    
    # Malayalam (Manglish & Script)
    assert parser.detect_language("ആ പന്ത് എടുത്ത് Zone B-യിൽ വെക്കൂ.") == "ml"
    assert parser.detect_language("Aa panthu eduthu Zone B-yil vekkoo.") == "ml"
    
    # Hindi (Hinglish & Script)
    assert parser.detect_language("गेंद को उठाकर Zone B में रखो।") == "hi"
    assert parser.detect_language("Gend ko uthakar Zone B me rakho.") == "hi"

def test_object_extraction():
    # English Blue Ball
    obj_id, is_ambig, _ = parser.extract_object("Pick up the blue ball")
    assert obj_id == "ball_blue_01"

    # Tamil Tanglish Apple
    obj_id, _, _ = parser.extract_object("Antha apple-a eduthu Zone C-la vai")
    assert obj_id == "apple_red_01"

    # Tamil Script Bottle
    obj_id, _, _ = parser.extract_object("பாட்டிலை எடுத்து நகர்த்து")
    assert obj_id == "bottle_01"

    # Malayalam Script Cube
    obj_id, _, _ = parser.extract_object("പച്ച ക്യൂബ് എടുത്ത് മാറ്റുക")
    assert obj_id == "cube_green_01"

    # Hindi Devanagari Cylinder
    obj_id, _, _ = parser.extract_object("पीला सिलेंडर उठाओ")
    assert obj_id == "cyl_yellow_01"

def test_zone_extraction():
    # Single target zone
    sz, tz = parser.extract_zones("Put it in Zone B")
    assert tz == "zone_b"

    # Source and destination zones
    sz, tz = parser.extract_zones("Move the apple from Zone A to Zone C")
    assert sz == "zone_a"
    assert tz == "zone_c"

    # Tanglish zone
    sz, tz = parser.extract_zones("Zone B-la vai")
    assert tz == "zone_b"

    # Malayalam zone
    sz, tz = parser.extract_zones("Zone D-yil vekkoo")
    assert tz == "zone_d"

def test_action_extraction():
    assert parser.extract_action("Stop immediately!") == "emergency_stop"
    assert parser.extract_action("Niruthu") == "emergency_stop"
    assert parser.extract_action("Roko") == "emergency_stop"
    assert parser.extract_action("Cancel the task") == "cancel_task"
    assert parser.extract_action("Return home") == "home_robot"
    assert parser.extract_action("What is in Zone B?") == "query_inventory"
    assert parser.extract_action("Move the bottle to Zone D") == "pick_and_place"

def test_ambiguity_clarification():
    # Missing target zone
    clar = parser.generate_clarification("ta", "missing_target_zone")
    assert "மண்டலத்தில்" in clar["question"]
    assert len(clar["options"]) == 4

    # Missing object in Hindi
    clar_hi = parser.generate_clarification("hi", "missing_object")
    assert "वस्तु" in clar_hi["question"]
    assert len(clar_hi["options"]) == 6
