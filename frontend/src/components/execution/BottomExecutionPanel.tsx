import React, { useState } from 'react';
import {
  ListTree,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Trash2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { ExecutionStep, StepStatus, LogEntry } from '../../types/robot';
import { formatNumber } from '../../utils/formatters';

interface BottomExecutionPanelProps {
  steps: ExecutionStep[];
  currentTaskId?: string;
  overallStatus: string;
  logs: LogEntry[];
  onClearLogs?: () => void;
  activeAction?: string;
}

export const BottomExecutionPanel: React.FC<BottomExecutionPanelProps> = ({
  steps,
  currentTaskId,
  overallStatus,
  logs,
  onClearLogs,
  activeAction = 'STANDBY'
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'logs'>('timeline');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / (steps.length || 13)) * 100);

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={13} className="text-[#10b981]" />;
      case 'running':
        return <Loader2 size={13} className="animate-spin text-[#ff8a00]" />;
      case 'failed':
        return <AlertCircle size={13} className="text-[#ef4444]" />;
      case 'cancelled':
        return <XCircle size={13} className="text-[#64748b]" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full border border-[#282e3a] bg-[#0b0d12]" />;
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (severityFilter === 'ALL') return true;
    return log.level === severityFilter;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-[#ef4444] bg-[#ef444422] border-[#ef444444]';
      case 'WARN':
        return 'text-[#f59e0b] bg-[#f59e0b22] border-[#f59e0b44]';
      case 'INFO':
        return 'text-[#3b82f6] bg-[#3b82f622] border-[#3b82f644]';
      default:
        return 'text-[#94a3b8] bg-[#94a3b822] border-[#282e3a]';
    }
  };

  return (
    <div className="panel h-full flex flex-col font-sans select-none overflow-hidden">
      {/* Header with Switcher Tabs */}
      <div className="panel-header">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'timeline'
                ? 'bg-[#1c2230] text-[#ff8a00] border border-[#282e3a]'
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            <ListTree size={13} />
            <span>Execution Timeline ({completedCount}/{steps.length || 13})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'logs'
                ? 'bg-[#1c2230] text-[#ff8a00] border border-[#282e3a]'
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            <Terminal size={13} />
            <span>Execution Terminal ({logs.length})</span>
          </button>
        </div>

        {/* Current Action Pill & Progress */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748b]">Active Action:</span>
            <span className="text-[#00e5ff] font-semibold">{activeAction}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-[#0b0d12] rounded overflow-hidden border border-[#282e3a]">
              <div
                className="h-full bg-[#ff8a00] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[#ff8a00] font-semibold">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'timeline' ? (
        <div className="p-2 flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-2 bg-[#0b0d12]">
          {steps.map((step) => {
            const isCurrent = step.status === 'running';
            const isDone = step.status === 'completed';
            const isFailed = step.status === 'failed';
            const isExpanded = expandedStepId === step.step_id;

            return (
              <div
                key={step.step_id}
                onClick={() => setExpandedStepId(isExpanded ? null : step.step_id)}
                className={`min-w-[190px] max-w-[210px] h-full p-2 rounded border cursor-pointer transition-all flex flex-col justify-between shrink-0 ${
                  isCurrent
                    ? 'bg-[#181d28] border-[#ff8a00] shadow-[0_0_10px_rgba(255,138,0,0.2)]'
                    : isDone
                    ? 'bg-[#131720] border-[#222836]'
                    : isFailed
                    ? 'bg-[#1e1317] border-[#ef4444]'
                    : 'bg-[#0e1117] border-[#1f2430] opacity-65'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-[#64748b]">
                      Step {step.step_id < 10 ? `0${step.step_id}` : step.step_id}
                    </span>
                    <div className="flex items-center gap-1">
                      {step.duration_s !== null && step.duration_s !== undefined && (
                        <span className="text-[10px] font-mono text-[#64748b]">
                          {formatNumber(step.duration_s, 1)}s
                        </span>
                      )}
                      {getStatusIcon(step.status)}
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-[#f1f5f9] leading-snug line-clamp-1">
                    {step.name}
                  </div>

                  <p className="text-[10px] text-[#64748b] leading-tight mt-1 line-clamp-2">
                    {step.description}
                  </p>
                </div>

                {/* Sub details on click */}
                {step.details && (
                  <div className="mt-1 pt-1 border-t border-[#222836] text-[9px] font-mono text-[#00e5ff] truncate">
                    {Object.entries(step.details)[0]
                      ? `${Object.entries(step.details)[0][0]}: ${String(Object.entries(step.details)[0][1])}`
                      : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Terminal Logs View */
        <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-1 bg-[#0b0d12] font-mono text-xs">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#181d28]">
            <div className="flex items-center gap-1 text-[10px]">
              {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSeverityFilter(lvl)}
                  className={`px-1.5 py-0.5 rounded border transition-colors ${
                    severityFilter === lvl
                      ? 'bg-[#ff8a0022] border-[#ff8a00] text-[#ff8a00]'
                      : 'border-[#282e3a] text-[#64748b] hover:text-[#cbd5e1]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {onClearLogs && (
              <button
                onClick={onClearLogs}
                className="text-[#64748b] hover:text-[#cbd5e1] text-[10px] flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          {filteredLogs.length === 0 ? (
            <span className="text-[#475569] italic">No logs recorded...</span>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="text-[#475569] shrink-0 text-[10px]">
                  {new Date(log.timestamp * 1000).toLocaleTimeString()}
                </span>
                <span className={`px-1 rounded text-[9px] font-semibold border ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-[#64748b] shrink-0 text-[10px]">[{log.subsystem}]</span>
                <span className="text-[#cbd5e1] break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
