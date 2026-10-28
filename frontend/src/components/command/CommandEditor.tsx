import React from 'react';
import {
  Play,
  Terminal,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  StopCircle,
  HelpCircle,
  ArrowRight,
  Target,
  Box,
  MapPin,
  Mic,
  MicOff
} from 'lucide-react';
import { SupportedLanguage } from '../../types/robot';

interface CommandEditorProps {
  commandText: string;
  onCommandTextChange: (text: string) => void;
  onPlanCommand: (command: string, language: SupportedLanguage) => void;
  onExecuteCommand: () => void;
  onCancelTask: () => void;
  selectedLanguage: SupportedLanguage;
  canExecute: boolean;
  isPlanning: boolean;
  isExecuting: boolean;
  isPlanStale?: boolean;
  detectedLanguage?: string;
  activePlanSummary?: string;
  errorReason?: string;
  parsedIntent?: string;
  parsedObject?: string;
  parsedSourceZone?: string;
  parsedTargetZone?: string;
  isListening?: boolean;
  onToggleMic?: () => void;
}

export const CommandEditor: React.FC<CommandEditorProps> = ({
  commandText,
  onCommandTextChange,
  onPlanCommand,
  onExecuteCommand,
  onCancelTask,
  selectedLanguage,
  canExecute,
  isPlanning,
  isExecuting,
  isPlanStale = false,
  detectedLanguage,
  activePlanSummary,
  errorReason,
  parsedIntent,
  parsedObject,
  parsedSourceZone,
  parsedTargetZone,
  isListening = false,
  onToggleMic
}) => {
  // Natural Language Command Presets matching test cases and requirements
  const presets: Record<SupportedLanguage, Array<{ label: string; text: string }>> = {
    en: [
      { label: 'Pick & Place A -> B', text: 'Pick up the blue ball from Zone A and place it in Zone B.' },
      { label: 'Reversed Order', text: 'Pick up the blue ball and place it in Zone B from Zone A.' },
      { label: 'Apple -> Zone C', text: 'Move the apple from Zone A to Zone C.' },
      { label: 'Query Zone B', text: 'Tell me which objects are currently in Zone B.' },
      { label: 'Home Robot', text: 'Return robotic arm to home position.' }
    ],
    ta: [
      { label: 'Tanglish: Ball A -> B', text: 'Blue ball ah Zone A la irundhu eduthu Zone B la vai.' },
      { label: 'Tanglish Shorthand', text: 'Blue ball ah A la irundhu eduthu B la vai.' },
      { label: 'தமிழ்: பந்து A -> B', text: 'நீல பந்தை Zone A-ல் இருந்து எடுத்து Zone B-ல் வை.' },
      { label: 'Apple -> Zone C', text: 'Apple-a eduthu Zone C-la podu.' },
      { label: 'Niruthu / E-Stop', text: 'Udaney niruthu' }
    ],
    ml: [
      { label: 'മലയാളം: പന്ത് A -> B', text: 'നീല പന്ത് Zone A-യിൽ നിന്ന് എടുത്ത് Zone B-യിൽ വെക്കൂ.' },
      { label: 'Manglish: Ball A -> B', text: 'Blue ball Zone A il ninnu eduthu Zone B il vekku.' },
      { label: 'Manglish Shorthand', text: 'Blue ball A il ninnu eduthu B il vekku.' },
      { label: 'Apple -> Zone C', text: 'Apple eduthu Zone C-il vekku.' },
      { label: 'Stop / Nirthu', text: 'Stop cheyyu / nirthu' }
    ],
    hi: [
      { label: 'हिन्दी: गेंद A -> B', text: 'नीली गेंद को Zone A से उठाकर Zone B में रखो।' },
      { label: 'Hinglish: Ball A -> B', text: 'Blue ball ko Zone A se uthakar Zone B me rakho.' },
      { label: 'Hinglish Shorthand', text: 'Blue ball A se uthakar B me rakho.' },
      { label: 'Apple -> Zone C', text: 'Seb ko Zone A se Zone C me le jao.' },
      { label: 'Roko / E-Stop', text: 'Roko' }
    ]
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onPlanCommand(commandText, selectedLanguage);
    }
  };

  return (
    <div className="panel h-full flex flex-col font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-title">
          <Terminal size={14} className="text-[#ff8a00]" />
          <span>Cognitive Task Console</span>
        </div>
        <div className="flex items-center gap-2">
          {isListening && (
            <span className="text-[10px] font-mono text-[#ef4444] bg-[#ef444415] px-1.5 py-0.5 rounded border border-[#ef444455] animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-ping" />
              <span>Mic Listening...</span>
            </span>
          )}
          {parsedIntent && (
            <span className="text-[10px] font-mono text-[#00e5ff] bg-[#00e5ff15] px-1.5 py-0.5 rounded border border-[#00e5ff33]">
              Intent: {parsedIntent}
            </span>
          )}
          {detectedLanguage && detectedLanguage !== selectedLanguage && (
            <span className="text-[10px] font-mono text-[#ff8a00] bg-[#ff8a0015] px-1.5 py-0.5 rounded border border-[#ff8a0033]">
              Detected: {detectedLanguage.toUpperCase()}
            </span>
          )}
          <span className="text-[10px] font-mono text-[#64748b]">
            Lang: {selectedLanguage.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-2.5 flex-1 flex flex-col gap-2 overflow-hidden">
        {/* Styled Preset Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <span className="text-[10px] text-[#64748b] font-mono whitespace-nowrap">Presets:</span>
          {presets[selectedLanguage]?.map((p, i) => (
            <button
              key={i}
              onClick={() => onCommandTextChange(p.text)}
              className="bg-[#161b26] hover:bg-[#1c2230] text-[#94a3b8] hover:text-[#f1f5f9] px-2 py-0.5 rounded border border-[#282e3a] whitespace-nowrap font-mono text-[10px] transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Multiline Controlled Command Editor */}
        <div
          className={`relative flex-1 min-h-[50px] bg-[#0b0d12] border rounded p-2 transition-colors flex flex-col ${
            isListening
              ? 'border-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.3)]'
              : 'border-[#282e3a] focus-within:border-[#ff8a00]'
          }`}
        >
          <textarea
            id="command-input-textarea"
            value={commandText}
            onChange={(e) => onCommandTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? '🎙️ Listening to your voice... Speak your command in English or தமிழ் now!'
                : 'Type or speak natural language command (English, தமிழ், മലയാളം, हिन्दी)...'
            }
            className="w-full flex-1 bg-transparent text-[#f1f5f9] font-mono text-xs resize-none focus:outline-none placeholder-[#475569] leading-relaxed"
          />
          <div className="flex items-center justify-between text-[10px] text-[#475569] font-mono pt-1">
            {isListening ? (
              <span className="text-[#ef4444] animate-pulse">
                🎙️ Real-time transcription active • Speak naturally
              </span>
            ) : (
              <span>Press Enter to Parse • Shift+Enter for newline</span>
            )}
            <span className="text-[#64748b]">{commandText.length} chars</span>
          </div>
        </div>

        {/* Parsed Cognitive Entity Display (Intent, Object, Source Zone, Destination Zone) */}
        {(parsedIntent || parsedObject || parsedTargetZone) && !errorReason && (
          <div className={`bg-[#161b26] border border-[#282e3a] rounded px-2.5 py-1.5 grid grid-cols-2 gap-1.5 text-[10px] font-mono transition-opacity ${isPlanStale ? 'opacity-40' : 'text-[#cbd5e1]'}`}>
            <div className="flex items-center gap-1 truncate">
              <Target size={11} className="text-[#00e5ff] shrink-0" />
              <span className="text-[#64748b]">Action:</span>
              <span className="text-[#f1f5f9] font-semibold truncate">{parsedIntent || 'pick_and_place'}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <Box size={11} className="text-[#3b82f6] shrink-0" />
              <span className="text-[#64748b]">Object:</span>
              <span className="text-[#f1f5f9] font-semibold truncate">{parsedObject || 'Auto-detect'}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <MapPin size={11} className="text-[#f59e0b] shrink-0" />
              <span className="text-[#64748b]">Source:</span>
              <span className="text-[#f1f5f9] font-semibold truncate">{parsedSourceZone || 'Current Zone'}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <MapPin size={11} className="text-[#10b981] shrink-0" />
              <span className="text-[#64748b]">Target:</span>
              <span className="text-[#f1f5f9] font-semibold truncate">{parsedTargetZone || 'None'}</span>
            </div>
          </div>
        )}

        {/* Validation Feedback & Alerts */}
        {errorReason && (
          <div className="bg-[#ef444415] border border-[#ef444444] rounded px-2.5 py-1.5 flex items-center gap-2 text-xs text-[#ef4444]">
            <AlertTriangle size={13} className="shrink-0" />
            <span className="font-mono text-[11px] leading-tight">{errorReason}</span>
          </div>
        )}

        {isPlanStale && !errorReason && (
          <div className="bg-[#f59e0b15] border border-[#f59e0b44] rounded px-2.5 py-1.5 flex items-center gap-2 text-xs text-[#f59e0b]">
            <AlertTriangle size={13} className="shrink-0" />
            <span className="font-mono text-[11px] leading-tight">
              Command modified after validation. Click 'Parse & Validate' before running plan.
            </span>
          </div>
        )}

        {activePlanSummary && !errorReason && !isPlanStale && (
          <div className="bg-[#10b98115] border border-[#10b98144] rounded px-2.5 py-1.5 flex items-center justify-between text-xs text-[#10b981]">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="shrink-0" />
              <span className="font-mono text-[11px]">{activePlanSummary}</span>
            </div>
            <span className="text-[10px] text-[#64748b] font-mono">Plan Verified</span>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {onToggleMic && (
              <button
                type="button"
                onClick={onToggleMic}
                className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  isListening
                    ? 'bg-[#ef4444] text-white border-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'
                    : 'bg-[#161b26] hover:bg-[#202736] text-[#94a3b8] hover:text-[#f1f5f9] border-[#282e3a]'
                }`}
                title={isListening ? 'Stop listening' : 'Start microphone voice input'}
              >
                {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                <span>{isListening ? 'Stop Mic' : 'Speak'}</span>
              </button>
            )}

            <button
              id="btn-parse-validate"
              onClick={() => onPlanCommand(commandText.trim(), selectedLanguage)}
              disabled={isPlanning || isExecuting || !commandText.trim()}
              className="btn-secondary text-xs"
              title="Parse command intent and validate against safety rules"
            >
              <Sparkles size={12} className="text-[#ff8a00]" />
              <span>{isPlanning ? 'Parsing...' : 'Parse & Validate'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isExecuting && (
              <button
                id="btn-cancel-task"
                onClick={onCancelTask}
                className="bg-[#1c2230] text-[#ef4444] hover:bg-[#282e3a] border border-[#ef444444] px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Cancel ongoing task"
              >
                <StopCircle size={13} />
                <span>Cancel Task</span>
              </button>
            )}

            <button
              id="btn-run-plan"
              data-testid="btn-run-task"
              onClick={onExecuteCommand}
              disabled={!canExecute || isExecuting || isPlanStale}
              className="btn-primary text-xs"
              title={isPlanStale ? "Re-validate command before execution" : "Execute verified task plan"}
            >
              <Play size={12} />
              <span>{isExecuting ? 'Executing Motion...' : 'Run Plan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
