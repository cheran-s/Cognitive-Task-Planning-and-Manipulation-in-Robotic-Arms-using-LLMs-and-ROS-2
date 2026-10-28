"""
Pluggable LLM Adapter for Cognitive Task Planning.
Supports Google Gemini, OpenAI, Anthropic, and local/deterministic rule-based fallback.
All API keys are isolated in backend environment variables.
"""
import os
import json
import logging
from typing import Dict, Any, Optional
from ..config import settings

logger = logging.getLogger(__name__)

class LLMAdapter:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.gemini_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.openai_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")

    async def plan_task(self, command: str, detected_language: str, inventory: Dict[str, Any], zones: Dict[str, Any]) -> Dict[str, Any]:
        """
        Queries configured LLM provider to extract intent, entities, and structured steps.
        Falls back to rule-based parser if API key is not provided or LLM request fails.
        """
        if self.provider == "gemini" and self.gemini_key:
            try:
                return await self._plan_with_gemini(command, detected_language, inventory, zones)
            except Exception as e:
                logger.warning(f"Gemini LLM planning failed: {e}. Falling back to deterministic NLP.")
        elif self.provider == "openai" and self.openai_key:
            try:
                return await self._plan_with_openai(command, detected_language, inventory, zones)
            except Exception as e:
                logger.warning(f"OpenAI LLM planning failed: {e}. Falling back to deterministic NLP.")

        # Default / Fallback: Deterministic Rule-Based Parsing
        return self._plan_with_fallback(command, detected_language, inventory, zones)

    async def _plan_with_gemini(self, command: str, language: str, inventory: Dict[str, Any], zones: Dict[str, Any]) -> Dict[str, Any]:
        from google import genai
        client = genai.Client(api_key=self.gemini_key)
        
        system_prompt = self._build_system_prompt(inventory, zones)
        user_prompt = f"Command: '{command}', Language: '{language}'"
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[system_prompt, user_prompt],
            config={
                'response_mime_type': 'application/json'
            }
        )
        return json.loads(response.text)

    async def _plan_with_openai(self, command: str, language: str, inventory: Dict[str, Any], zones: Dict[str, Any]) -> Dict[str, Any]:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.openai_key)
        
        system_prompt = self._build_system_prompt(inventory, zones)
        user_prompt = f"Command: '{command}', Language: '{language}'"
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)

    def _plan_with_fallback(self, command: str, language: str, inventory: Dict[str, Any], zones: Dict[str, Any]) -> Dict[str, Any]:
        from .multilingual_parser import parser

        action = parser.extract_action(command)
        source_zone, target_zone = parser.extract_zones(command)
        object_id, is_ambiguous, candidates = parser.extract_object(command, inventory)

        # Inventory lookup to infer source zone if not explicitly named
        if object_id and object_id in inventory and not source_zone:
            source_zone = inventory[object_id].get("zone_id")

        requires_clarification = False
        clarification = {}

        if action == "pick_and_place":
            if is_ambiguous and len(candidates) > 1:
                requires_clarification = True
                clarification = parser.generate_clarification(language, "multiple_objects", candidates)
            elif not object_id:
                requires_clarification = True
                clarification = parser.generate_clarification(language, "missing_object")
            elif not target_zone:
                requires_clarification = True
                clarification = parser.generate_clarification(language, "missing_target_zone")

        return {
            "action": action,
            "object_id": object_id,
            "source_zone": source_zone,
            "target_zone": target_zone,
            "language": language,
            "requires_clarification": requires_clarification,
            "clarification_question": clarification.get("question"),
            "clarification_options": clarification.get("options", []),
            "steps": [
                "validate_object",
                "check_target_zone",
                "plan_motion",
                "move_to_object",
                "grasp_object",
                "verify_grasp",
                "move_to_target",
                "release_object",
                "verify_placement"
            ]
        }

    def _build_system_prompt(self, inventory: Dict[str, Any], zones: Dict[str, Any]) -> str:
        inv_desc = [{"id": k, "name": v.get("name"), "type": v.get("type"), "zone": v.get("zone_id")} for k, v in inventory.items()]
        zones_desc = list(zones.keys())
        return f"""
You are the Cognitive Task Planner for a 6-DOF Industrial Robotic Arm.
Known Zones: {zones_desc}
Current Inventory: {json.dumps(inv_desc)}

Analyze the user's natural language command (which may be in English, Tamil, Malayalam, or Hindi, including Tanglish, Manglish, or Hinglish).
Output a strict JSON object with:
- "action": "pick_and_place" | "home_robot" | "emergency_stop" | "cancel_task" | "query_inventory"
- "object_id": matched object ID from inventory or null
- "source_zone": current zone of object or null
- "target_zone": destination zone ID or null
- "language": detected language ("en", "ta", "ml", "hi")
- "requires_clarification": boolean (true if object or target zone is missing/ambiguous)
- "clarification_question": natural question in user's language if clarification needed
- "clarification_options": array of {{"label": str, "value": str}} for the user to pick
- "steps": ["validate_object", "check_target_zone", "plan_motion", "move_to_object", "grasp_object", "verify_grasp", "move_to_target", "release_object", "verify_placement"]
"""

llm_adapter = LLMAdapter()
