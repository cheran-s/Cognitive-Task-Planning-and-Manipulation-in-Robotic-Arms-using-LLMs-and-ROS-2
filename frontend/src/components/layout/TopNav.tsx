import React from 'react';
import {
  Activity,
  Cpu,
  Mic,
  MicOff,
  Globe,
  AlertOctagon,
  RotateCcw
} from 'lucide-react';
import { SupportedLanguage } from '../../types/robot';

interface TopNavProps {
  rosConnected: boolean;
  isSimMode: boolean;
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  micState: 'idle' | 'listening' | 'processing' | 'speaking';
  onToggleMic: () => void;
  estopActive: boolean;
  onTriggerEstop: () => void;
  onResetEstop: () => void;
  onResetScene: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  rosConnected,
  isSimMode,
  selectedLanguage,
  onLanguageChange,
  micState,
  onToggleMic,
  estopActive,
  onTriggerEstop,
  onResetEstop,
  onResetScene
}) => {
  const languageNames: Record<SupportedLanguage, string> = {
    en: 'English (EN)',
    ta: 'தமிழ் (Tamil)',
    ml: 'മലയാളം (Malayalam)',
    hi: 'हिन्दी (Hindi)'
  };

  return (
    <header className="h-[52px] bg-[#131720] border-b border-[#282e3a] flex items-center justify-between px-4 select-none shrink-0 z-30">
      {/* Left Brand Title */}
      <div className="flex items-center gap-3">
        <span className="bg-[#ff8a00] text-[#0b0d12] font-bold text-[11px] px-2 py-0.5 rounded tracking-wide uppercase">
          Studio
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#f1f5f9] tracking-tight">
            Cognitive Manipulation Studio
          </span>
          <span className="text-[10px] text-[#64748b] font-mono">
            LLM Task Planning & ROS 2 Jazzy Robotic Arm
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* ROS 2 Status Indicator */}
        <div
          className="status-pill"
          title={rosConnected ? 'ROS 2 WebSocket Connected (ws://localhost:9090)' : 'Simulation Mode Active'}
        >
          <span className={`status-dot ${rosConnected ? 'online' : 'sim'}`} />
          <span className="text-[#94a3b8]">ROS 2:</span>
          <span className={rosConnected ? 'text-[#10b981] font-semibold' : 'text-[#f59e0b] font-semibold'}>
            {rosConnected ? 'LIVE (ws:9090)' : 'SIMULATION'}
          </span>
        </div>

        {/* Sim / Hardware Mode Pill */}
        <div className="status-pill">
          <Cpu size={12} className="text-[#ff8a00]" />
          <span className="text-[#94a3b8]">Mode:</span>
          <span className="text-[#f1f5f9]">{isSimMode ? 'Simulation Twin' : 'Real Hardware'}</span>
        </div>

        {/* 4-Language Selector */}
        <div className="flex items-center gap-1.5 bg-[#161b26] border border-[#282e3a] rounded px-2.5 py-1 text-xs">
          <Globe size={12} className="text-[#00e5ff]" />
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            className="bg-transparent text-xs text-[#f1f5f9] font-mono focus:outline-none cursor-pointer pr-1"
          >
            <option value="en" className="bg-[#131720] text-[#f1f5f9]">{languageNames.en}</option>
            <option value="ta" className="bg-[#131720] text-[#f1f5f9]">{languageNames.ta}</option>
            <option value="ml" className="bg-[#131720] text-[#f1f5f9]">{languageNames.ml}</option>
            <option value="hi" className="bg-[#131720] text-[#f1f5f9]">{languageNames.hi}</option>
          </select>
        </div>

        {/* Voice Input Waveform Button */}
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs font-medium border transition-all ${
            micState === 'listening'
              ? 'bg-[#ef444422] text-[#ef4444] border-[#ef4444]'
              : micState === 'speaking'
              ? 'bg-[#00e5ff22] text-[#00e5ff] border-[#00e5ff]'
              : 'bg-[#161b26] text-[#94a3b8] border-[#282e3a] hover:text-[#f1f5f9]'
          }`}
          title="Multilingual Voice Control (EN, TA, ML, HI)"
        >
          {micState === 'listening' ? (
            <>
              <div className="sound-wave">
                <span className="sound-bar" />
                <span className="sound-bar" />
                <span className="sound-bar" />
                <span className="sound-bar" />
              </div>
              <span className="font-mono text-[11px]">Listening...</span>
            </>
          ) : micState === 'speaking' ? (
            <>
              <Activity size={12} className="animate-spin text-[#00e5ff]" />
              <span className="font-mono text-[11px]">Assistant Speaking</span>
            </>
          ) : (
            <>
              <Mic size={12} />
              <span className="font-mono text-[11px]">Voice Input</span>
            </>
          )}
        </button>

        {/* Reset Scene Button */}
        <button
          onClick={onResetScene}
          className="btn-secondary text-xs"
          title="Reset 3D Objects & Zone Occupancy"
        >
          <RotateCcw size={12} />
          <span>Reset Scene</span>
        </button>

        {/* Emergency Stop Button */}
        {estopActive ? (
          <button
            onClick={onResetEstop}
            className="estop-button active"
            title="Clear Emergency Stop"
          >
            <AlertOctagon size={13} />
            <span>RESET E-STOP</span>
          </button>
        ) : (
          <button
            onClick={onTriggerEstop}
            className="estop-button"
            title="Emergency Stop: Immediately freeze robot arm axes"
          >
            <AlertOctagon size={13} />
            <span>EMERGENCY STOP</span>
          </button>
        )}
      </div>
    </header>
  );
};
