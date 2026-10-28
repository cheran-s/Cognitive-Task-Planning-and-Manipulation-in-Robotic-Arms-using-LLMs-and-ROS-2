"""
High-Level Cognitive Task Planner Module.
Orchestrates language detection, entity extraction, LLM/heuristic planning,
schema validation, timeline generation, and conversational assistant response formatting.
"""
import uuid
import time
from typing import Dict, Any, List, Optional
from ..config import settings
from ..models.task import CognitiveTaskPlan, ExecutionStep, TaskCommandRequest
from .multilingual_parser import parser
from .llm_adapter import llm_adapter
from .validator import validator

TIMELINE_STEP_DEFINITIONS = [
    (1, "Command Received", "Command registered by supervisor and enqueued for cognitive processing"),
    (2, "Language & Intent Identified", "Detected language, action intent, and speech parameters"),
    (3, "Target Object Located", "Queried workspace visual telemetry to resolve target object entity"),
    (4, "Source & Destination Validated", "Verified source zone occupancy and target zone coordinates"),
    (5, "Robot State & Workspace Checked", "Confirmed arm availability, kinematic limits, and clearance"),
    (6, "Motion Plan Generated", "Computed collision-free quintic S-curve trajectory profile"),
    (7, "Robot Moves Toward Object", "Dispatched trajectory to shoulder and elbow joints"),
    (8, "Gripper Closes Around Object", "Actuated pneumatic fingers to target stroke width"),
    (9, "Grasp Success Verified", "Checked contact sensors and gripper payload feedback"),
    (10, "Robot Transports Object", "Traversed intermediate Cartesian transfer waypoints to destination"),
    (11, "Robot Releases Object", "Opened gripper claws and detached object at target coordinates"),
    (12, "Final Object Position Verified", "Confirmed object settling in destination zone inventory"),
    (13, "Task Completed", "Arm returned to ready posture; execution log finalized")
]

