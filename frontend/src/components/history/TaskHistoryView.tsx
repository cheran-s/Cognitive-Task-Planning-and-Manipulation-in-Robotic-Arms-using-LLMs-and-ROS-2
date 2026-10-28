import React, { useState } from 'react';
import { History, Filter, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';
import { TaskHistoryItem } from '../../types/robot';
import { formatNumber } from '../../utils/formatters';

interface TaskHistoryViewProps {
  history: TaskHistoryItem[];
  onRefreshHistory: () => void;
}

export const TaskHistoryView: React.FC<TaskHistoryViewProps> = ({ history, onRefreshHistory }) => {
  const [langFilter, setLangFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredHistory = history.filter((item) => {
    if (langFilter !== 'all' && item.recognized_language !== langFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="panel h-full flex flex-col font-sans">
      <div className="panel-header">
        <div className="panel-header-title">
          <History size={14} className="text-[#ff7a00]" />
          <span>Task Planning & Execution History</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Filter */}
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="bg-[#151922] text-xs text-[#cbd5e1] border border-[#222938] rounded px-2 py-0.5 focus:outline-none font-mono"
          >
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="ta">Tamil (தமிழ்)</option>
            <option value="ml">Malayalam (മലയാളം)</option>
            <option value="hi">Hindi (हिन्दी)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#151922] text-xs text-[#cbd5e1] border border-[#222938] rounded px-2 py-0.5 focus:outline-none font-mono"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-[#475569] text-xs font-mono">
            No execution history matching current filters.
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isCompleted = item.status === 'completed';
            const isFailed = item.status === 'failed';

            return (
              <div
                key={item.task_id}
                className="bg-[#11141c] border border-[#222938] hover:border-[#3b455b] rounded p-3 flex flex-col gap-2 transition-colors"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#64748b]">{item.task_id}</span>
                    <span className="text-[10px] bg-[#1e2433] text-[#00e5ff] px-1.5 py-0.5 rounded font-mono uppercase">
                      {item.recognized_language}
                    </span>
                    <span className="text-xs font-mono text-[#cbd5e1] bg-[#151922] px-2 py-0.5 rounded border border-[#222938]">
                      {item.parsed_intent}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.duration_s !== null && item.duration_s !== undefined && (
                      <span className="text-[11px] text-[#64748b] font-mono flex items-center gap-1">
                        <Clock size={11} /> {formatNumber(item.duration_s, 1)}s
                      </span>
                    )}

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                        isCompleted
                          ? 'bg-[#10b98122] text-[#10b981] border border-[#10b98144]'
                          : isFailed
                          ? 'bg-[#ef444422] text-[#ef4444] border border-[#ef444444]'
                          : 'bg-[#64748b22] text-[#64748b]'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Command text */}
                <div className="text-xs font-mono text-[#f1f5f9] bg-[#0a0d14] p-2 rounded border border-[#1e2433]">
                  "{item.original_command}"
                </div>

                {/* Sub details */}
                <div className="flex items-center justify-between text-[11px] text-[#64748b] font-mono">
                  <div className="flex items-center gap-3">
                    {item.object_id && <span>Object: <strong className="text-[#cbd5e1]">{item.object_id}</strong></span>}
                    {item.target_zone && <span>Target: <strong className="text-[#cbd5e1]">{item.target_zone}</strong></span>}
                    <span>Steps: {item.completed_steps}/{item.step_count}</span>
                  </div>

                  <span>{new Date(item.start_time * 1000).toLocaleTimeString()}</span>
                </div>

                {/* Error reason if failed */}
                {item.error_message && (
                  <div className="text-[11px] font-mono text-[#ef4444] bg-[#ef444415] p-1.5 rounded border border-[#ef444433]">
                    Error: {item.error_message}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
