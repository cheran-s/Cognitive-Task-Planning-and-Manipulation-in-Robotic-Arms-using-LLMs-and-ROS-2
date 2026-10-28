import React, { useState } from 'react';
import { TopNav } from './components/layout/TopNav';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { RobotScene3D } from './components/workspace/RobotScene3D';
import { CommandEditor } from './components/command/CommandEditor';
import { VoiceAssistantPanel } from './components/assistant/VoiceAssistantPanel';
import { InspectorPanel } from './components/telemetry/InspectorPanel';
import { BottomExecutionPanel } from './components/execution/BottomExecutionPanel';
import { TaskHistoryView } from './components/history/TaskHistoryView';
import { JointTelemetryHUD } from './components/telemetry/JointTelemetryHUD';
import { InventoryPanel } from './components/telemetry/InventoryPanel';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { useRobot } from './context/RobotContext';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
import { SupportedLanguage } from './types/robot';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');

  const {
    zones,
    objects,
    telemetry,
    activePlan,
    history,
    logs,
    selectedObjectId,
    targetZoneId,
    selectedLanguage,
    isPlanning,
    isExecuting,
    rosConnected,
    estopActive,
    setSelectedObjectId,
    setTargetZoneId,
    setSelectedLanguage,
    planCommand,
    executeActivePlan,
    cancelActiveTask,
    triggerEstop,
    resetEstop,
    resolveClarification,
    resetScene,
    clearLogs,
    refreshHistory,
    clearActivePlan
  } = useRobot();

  // Controlled Command Text synchronized across Voice and Manual Editor
  const [commandText, setCommandText] = useState('Pick up the object.');
  const [validatedCommandText, setValidatedCommandText] = useState('');
  const [detectedVoiceLang, setDetectedVoiceLang] = useState<string>('en');
  const [voiceConfidence, setVoiceConfidence] = useState<number>(1.0);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [interactionMode, setInteractionMode] = useState<'text' | 'voice'>('text');

  // Voice Assistant Hook with Real-time Speech-to-Editor Binding
  const {
    micState,
    transcript,
    audioLevel,
    voiceError,
    setTranscript,
    setVoiceError,
    toggleMic,
    speakText,
    isSpeaking,
    stopSpeaking,
    simulateVoiceInput
  } = useVoiceAssistant({
    language: selectedLanguage,
    onTranscriptInterim: (interimText) => {
      // Live stream spoken words directly into the Cognitive Command Editor as the operator speaks!
      setCommandText(interimText);
      setInteractionMode('voice');
    },
    onTranscriptReady: async (text) => {
      if (!text || !text.trim()) return;
      const cleanText = text.trim();
      setInteractionMode('voice');

      // 1. Capture and preserve original transcript in the voice assistant panel
      setTranscript(cleanText);

      // 2. Call backend multilingual translation endpoint
      try {
        setIsTranslating(true);
        const res = await fetch('/api/voice/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: cleanText, language: selectedLanguage })
        });

        if (res.ok) {
          const data = await res.json();
          const detected = data.detected_language || 'en';
          setDetectedVoiceLang(detected);
          setVoiceConfidence(data.confidence || 0.95);

          // 3. Place English translation directly into the main Cognitive Command Console editor
          const englishCmd = data.english_command || cleanText;
          setCommandText(englishCmd);
          // 4. Command was updated, invalidate prior plan
          setValidatedCommandText('');
          clearActivePlan();
        } else {
          // If translation fails, preserve original transcript and show an error
          setVoiceError('Voice translation failed. Spoken transcript preserved in Operator Command.');
          setCommandText(cleanText);
          setValidatedCommandText('');
          clearActivePlan();
        }
      } catch (err: any) {
        console.error('Voice translation error:', err);
        setVoiceError(`Voice translation error: ${err?.message || 'Server unreachable'}`);
        setCommandText(cleanText);
        setValidatedCommandText('');
        clearActivePlan();
      } finally {
        setIsTranslating(false);
      }
      // Note: We do NOT auto-execute here. User can review, edit the English translation, and click Parse & Validate.
    }
  });

  const handleManualPlan = async (command: string) => {
    if (!command || !command.trim()) return;
    const cleanCommand = command.trim();
    setCommandText(cleanCommand);
    try {
      const plan = await planCommand(cleanCommand, selectedLanguage);
      if (plan && plan.status !== 'failed' && !plan.requires_clarification) {
        // Mark this exact command text as validated
        setValidatedCommandText(cleanCommand);
      } else {
        setValidatedCommandText('');
      }
      if (plan && plan.assistant_response) {
        const targetLang = (plan.language as SupportedLanguage) || selectedLanguage;
        speakText(plan.assistant_response, targetLang);
      }
    } catch (err) {
      console.error('Manual plan error:', err);
      setValidatedCommandText('');
    }
  };

  const handleCommandTextChange = (newText: string) => {
    setCommandText(newText);
    if (activePlan && newText.trim() !== validatedCommandText) {
      clearActivePlan();
      setValidatedCommandText('');
    }
  };

  const handleExecute = async () => {
    // Confirm valid plan exists for current editor command
    if (!activePlan || commandText.trim() !== validatedCommandText) {
      console.warn('Execution rejected: Command editor was modified since last validation.');
      return;
    }
    try {
      await executeActivePlan();
    } catch (err) {
      console.error('Execution error:', err);
    }
  };

  // Announce execution completion or failure in the user's language only after execution finishes
  const prevExecutingRef = React.useRef(isExecuting);
  React.useEffect(() => {
    if (prevExecutingRef.current && !isExecuting) {
      if (activePlan) {
        const targetLang = (activePlan.language as SupportedLanguage) || selectedLanguage;
        if (activePlan.status === 'completed' && activePlan.assistant_response) {
          speakText(activePlan.assistant_response, targetLang);
        } else if (activePlan.status === 'failed' && activePlan.assistant_response) {
          speakText(activePlan.assistant_response, targetLang);
        }
      }
    }
    prevExecutingRef.current = isExecuting;
  }, [isExecuting, activePlan, selectedLanguage, speakText]);

  // Reject execution if editor command has changed since validation
  const isPlanStale = Boolean(
    activePlan &&
    activePlan.status !== 'failed' &&
    activePlan.status !== 'clarifying' &&
    commandText.trim() !== validatedCommandText
  );

  const canExecute = Boolean(
    activePlan &&
    activePlan.status !== 'failed' &&
    activePlan.status !== 'clarifying' &&
    !estopActive &&
    !isPlanStale &&
    validatedCommandText.length > 0 &&
    commandText.trim() === validatedCommandText &&
    !isPlanning &&
    !isExecuting
  );

  const selectedObj = selectedObjectId ? objects[selectedObjectId] : undefined;

  return (
    <div className="flex flex-col w-screen h-screen bg-[#0b0d12] text-[#f1f5f9] font-sans overflow-hidden">
      {/* Top Navigation */}
      <TopNav
        rosConnected={rosConnected}
        isSimMode={telemetry.mode === 'simulation'}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        micState={micState}
        onToggleMic={toggleMic}
        estopActive={estopActive}
        onTriggerEstop={triggerEstop}
        onResetEstop={resetEstop}
        onResetScene={resetScene}
      />

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Dynamic Main Views */}
        {activeTab === 'history' ? (
          <main className="flex-1 p-3 overflow-hidden bg-[#0b0d12]">
            <TaskHistoryView history={history} onRefreshHistory={refreshHistory} />
          </main>
        ) : activeTab === 'assistant' ? (
          <main className="flex-1 p-3 overflow-hidden bg-[#0b0d12] grid grid-cols-1 md:grid-cols-2 gap-3">
            <VoiceAssistantPanel
              micState={micState}
              onToggleMic={toggleMic}
              selectedLanguage={selectedLanguage}
              transcript={transcript}
              assistantResponse={activePlan?.assistant_response || ''}
              isSpeaking={isSpeaking}
              onStopSpeaking={stopSpeaking}
              voiceError={voiceError}
              interactionMode={interactionMode}
              detectedLanguage={detectedVoiceLang || activePlan?.language || selectedLanguage}
              confidence={voiceConfidence}
              taskStatus={telemetry.active_intent || activePlan?.status || 'IDLE'}
              responseLanguage={activePlan?.language || selectedLanguage}
              audioLevel={audioLevel}
              onLanguageChange={setSelectedLanguage}
              onSimulateVoice={simulateVoiceInput}
              clarification={
                activePlan?.requires_clarification
                  ? {
                      question: activePlan.clarification_question,
                      options: activePlan.clarification_options
                    }
                  : undefined
              }
              onSelectClarificationOption={resolveClarification}
            />
            <div className="panel p-3 flex flex-col gap-2 font-mono text-xs overflow-hidden">
              <div className="panel-header">
                <span className="font-semibold text-sm text-[#00e5ff]">Voice Interaction Architecture</span>
              </div>
              <div className="p-3 text-[#94a3b8] flex flex-col gap-2 leading-relaxed">
                <div>Language: <strong className="text-[#f1f5f9]">{selectedLanguage.toUpperCase()}</strong></div>
                <div>Web Speech Recognition: <strong className="text-[#10b981]">Active</strong></div>
                <div>Multilingual Speech Synthesis: <strong className="text-[#10b981]">Supported (EN, TA, ML, HI)</strong></div>
                <div className="pt-2 text-xs border-t border-[#282e3a]">
                  Say or type commands such as:
                  <ul className="list-disc pl-5 mt-1 text-[#cbd5e1] space-y-1">
                    <li>"Pick up the blue ball and place it in Zone B."</li>
                    <li>"Antha ball-a eduthu Zone B-la vai."</li>
                    <li>"அந்த பந்தை எடுத்து Zone B-ல் வை."</li>
                    <li>"ആ പന്ത് എടുത്ത് Zone B-യിൽ വെക്കൂ."</li>
                    <li>"गेंद को उठाकर Zone B में रखो।"</li>
                  </ul>
                </div>
              </div>
            </div>
          </main>
        ) : activeTab === 'telemetry' ? (
          <main className="flex-1 p-3 overflow-hidden bg-[#0b0d12] grid grid-cols-1 md:grid-cols-2 gap-3">
            <JointTelemetryHUD
              joints={telemetry.joints}
              gripper={telemetry.gripper}
              activeIntent={telemetry.active_intent}
              controllerFreq={telemetry.controller_frequency_hz}
            />
            <InventoryPanel
              objects={objects}
              zones={zones}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
            />
          </main>
        ) : activeTab === 'settings' ? (
          <main className="flex-1 p-4 overflow-y-auto bg-[#0b0d12] text-xs font-mono flex flex-col gap-4">
            <div className="panel p-4 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[#ff8a00]">ROS 2 & System Architecture Configuration</h2>
              <div className="grid grid-cols-2 gap-3 text-[#cbd5e1]">
                <div className="bg-[#161b26] p-3 rounded border border-[#282e3a]">
                  <span className="text-[#64748b]">ROS 2 Distribution:</span>
                  <div className="text-sm text-[#f1f5f9] mt-1 font-semibold">Jazzy Jalisco (Ubuntu 24.04 LTS)</div>
                </div>
                <div className="bg-[#161b26] p-3 rounded border border-[#282e3a]">
                  <span className="text-[#64748b]">Robot URDF Description:</span>
                  <div className="text-sm text-[#f1f5f9] mt-1 font-semibold">detailed_arm_description</div>
                </div>
                <div className="bg-[#161b26] p-3 rounded border border-[#282e3a]">
                  <span className="text-[#64748b]">MoveIt 2 Kinematics:</span>
                  <div className="text-sm text-[#f1f5f9] mt-1 font-semibold">KDLKinematicsPlugin (6-DOF)</div>
                </div>
                <div className="bg-[#161b26] p-3 rounded border border-[#282e3a]">
                  <span className="text-[#64748b]">rosbridge WebSocket:</span>
                  <div className="text-sm text-[#f1f5f9] mt-1 font-semibold">ws://localhost:9090</div>
                </div>
              </div>
            </div>
          </main>
        ) : (
          /* =========================================================
             PRIMARY LEETCODE-INSPIRED ROBOTICS STUDIO WORKSPACE
             Center 3D Scene is Large, Central, and Prominent
             ========================================================= */
          <main className="flex-1 flex flex-col gap-2 p-2 bg-[#0b0d12] overflow-hidden">
            {/* Top Row: Left Console (300px) + Center 3D Scene (Flex-1) + Right Inspector (300px) */}
            <div className="flex-1 min-h-0 flex gap-2 overflow-hidden">
              {/* Left Column: Command Editor & Voice Assistant */}
              <div className="w-[320px] xl:w-[350px] flex flex-col gap-2 shrink-0 overflow-hidden">
                <div className="h-[52%] overflow-hidden">
                  <CommandEditor
                    commandText={commandText}
                    onCommandTextChange={handleCommandTextChange}
                    onPlanCommand={handleManualPlan}
                    onExecuteCommand={handleExecute}
                    onCancelTask={cancelActiveTask}
                    selectedLanguage={selectedLanguage}
                    canExecute={canExecute}
                    isPlanning={isPlanning || isTranslating}
                    isExecuting={isExecuting}
                    isPlanStale={isPlanStale}
                    isListening={micState === 'listening'}
                    onToggleMic={toggleMic}
                    detectedLanguage={detectedVoiceLang || activePlan?.language}
                    activePlanSummary={
                      activePlan?.status === 'idle'
                        ? `Ready: ${activePlan.action} [${activePlan.object_id} -> ${activePlan.target_zone}]`
                        : undefined
                    }
                    errorReason={activePlan?.error_reason}
                    parsedIntent={activePlan?.action}
                    parsedObject={activePlan?.object_id ? (objects[activePlan.object_id]?.name || activePlan.object_id) : undefined}
                    parsedSourceZone={activePlan?.source_zone ? (zones[activePlan.source_zone]?.name || activePlan.source_zone) : undefined}
                    parsedTargetZone={activePlan?.target_zone ? (zones[activePlan.target_zone]?.name || activePlan.target_zone) : undefined}
                  />
                </div>

                <div className="h-[48%] overflow-hidden">
                  <VoiceAssistantPanel
                    micState={micState}
                    onToggleMic={toggleMic}
                    selectedLanguage={selectedLanguage}
                    transcript={transcript}
                    assistantResponse={activePlan?.assistant_response || ''}
                    isSpeaking={isSpeaking}
                    onStopSpeaking={stopSpeaking}
                    voiceError={voiceError}
                    interactionMode={interactionMode}
                    detectedLanguage={detectedVoiceLang || activePlan?.language || selectedLanguage}
                    confidence={voiceConfidence}
                    taskStatus={telemetry.active_intent || activePlan?.status || 'IDLE'}
                    responseLanguage={activePlan?.language || selectedLanguage}
                    audioLevel={audioLevel}
                    onLanguageChange={setSelectedLanguage}
                    onSimulateVoice={simulateVoiceInput}
                    clarification={
                      activePlan?.requires_clarification
                        ? {
                            question: activePlan.clarification_question,
                            options: activePlan.clarification_options
                          }
                        : undefined
                    }
                    onSelectClarificationOption={resolveClarification}
                  />
                </div>
              </div>

              {/* Center Column: LARGE INTERACTIVE 3D ROBOT SCENE (PROMINENT FOCUS) */}
              <div className="flex-1 panel overflow-hidden min-w-[400px]">
                <ErrorBoundary isSceneBoundary fallbackTitle="3D Viewport Engine Notice">
                  <RobotScene3D
                    joints={telemetry.joints}
                    gripper={telemetry.gripper}
                    objects={objects}
                    zones={zones}
                    selectedObjectId={selectedObjectId}
                    targetZoneId={targetZoneId}
                    onSelectObject={setSelectedObjectId}
                    onSelectZone={(zId) => setTargetZoneId(zId)}
                  />
                </ErrorBoundary>
              </div>

              {/* Right Column: Inspector Panel */}
              <div className="w-[300px] xl:w-[330px] shrink-0 overflow-hidden">
                <InspectorPanel
                  selectedObject={selectedObj}
                  targetZoneId={targetZoneId}
                  zones={zones}
                  objects={objects}
                  joints={telemetry.joints}
                  gripper={telemetry.gripper}
                  activeIntent={telemetry.active_intent}
                  onSelectObject={setSelectedObjectId}
                />
              </div>
            </div>

            {/* Bottom Row: 13-Step Execution Timeline & Logs Panel */}
            <div className="h-[155px] shrink-0 overflow-hidden">
              <BottomExecutionPanel
                steps={activePlan?.execution_timeline || []}
                currentTaskId={activePlan?.task_id}
                overallStatus={activePlan?.status || 'idle'}
                logs={logs}
                onClearLogs={clearLogs}
                activeAction={activePlan?.action || 'STANDBY'}
              />
            </div>
          </main>
        )}
      </div>
    </div>
  );
};