class TaskPlanner:
    def __init__(self):
        self.parser = parser
        self.llm = llm_adapter
        self.validator = validator

    def create_empty_timeline(self) -> List[ExecutionStep]:
        """Initializes all 13 timeline steps in pending state."""
        return [
            ExecutionStep(
                step_id=sid,
                name=name,
                description=desc,
                status="pending"
            )
            for sid, name, desc in TIMELINE_STEP_DEFINITIONS
        ]

    async def plan_command(
        self,
        request: TaskCommandRequest,
        inventory: Dict[str, Any],
        zones: Dict[str, Any],
        is_robot_busy: bool = False,
        estop_active: bool = False
    ) -> CognitiveTaskPlan:
        """
        Processes text or voice command into a validated, actionable CognitiveTaskPlan.
        """
        raw_cmd = request.command.strip()
        
        # 1. Reliable Language Identification using script and language-aware processing
        # Do not rely exclusively on browser/UI selected language or assume Latin-script is English
        lang_from_parser, confidence = self.parser.detect_language_with_confidence(raw_cmd)
        
        if lang_from_parser != "en" and confidence >= 0.45:
            detected_lang = lang_from_parser
        elif request.language and request.language not in ["auto", "en"]:
            detected_lang = request.language
        else:
            detected_lang = lang_from_parser

        # 2. Extract Cognitive Action Plan via LLM / Deterministic Parser
        plan_dict = await self.llm.plan_task(
            command=raw_cmd,
            detected_language=detected_lang,
            inventory=inventory,
            zones=zones
        )

        task_id = f"task_{uuid.uuid4().hex[:8]}"
        task_plan = CognitiveTaskPlan(
            task_id=task_id,
            action=plan_dict.get("action", "pick_and_place"),
            object_id=plan_dict.get("object_id"),
            source_zone=plan_dict.get("source_zone"),
            target_zone=plan_dict.get("target_zone"),
            language=detected_lang,
            confidence=confidence,
            raw_command=raw_cmd,
            requires_clarification=plan_dict.get("requires_clarification", False),
            clarification_question=plan_dict.get("clarification_question"),
            clarification_options=plan_dict.get("clarification_options"),
            steps=plan_dict.get("steps", []),
            execution_timeline=self.create_empty_timeline(),
            status="planning"
        )

        # 3. Generate Assistant Conversational Response
        task_plan.assistant_response = self.generate_assistant_reply(task_plan, inventory, zones)

        # If clarification is required, stop here
        if task_plan.requires_clarification:
            task_plan.status = "clarifying"
            return task_plan

        # 4. Strict Validation
        is_valid, error = self.validator.validate_plan(
            plan=task_plan,
            inventory=inventory,
            zones=zones,
            is_robot_busy=is_robot_busy,
            estop_active=estop_active
        )

        if not is_valid:
            task_plan.status = "failed"
            task_plan.error_reason = error
            task_plan.assistant_response = self.generate_error_reply(detected_lang, error)
            return task_plan

        task_plan.status = "idle"  # Ready to execute
        return task_plan

    def get_localized_object_name(self, object_id: Optional[str], language: str) -> str:
        if not object_id:
            fallbacks = {"en": "the object", "ta": "பொருள்", "ml": "വസ്തു", "hi": "वस्तु"}
            return fallbacks.get(language, "the object")
        syn = self.parser.OBJECT_SYNONYMS.get(object_id, {})
        if language == "ta":
            return syn.get("ta_script", ["பொருள்"])[0]
        elif language == "ml":
            return syn.get("ml_script", ["വസ്തു"])[0]
        elif language == "hi":
            return syn.get("hi_script", ["वस्तु"])[0]
        return syn.get("canonical", object_id)

    def get_localized_zone_name(self, zone_id: Optional[str], language: str) -> str:
        if not zone_id:
            fallbacks = {"en": "the target zone", "ta": "இலக்கு மண்டலம்", "ml": "ലക്ഷ്യ സോൺ", "hi": "लक्ष्य ज़ोन"}
            return fallbacks.get(language, "the target zone")
        letter = zone_id.replace("zone_", "").upper()
        if language == "ta":
            return f"மண்டலம் {letter}"
        elif language == "ml":
            return f"സോൺ {letter}"
        elif language == "hi":
            return f"ज़ोन {letter}"
        return f"Zone {letter}"

    def generate_assistant_reply(self, plan: CognitiveTaskPlan, inventory: Dict[str, Any], zones: Dict[str, Any]) -> str:
        """
        Creates natural, context-aware spoken responses in English, Tamil, Malayalam, or Hindi.
        """
        lang = plan.language
        action = plan.action

        if plan.requires_clarification:
            return plan.clarification_question or "Please clarify your command."

        obj_name = self.get_localized_object_name(plan.object_id, lang)
        target_name = self.get_localized_zone_name(plan.target_zone, lang)

        if action == "pick_and_place":
            replies = {
                "en": f"Understood. Moving the {obj_name} to {target_name}. Beginning motion planning.",
                "ta": f"சரி, {obj_name}-ஐ அடையாளம் கண்டுவிட்டேன். {target_name}-ல் வைக்க திட்டமிடல் தொடங்குகிறது.",
                "ml": f"ശരി, {obj_name} {target_name}-ലേക്ക് മാറ്റാൻ ആരംഭിക്കുന്നു.",
                "hi": f"समझ गया। {obj_name} को {target_name} में रखने की प्रक्रिया शुरू की जा रही है।"
            }
            return replies.get(lang, replies["en"])

        elif action == "emergency_stop":
            replies = {
                "en": "Emergency Stop activated immediately! All robot axes frozen.",
                "ta": "அவசர நிறுத்தம் செயல்படுத்தப்பட்டது! ரோபோ இயக்கங்கள் உடனடியாக நிறுத்தப்பட்டன.",
                "ml": "അടിയന്തര സ്റ്റോപ്പ് പ്രവർത്തനക്ഷമമാക്കി! റോബോട്ട് പൂർണ്ണമായി നിശ്ചലമാക്കി.",
                "hi": "इमरजेंसी स्टॉप सक्रिय कर दिया गया है! रोबोट के सभी जोड़ तुरंत रोक दिए गए हैं।"
            }
            return replies.get(lang, replies["en"])

        elif action == "cancel_task":
            replies = {
                "en": "Current task has been safely cancelled.",
                "ta": "நடப்பு பணி வெற்றிகரமாக ரத்து செய்யப்பட்டது.",
                "ml": "നിലവിലെ ടാസ്ക് റദ്ദാക്കി.",
                "hi": "वर्तमान कार्य सफलतापूर्वक रद्द कर दिया गया है।"
            }
            return replies.get(lang, replies["en"])

        elif action == "home_robot":
            replies = {
                "en": "Returning robotic arm to safe home position.",
                "ta": "ரோபோ கை ஆரம்ப நிலைக்கு (Home position) திரும்புகிறது.",
                "ml": "റോബോട്ട് കൈ ഹോം സ്ഥാനത്തേക്ക് മടങ്ങുന്നു.",
                "hi": "रोबोटिक आर्म को सुरक्षित होम स्थिति में वापस भेजा जा रहा है।"
            }
            return replies.get(lang, replies["en"])

        elif action == "query_inventory":
            replies = {
                "en": "Scanning workspace inventory across zones.",
                "ta": "பணிமனை மண்டலங்களில் உள்ள பொருட்களை ஆய்வு செய்கிறேன்.",
                "ml": "വർക്ക്സ്പേസ് സോണുകളിലെ വസ്തുക്കൾ പരിശോധിക്കുന്നു.",
                "hi": "कार्यक्षेत्र के जोनों में मौजूद वस्तुओं की सूची जांची जा रही है।"
            }
            return replies.get(lang, replies["en"])

        return "Command received and parsed."

    def generate_error_reply(self, language: str, error_message: str) -> str:
        """Generates natural localized error explanations in the user's language."""
        err_lower = (error_message or "").lower()
        if "not in zone" in err_lower or "located in" in err_lower:
            replies = {
                "en": f"Validation failed: {error_message}",
                "ta": "பொருள் குறிப்பிட்ட மூல மண்டலத்தில் இல்லை. தயவுசெய்து அதன் இருப்பிடத்தைச் சரிபார்க்கவும்.",
                "ml": "വസ്തു നിർദ്ദേശിച്ച സോണിലല്ല സ്ഥിതി ചെയ്യുന്നത്. ദയവായി പരിശോധിക്കുക.",
                "hi": "वस्तु निर्दिष्ट स्रोत ज़ोन में नहीं है। कृपया इसका स्थान जांचें।"
            }
            return replies.get(language, replies["en"])

        if "already located" in err_lower:
            replies = {
                "en": f"Validation failed: {error_message}",
                "ta": "பொருள் ஏற்கனவே அந்த இலக்கு மண்டலத்திலேயே உள்ளது.",
                "ml": "വസ്തു ഇപ്പോൾത്തന്നെ ആ സോണിലാണ് ഉള്ളത്.",
                "hi": "वस्तु पहले से ही उसी ज़ोन में स्थित है।"
            }
            return replies.get(language, replies["en"])

        if "exceeds maximum" in err_lower or "outside" in err_lower or "reach" in err_lower:
            replies = {
                "en": f"Validation failed: {error_message}",
                "ta": "இலக்கு இருப்பிடம் ரோபோவின் அதிகபட்ச எட்டும் எல்லைக்கு அப்பால் உள்ளது.",
                "ml": "ലക്ഷ്യസ്ഥാനം റോബോട്ടിന്റെ പരമാവധി എത്തും പരിധിക്ക് പുറത്താണ്.",
                "hi": "लक्ष्य स्थिति रोबोट की अधिकतम पहुंच सीमा से बाहर है।"
            }
            return replies.get(language, replies["en"])

        if "emergency stop" in err_lower:
            replies = {
                "en": "Emergency Stop is active. Reset E-Stop before planning new actions.",
                "ta": "அவசர நிறுத்தம் செயலில் உள்ளது. புதிய பணிகளுக்கு முன் E-Stop-ஐ மீட்டமைக்கவும்.",
                "ml": "അടിയന്തര സ്റ്റോപ്പ് സജീവമാണ്. പുതിയ ടാസ്കിന് മുൻപ് ഇ-സ്റ്റോപ്പ് റീസെറ്റ് ചെയ്യുക.",
                "hi": "आपातकालीन रोक (E-Stop) सक्रिय है। कृपया पहले ई-स्टॉप रीसेट करें।"
            }
            return replies.get(language, replies["en"])

        if "busy" in err_lower:
            replies = {
                "en": "Robot is currently busy executing another task.",
                "ta": "ரோபோ தற்போது மற்றொரு பணியைச் செய்கிறது. தயவுசெய்து காத்திருக்கவும்.",
                "ml": "റോബോട്ട് ഇപ്പോൾ മറ്റൊരു ടാസ്ക് ചെയ്യുകയാണ്. ദയവായി കാത്തിരിക്കുക.",
                "hi": "रोबोट वर्तमान में दूसरा कार्य कर रहा है। कृपया प्रतीक्षा करें।"
            }
            return replies.get(language, replies["en"])

        if "not a recognized" in err_lower:
            replies = {
                "en": f"Validation failed: {error_message}",
                "ta": "குறிப்பிடப்பட்ட மண்டலம் அங்கீகரிக்கப்பட்ட பணிமனை மண்டலம் அல்ல.",
                "ml": "നിർദ്ദേശിച്ച സോൺ സാധുവായ ഒരു വർക്ക്സ്പേസ് സോൺ അല്ല.",
                "hi": "निर्दिष्ट ज़ोन कोई मान्य कार्यक्षेत्र ज़ोन नहीं है।"
            }
            return replies.get(language, replies["en"])

        if "target object is missing" in err_lower or "does not exist" in err_lower:
            replies = {
                "en": "Target object could not be found in workspace inventory.",
                "ta": "குறிப்பிடப்பட்ட பொருள் பணிமனையில் காணப்படவில்லை.",
                "ml": "നിർദ്ദേശിച്ച വസ്തു വർക്ക്സ്പേസിൽ കണ്ടെത്താനായില്ല.",
                "hi": "लक्षित वस्तु कार्यक्षेत्र में नहीं मिली।"
            }
            return replies.get(language, replies["en"])

        prefixes = {
            "en": f"Cannot execute command: {error_message}",
            "ta": f"பணியை நிறைவேற்ற இயலவில்லை: {error_message}",
            "ml": f"ടാസ്ക് നടപ്പിലാക്കാൻ കഴിഞ്ഞില്ല: {error_message}",
            "hi": f"कार्य निष्पादित नहीं किया जा सका: {error_message}"
        }
        return prefixes.get(language, prefixes["en"])

    def generate_completion_reply(self, plan: CognitiveTaskPlan, inventory: Dict[str, Any], zones: Dict[str, Any]) -> str:
        """
        Creates natural, localized task completion announcements spoken only after placement verification.
        """
        lang = plan.language
        action = plan.action
        obj_name = self.get_localized_object_name(plan.object_id, lang)
        target_name = self.get_localized_zone_name(plan.target_zone, lang)
        if action == "pick_and_place":
            replies = {
                "en": f"Task successfully completed! The {obj_name} has been placed in {target_name}.",
                "ta": f"பணி வெற்றிகரமாக முடிந்தது! {obj_name} {target_name}-ல் வைக்கப்பட்டது.",
                "ml": f"ടാസ്ക് വിജയകരമായി പൂർത്തിയായി! {obj_name} {target_name}-ലേക്ക് മാറ്റി.",
                "hi": f"कार्य सफलतापूर्वक पूरा हुआ! {obj_name} को {target_name} में रख दिया गया है।"
            }
            return replies.get(lang, replies["en"])
        elif action == "home_robot":
            replies = {
                "en": "Robot has safely returned to the home position.",
                "ta": "ரோபோ கை ஆரம்ப நிலைக்கு வெற்றிகரமாகத் திரும்பியது.",
                "ml": "റോബോട്ട് ഹോം സ്ഥാനത്തേക്ക് വിജയകരമായി മടങ്ങിയെത്തി.",
                "hi": "रोबोट सफलतापूर्वक होम स्थिति में वापस आ गया है।"
            }
            return replies.get(lang, replies["en"])
        return "Task successfully completed."

task_planner = TaskPlanner()
