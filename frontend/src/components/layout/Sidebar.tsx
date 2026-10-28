import React from 'react';
import {
  Box,
  Compass,
  Mic,
  History,
  Cpu,
  Settings
} from 'lucide-react';

export type ActiveTab =
  | 'workspace'
  | 'planner'
  | 'assistant'
  | 'history'
  | 'telemetry'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'workspace', label: 'Workspace', icon: <Box size={18} /> },
    { id: 'planner', label: 'Task Planner', icon: <Compass size={18} /> },
    { id: 'assistant', label: 'Voice Assistant', icon: <Mic size={18} /> },
    { id: 'history', label: 'Task History', icon: <History size={18} /> },
    { id: 'telemetry', label: 'Robot Telemetry', icon: <Cpu size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  return (
    <aside className="w-[56px] bg-[#131720] border-r border-[#282e3a] flex flex-col items-center py-3 gap-2 select-none shrink-0 z-20">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${
              isActive
                ? 'bg-[#ff8a0022] text-[#ff8a00] border border-[#ff8a0055]'
                : 'text-[#94a3b8] hover:bg-[#1c2230] hover:text-[#f1f5f9]'
            }`}
            title={item.label}
          >
            {item.icon}
          </button>
        );
      })}
    </aside>
  );
};
