"""
Task History Storage and Observability Layer.
Maintains history of executed commands, timeline steps, errors, and provides filtering.
"""
import time
from typing import List, Optional, Dict, Any
from ..models.task import TaskHistoryItem, CognitiveTaskPlan

class TaskHistoryStore:
    def __init__(self):
        self._history: List[TaskHistoryItem] = []
        self._seed_sample_history()

    def add_from_plan(self, plan: CognitiveTaskPlan) -> TaskHistoryItem:
        completed_steps = sum(1 for s in plan.execution_timeline if s.status == "completed")
        duration = None
        if plan.completed_at and plan.created_at:
            duration = round(plan.completed_at - plan.created_at, 2)

        item = TaskHistoryItem(
            task_id=plan.task_id,
            original_command=plan.raw_command,
            recognized_language=plan.language,
            parsed_intent=plan.action,
            object_id=plan.object_id,
            source_zone=plan.source_zone,
            target_zone=plan.target_zone,
            status=plan.status,
            start_time=plan.created_at,
            completion_time=plan.completed_at,
            duration_s=duration,
            step_count=len(plan.execution_timeline) or 13,
            completed_steps=completed_steps,
            error_message=plan.error_reason,
            assistant_reply=plan.assistant_response
        )
        self._history.insert(0, item)  # Latest first
        return item

    def get_all(
        self,
        language: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[TaskHistoryItem]:
        results = self._history
        if language and language != "all":
            results = [x for x in results if x.recognized_language == language]
        if status and status != "all":
            results = [x for x in results if x.status == status]
        return results[:limit]

    def _seed_sample_history(self):
        now = time.time()
        self._history = [
            TaskHistoryItem(
                task_id="task_seed_001",
                original_command="Pick up the ball and place it in Zone B.",
                recognized_language="en",
                parsed_intent="pick_and_place",
                object_id="ball_blue_01",
                source_zone="zone_a",
                target_zone="zone_b",
                status="completed",
                start_time=now - 320,
                completion_time=now - 312,
                duration_s=8.14,
                step_count=13,
                completed_steps=13,
                assistant_reply="Understood. Moving the Blue Ball to Zone B."
            ),
            TaskHistoryItem(
                task_id="task_seed_002",
                original_command="Antha ball-a eduthu Zone B-la vai.",
                recognized_language="ta",
                parsed_intent="pick_and_place",
                object_id="ball_blue_01",
                source_zone="zone_a",
                target_zone="zone_b",
                status="completed",
                start_time=now - 210,
                completion_time=now - 202,
                duration_s=7.92,
                step_count=13,
                completed_steps=13,
                assistant_reply="சரி, Blue Ball-ஐ அடையாளம் கண்டுவிட்டேன். இப்போது Zone B-க்கு கொண்டு செல்கிறேன்."
            ),
            TaskHistoryItem(
                task_id="task_seed_003",
                original_command="ആ പന്ത് എടുത്ത് Zone B-യിൽ വെക്കൂ.",
                recognized_language="ml",
                parsed_intent="pick_and_place",
                object_id="ball_blue_01",
                source_zone="zone_a",
                target_zone="zone_b",
                status="completed",
                start_time=now - 140,
                completion_time=now - 132,
                duration_s=8.05,
                step_count=13,
                completed_steps=13,
                assistant_reply="ശരി, Blue Ball തിരഞ്ഞെടുത്തു. ഇപ്പോൾ Zone B-ലേക്ക് മാറ്റാൻ തുടങ്ങുന്നു."
            ),
            TaskHistoryItem(
                task_id="task_seed_004",
                original_command="गेंद को उठाकर Zone B में रखो।",
                recognized_language="hi",
                parsed_intent="pick_and_place",
                object_id="ball_blue_01",
                source_zone="zone_a",
                target_zone="zone_b",
                status="completed",
                start_time=now - 60,
                completion_time=now - 52,
                duration_s=7.88,
                step_count=13,
                completed_steps=13,
                assistant_reply="समझ गया। Blue Ball को Zone B में रखने की प्रक्रिया शुरू की जा रही है।"
            )
        ]

history_store = TaskHistoryStore()
