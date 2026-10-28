import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HelpCircle,
  MessageSquare,
  Bot,
  User,
  ArrowRight,
  Sparkles,
  Globe,
  PlayCircle
} from 'lucide-react';
import { SupportedLanguage } from '../../types/robot';

interface VoiceAssistantPanelProps {
  micState: 'idle' | 'listening' | 'processing' | 'speaking';
  onToggleMic: () => void;
  selectedLanguage: SupportedLanguage;
  transcript: string;
  assistantResponse: string;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  clarification?: {
    question?: string;
    options?: Array<{ label: string; value: string }>;
  };
  onSelectClarificationOption: (optionValue: string) => void;
  voiceError?: string | null;
  interactionMode?: 'text' | 'voice';
  detectedLanguage?: string;
  confidence?: number;
  taskStatus?: string;
  responseLanguage?: string;
  audioLevel?: number;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  onSimulateVoice?: (text: string) => void;
}

export const VoiceAssistantPanel: React.FC<VoiceAssistantPanelProps> = ({
  micState,
  onToggleMic,
  selectedLanguage,
  transcript,
  assistantResponse,
  isSpeaking,
  onStopSpeaking,
  clarification,
  onSelectClarificationOption,
  voiceError,
  interactionMode = 'text',
  detectedLanguage,
  confidence,
  taskStatus,
  responseLanguage,
  audioLevel = 0,
  onLanguageChange,
  onSimulateVoice
}) => {
  const speechTagMap: Record<SupportedLanguage, string> = {
    en: 'English (en-US)',
    ta: 'தமிழ் (ta-IN)',
    ml: 'മലയാളം (ml-IN)',
    hi: 'हिन्दी (hi-IN)'
  };

  const sampleVoicePrompts: Record<SupportedLanguage, Array<{ label: string; text: string }>> = {
    ta: [
      { label: '🗣️ Tanglish', text: 'Antha ball-a eduthu Zone B-la vai.' },
      { label: '🗣️ தமிழ் Script', text: 'நீல பந்தை எடுத்து Zone B-ல் வை.' },
      { label: '🗣️ Apple -> C', text: 'Apple-a eduthu Zone C-la vai.' }
    ],
    en: [
      { label: '🗣️ Blue Ball -> B', text: 'Pick up the blue ball and place it in Zone B.' },
      { label: '🗣️ Apple -> C', text: 'Move the apple from Zone A to Zone C.' },
      { label: '🗣️ Green Cube', text: 'Pick up the green cube and place it in Zone D.' }
    ],
    ml: [
      { label: '🗣️ Manglish', text: 'Aa panthu eduthu Zone B-yil vekkoo.' },
      { label: '🗣️ മലയാളം Script', text: 'നീല പന്ത് എടുത്ത് Zone B-യിൽ വെക്കൂ.' }
    ],
    hi: [
      { label: '🗣️ Hinglish', text: 'Blue ball ko uthakar Zone B me rakho.' },
      { label: '🗣️ हिन्दी Script', text: 'गेंद को उठाकर Zone B में रखो।' }
    ]
  };

  return (
    <div className="panel h-full flex flex-col font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-title">
          <MessageSquare size={14} className="text-[#00e5ff]" />
          <span>Multilingual Voice Assistant</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Language Switcher */}
          {onLanguageChange && (
            <div className="flex items-center gap-1 text-[10px] font-mono bg-[#161b26] px-1.5 py-0.5 rounded border border-[#282e3a]">
              <Globe size={10} className="text-[#00e5ff]" />
              <button
                onClick={() => onLanguageChange(selectedLanguage === 'ta' ? 'en' : 'ta')}
                className="text-[#94a3b8] hover:text-[#ff8a00] transition-colors"
                title="Toggle between Tamil and English"
              >
                {selectedLanguage === 'ta' ? 'Switch to EN' : 'Switch to தமிழ் (TA)'}
              </button>
            </div>
          )}

          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="text-[10px] text-[#ef4444] hover:text-[#f87171] flex items-center gap-1 font-mono bg-[#ef444415] px-2 py-0.5 rounded border border-[#ef444433]"
              title="Stop ongoing assistant speech"
            >
              <VolumeX size={11} />
              <span>Mute Voice</span>
            </button>
          )}
        </div>
      </div>

      {/* Conversation Context Ribbon */}
      <div className="bg-[#12161f] border-b border-[#1f2633] px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-[#64748b]">Mode:</span>
          <span className={`font-semibold ${interactionMode === 'voice' ? 'text-[#ff8a00]' : 'text-[#3b82f6]'}`}>
            {interactionMode === 'voice' ? '🎙️ Voice (Mic)' : '⌨️ Text (Console)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div>
            <span className="text-[#64748b]">Mic Tuned: </span>
            <span className="text-[#00e5ff] font-semibold">{speechTagMap[selectedLanguage]}</span>
          </div>
          <div className="h-2.5 w-[1px] bg-[#282e3a]" />
          <div>
            <span className="text-[#64748b]">State: </span>
            <span className="text-[#10b981] font-semibold">{taskStatus || 'IDLE'}</span>
          </div>
        </div>
      </div>

      <div className="p-2.5 flex-1 overflow-y-auto flex flex-col gap-2 font-sans">
        {/* User Chat Bubble */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#94a3b8]">
            <div className="flex items-center gap-1.5 font-semibold text-[#cbd5e1]">
              <User size={12} className="text-[#3b82f6]" />
              <span>Operator Voice / Spoken Text</span>
            </div>
            <span className="text-[10px] text-[#64748b] font-mono">
              {micState === 'listening' ? (
                <span className="text-[#ef4444] animate-pulse">● Live Listening...</span>
              ) : micState === 'processing' ? (
                <span className="text-[#ff8a00] animate-pulse">Translating...</span>
              ) : (
                'Transcribed'
              )}
            </span>
          </div>

          <div
            className={`text-xs font-mono min-h-[34px] p-2 rounded border transition-colors leading-relaxed ${
              micState === 'listening'
                ? 'bg-[#ef444408] border-[#ef444455] text-[#f1f5f9]'
                : 'bg-[#0b0d12] border-[#282e3a] text-[#f1f5f9]'
            }`}
          >
            {transcript ? (
              <span className="text-[#00e5ff] font-semibold">{transcript}</span>
            ) : (
              <span className="text-[#475569] italic font-sans text-xs">
                {micState === 'listening'
                  ? 'Listening to speech... Speak into your microphone now'
                  : 'Click the microphone button below or test voice with one of the quick pills...'}
              </span>
            )}
          </div>
        </div>

        {/* Assistant Response Bubble */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-[#94a3b8]">
            <div className="flex items-center gap-1.5 font-semibold text-[#cbd5e1]">
              <Bot size={12} className="text-[#00e5ff]" />
              <span>Cognitive Assistant</span>
            </div>
            {isSpeaking ? (
              <div className="flex items-center gap-1 text-[10px] text-[#00e5ff] font-mono animate-pulse">
                <Volume2 size={11} />
                <span>Speaking</span>
              </div>
            ) : (
              <span className="text-[10px] text-[#64748b] font-mono">Response</span>
            )}
          </div>

          <div className="text-xs text-[#cbd5e1] min-h-[40px] bg-[#0b0d12] p-2.5 rounded border border-[#282e3a] leading-relaxed">
            {assistantResponse || (
              <span className="text-[#475569] italic text-xs">
                System ready in English, தமிழ், മലയാളം, and हिन्दी. Awaiting instructions.
              </span>
            )}
          </div>
        </div>

        {/* Clarification Dialog Prompt */}
        {clarification && clarification.question && (
          <div className="bg-[#ff8a0015] border border-[#ff8a0055] rounded p-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#ff8a00] font-semibold">
              <HelpCircle size={13} />
              <span>Clarification Required</span>
            </div>
            <p className="text-xs text-[#f1f5f9] leading-snug">
              {clarification.question}
            </p>

            {clarification.options && clarification.options.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {clarification.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onSelectClarificationOption(opt.value)}
                    className="bg-[#181d28] hover:bg-[#ff8a00] text-[#f1f5f9] hover:text-[#0b0d12] px-2 py-1 rounded text-xs font-mono border border-[#384254] transition-colors flex items-center gap-1"
                  >
                    <span>{opt.label}</span>
                    <ArrowRight size={10} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Voice Error Notification */}
        {voiceError && (
          <div className="bg-[#ef444415] border border-[#ef444455] rounded p-2 text-xs text-[#ef4444] font-mono leading-tight flex flex-col gap-1">
            <span className="font-semibold">Microphone Notice:</span>
            <span className="text-[11px] text-[#fca5a5]">{voiceError}</span>
          </div>
        )}

        {/* Quick Voice Command Simulation Pills */}
        {onSimulateVoice && (
          <div className="flex flex-col gap-1 pt-1">
            <span className="text-[10px] text-[#64748b] font-mono">
              Test Voice Command (Click to simulate speaking):
            </span>
            <div className="flex flex-wrap gap-1">
              {(sampleVoicePrompts[selectedLanguage] || sampleVoicePrompts.ta).map((p, i) => (
                <button
                  key={i}
                  onClick={() => onSimulateVoice(p.text)}
                  className="bg-[#161b26] hover:bg-[#ff8a0022] hover:border-[#ff8a00] text-[#94a3b8] hover:text-[#f1f5f9] px-2 py-0.5 rounded border border-[#282e3a] text-[10px] font-mono transition-colors flex items-center gap-1"
                  title={`Simulate voice input: "${p.text}"`}
                >
                  <PlayCircle size={10} className="text-[#00e5ff]" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Microphone Control Strip */}
        <div className="mt-auto pt-2 border-t border-[#181d28] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMic}
              className={`p-2.5 rounded-full border transition-all ${
                micState === 'listening'
                  ? 'bg-[#ef4444] text-white border-[#ef4444] shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse'
                  : micState === 'processing'
                  ? 'bg-[#ff8a00] text-black border-[#ff8a00] animate-spin'
                  : 'bg-[#161b26] text-[#94a3b8] hover:text-white border-[#282e3a] hover:border-[#00e5ff]'
              }`}
              title={micState === 'listening' ? 'Click to stop listening' : 'Click to start microphone'}
            >
              {micState === 'listening' ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#f1f5f9]">
                {micState === 'listening'
                  ? 'Listening... Speak now'
                  : micState === 'processing'
                  ? 'Processing Speech...'
                  : 'Microphone Ready'}
              </span>
              <span className="text-[10px] text-[#64748b] font-mono">
                {micState === 'listening'
                  ? `Language: ${speechTagMap[selectedLanguage]}`
                  : 'Click mic icon to start talking'}
              </span>
            </div>
          </div>

          {/* Dynamic Audio Level Meter Wave */}
          {micState === 'listening' && (
            <div className="flex items-end gap-1 h-5 px-2 bg-[#ef444415] rounded border border-[#ef444433]">
              <span
                className="w-1 bg-[#ef4444] rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, Math.min(20, (audioLevel || 0.3) * 20))}px` }}
              />
              <span
                className="w-1 bg-[#ff8a00] rounded-full transition-all duration-75"
                style={{ height: `${Math.max(6, Math.min(20, ((audioLevel || 0.5) * 1.3) * 20))}px` }}
              />
              <span
                className="w-1 bg-[#00e5ff] rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, Math.min(20, (audioLevel || 0.4) * 20))}px` }}
              />
              <span
                className="w-1 bg-[#10b981] rounded-full transition-all duration-75"
                style={{ height: `${Math.max(5, Math.min(20, ((audioLevel || 0.6) * 1.1) * 20))}px` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
