import React, { useState } from 'react';
import { Terminal, Filter, Trash2 } from 'lucide-react';
import { LogEntry } from '../../types/robot';

interface ExecutionLogsProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
}

export const ExecutionLogs: React.FC<ExecutionLogsProps> = ({ logs, onClearLogs }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (severityFilter === 'ALL') return true;
    return log.level === severityFilter;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'text-[#ef4444] bg-[#ef444422]';
      case 'WARN':
        return 'text-[#f59e0b] bg-[#f59e0b22]';
      case 'INFO':
        return 'text-[#3b82f6] bg-[#3b82f622]';
      case 'DEBUG':
        return 'text-[#8b5cf6] bg-[#8b5cf622]';
      default:
        return 'text-[#94a3b8] bg-[#94a3b822]';
    }
  };

  return (
    <div className="panel h-full flex flex-col font-mono text-xs">
      <div className="panel-header">
        <div className="panel-header-title">
          <Terminal size={14} className="text-[#94a3b8]" />
          <span>Execution Console & Telemetry Logs</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filter */}
          <div className="flex items-center gap-1 text-[10px]">
            {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSeverityFilter(lvl)}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  severityFilter === lvl
                    ? 'bg-[#ff7a0022] border-[#ff7a00] text-[#ff7a00]'
                    : 'border-[#222938] text-[#64748b] hover:text-[#cbd5e1]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="text-[#64748b] hover:text-[#cbd5e1]"
              title="Clear terminal logs"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-1 bg-[#0a0d14]">
        {filteredLogs.length === 0 ? (
          <span className="text-[#475569] italic">No execution logs registered...</span>
        ) : (
          filteredLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 leading-relaxed">
              <span className="text-[#475569] shrink-0 text-[10px]">
                {new Date(log.timestamp * 1000).toLocaleTimeString()}
              </span>
              <span className={`px-1 py-0.2 rounded text-[9px] shrink-0 font-semibold ${getLevelColor(log.level)}`}>
                {log.level}
              </span>
              <span className="text-[#64748b] shrink-0 text-[10px]">[{log.subsystem}]</span>
              <span className="text-[#cbd5e1] break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
