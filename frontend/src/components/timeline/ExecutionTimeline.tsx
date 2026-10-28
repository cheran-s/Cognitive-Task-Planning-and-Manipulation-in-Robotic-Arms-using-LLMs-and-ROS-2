import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  ListTree,
  ChevronRight
} from 'lucide-react';
import { ExecutionStep, StepStatus } from '../../types/robot';
import { formatNumber } from '../../utils/formatters';

interface ExecutionTimelineProps {
  steps: ExecutionStep[];
  currentTaskId?: string;
  overallStatus: string;
}

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  steps,
  currentTaskId,
  overallStatus
}) => {
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={13} className="text-[#10b981]" />;
      case 'running':
        return <Loader2 size={13} className="animate-spin text-[#ff7a00]" />;
      case 'failed':
        return <AlertCircle size={13} className="text-[#ef4444]" />;
      case 'cancelled':
        return <XCircle size={13} className="text-[#64748b]" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full border border-[#3b455b] bg-[#11141c]" />;
    }
  };

  const getStatusBadge = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <span className="text-[10px] bg-[#10b98122] text-[#10b981] px-1.5 py-0.2 rounded font-mono">Done</span>;
      case 'running':
        return <span className="text-[10px] bg-[#ff7a0022] text-[#ff7a00] px-1.5 py-0.2 rounded font-mono animate-pulse">Running</span>;
      case 'failed':
        return <span className="text-[10px] bg-[#ef444422] text-[#ef4444] px-1.5 py-0.2 rounded font-mono">Failed</span>;
      case 'cancelled':
        return <span className="text-[10px] bg-[#64748b22] text-[#64748b] px-1.5 py-0.2 rounded font-mono">Cancelled</span>;
      default:
        return <span className="text-[10px] text-[#475569] font-mono">Pending</span>;
    }
  };

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / (steps.length || 13)) * 100);

  return (
    <div className="panel h-full flex flex-col">
      {/* Timeline Header */}
      <div className="panel-header">
        <div className="panel-header-title">
          <ListTree size={14} className="text-[#ff7a00]" />
          <span>Execution Timeline</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-[#94a3b8]">{completedCount}/{steps.length || 13} Steps</span>
          <span className="text-[#ff7a00]">({progressPercent}%)</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-[#191e2a]">
        <div
          className="h-full bg-[#ff7a00] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step List */}
      <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-1.5">
        {steps.map((step, idx) => {
          const isCurrent = step.status === 'running';
          const isDone = step.status === 'completed';

          return (
            <div
              key={step.step_id}
              className={`p-2 rounded border transition-all ${
                isCurrent
                  ? 'bg-[#191e2a] border-[#ff7a00] shadow-[0_0_8px_rgba(255,122,0,0.15)]'
                  : isDone
                  ? 'bg-[#11141c] border-[#1e2433]'
                  : 'bg-[#0e1117] border-[#1a202c] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#64748b] font-mono w-4">
                    {step.step_id < 10 ? `0${step.step_id}` : step.step_id}
                  </span>
                  <div className="shrink-0">{getStatusIcon(step.status)}</div>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-[#ff7a00]' : isDone ? 'text-[#f1f5f9]' : 'text-[#94a3b8]'}`}>
                    {step.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {step.duration_s !== null && step.duration_s !== undefined && (
                    <span className="text-[10px] text-[#64748b] font-mono">
                      {formatNumber(step.duration_s, 1)}s
                    </span>
                  )}
                  {getStatusBadge(step.status)}
                </div>
              </div>

              {/* Sub-description & details */}
              <p className="text-[11px] text-[#64748b] mt-1 pl-6 leading-tight">
                {step.description}
              </p>

              {step.details && Object.keys(step.details).length > 0 && (
                <div className="mt-1.5 pl-6 flex flex-wrap gap-1 text-[10px] font-mono">
                  {Object.entries(step.details).map(([k, v]) => (
                    <span key={k} className="bg-[#151922] text-[#94a3b8] px-1.5 py-0.5 rounded border border-[#222938]">
                      {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
