import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  RobotObject,
  ZoneConfig,
  CognitiveTaskPlan,
  RobotTelemetry,
  ExecutionStep,
  TaskHistoryItem,
  LogEntry,
  SupportedLanguage
} from '../types/robot';

interface RobotContextType {
  zones: Record<string, ZoneConfig>;
  objects: Record<string, RobotObject>;
  telemetry: RobotTelemetry;
  activePlan: CognitiveTaskPlan | null;
  history: TaskHistoryItem[];
  logs: LogEntry[];
  selectedObjectId?: string;
  targetZoneId?: string;
  selectedLanguage: SupportedLanguage;
  isPlanning: boolean;
  isExecuting: boolean;
  rosConnected: boolean;
  estopActive: boolean;

  setSelectedObjectId: (id?: string) => void;
  setTargetZoneId: (id?: string) => void;
  setSelectedLanguage: (lang: SupportedLanguage) => void;
  planCommand: (command: string, lang?: SupportedLanguage) => Promise<CognitiveTaskPlan | null>;
  executeActivePlan: () => Promise<void>;
  cancelActiveTask: () => Promise<void>;
  triggerEstop: () => Promise<void>;
  resetEstop: () => Promise<void>;
  resolveClarification: (option: string) => Promise<void>;
  resetScene: () => Promise<void>;
  clearLogs: () => void;
  refreshHistory: () => Promise<void>;
  clearActivePlan: () => void;
}

const RobotContext = createContext<RobotContextType | undefined>(undefined);

export const RobotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [zones, setZones] = useState<Record<string, ZoneConfig>>({});
  const [objects, setObjects] = useState<Record<string, RobotObject>>({});
  const [activePlan, setActivePlan] = useState<CognitiveTaskPlan | null>(null);
  const [history, setHistory] = useState<TaskHistoryItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | undefined>('ball_blue_01');
  const [targetZoneId, setTargetZoneId] = useState<string | undefined>('zone_b');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');

  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [rosConnected, setRosConnected] = useState<boolean>(false);
  const [estopActive, setEstopActive] = useState<boolean>(false);

  const [telemetry, setTelemetry] = useState<RobotTelemetry>({
    connected: true,
    mode: 'simulation',
    ros2_available: false,
    estop_active: false,
    is_busy: false,
    active_intent: 'STANDBY',
    joints: {
      joint1: 0.0,
      joint2: -0.6,
      joint3: 1.2,
      joint4: 0.0,
      joint5: 0.6,
      joint6: 0.0,
      finger_joint: 0.04
    },
    gripper: {
      is_closed: false,
      opening_meters: 0.04,
      grasp_force_n: 0.0,
      is_grasp_secured: false
    },
    controller_frequency_hz: 50.0,
    system_load_pct: 14.2
  });

  const addLog = useCallback(
    (level: LogEntry['level'], subsystem: LogEntry['subsystem'], message: string) => {
      setLogs((prev) => [
        {
          timestamp: Date.now() / 1000,
          level,
          subsystem,
          message
        },
        ...prev.slice(0, 300)
      ]);
    },
    []
  );

  // Fetch initial data defensively
  const loadInitialData = useCallback(async () => {
    try {
      const zRes = await fetch('/api/zones')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
      if (zRes && typeof zRes === 'object' && Object.keys(zRes).length > 0) {
        setZones(zRes as Record<string, ZoneConfig>);
      }

      const oRes = await fetch('/api/objects')
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));
      if (oRes && typeof oRes === 'object' && Object.keys(oRes).length > 0) {
        setObjects(oRes as Record<string, RobotObject>);
      }

      const hRes = await fetch('/api/history')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
      if (Array.isArray(hRes)) {
        setHistory(hRes);
      }
    } catch (e: any) {
      console.warn('Initial data fetch notice:', e?.message);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // WebSocket Live Telemetry Connection with auto-reconnect
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname || 'localhost'}:8000/ws/telemetry`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isDisposed = false;

    const connectWebSocket = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          addLog('INFO', 'NETWORK', 'WebSocket telemetry stream established.');
        };

        ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);
            if (!packet || typeof packet !== 'object') return;
            const { event: evType, data } = packet;
            if (!data) return;

            if (evType === 'snapshot') {
              if (data.inventory && typeof data.inventory === 'object') setObjects(data.inventory);
              if (data.zones && typeof data.zones === 'object') setZones(data.zones);
              if (data.telemetry && typeof data.telemetry === 'object') {
                setTelemetry((prev) => ({
                  ...prev,
                  ...data.telemetry,
                  joints: { ...prev.joints, ...(data.telemetry.joints || {}) },
                  gripper: { ...prev.gripper, ...(data.telemetry.gripper || {}) }
                }));
              }
              setEstopActive(Boolean(data.estop_active));
              setIsExecuting(Boolean(data.is_busy));
              if (data.ros2) setRosConnected(Boolean(data.ros2.connected));
            } else if (evType === 'joint_telemetry') {
              if (Array.isArray(data.joints) && data.joints.length >= 6) {
                setTelemetry((prev) => ({
                  ...prev,
                  joints: {
                    joint1: Number(data.joints[0]) || 0,
                    joint2: Number(data.joints[1]) || 0,
                    joint3: Number(data.joints[2]) || 0,
                    joint4: Number(data.joints[3]) || 0,
                    joint5: Number(data.joints[4]) || 0,
                    joint6: Number(data.joints[5]) || 0,
                    finger_joint: Number(data.gripper_opening) || 0.04
                  }
                }));
              }
            } else if (evType === 'gripper_state') {
              setTelemetry((prev) => ({
                ...prev,
                gripper: {
                  ...prev.gripper,
                  is_closed: Boolean(data.is_closed),
                  grasped_object_id: data.grasped_object_id || null,
                  opening_meters: Number(data.opening_meters) || prev.gripper.opening_meters
                }
              }));
            } else if (evType === 'timeline_update') {
              setActivePlan((prev) => {
                if (!prev || prev.task_id !== data.task_id) return prev;
                const newSteps = (prev.execution_timeline || []).map((st) => {
                  if (st.step_id === data.step_id) {
                    return {
                      ...st,
                      status: data.status,
                      duration_s: data.duration_s,
                      details: data.details
                    };
                  }
                  return st;
                });
                return { ...prev, execution_timeline: newSteps };
              });
            } else if (evType === 'object_moved') {
              setObjects((prev) => {
                if (!prev || !data.object_id || !prev[data.object_id]) return prev;
                return {
                  ...prev,
                  [data.object_id]: {
                    ...prev[data.object_id],
                    zone_id: data.new_zone || prev[data.object_id].zone_id,
                    position: Array.isArray(data.position) ? data.position : prev[data.object_id].position
                  }
                };
              });
            } else if (evType === 'task_finished') {
              setIsExecuting(false);
              if (data.task) {
                setActivePlan(data.task);
              }
              refreshHistory();
            }
          } catch (err) {
            console.error('Error handling WebSocket message:', err);
          }
        };

        ws.onerror = (e) => {
          console.warn('WebSocket connection notice:', e);
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectWebSocket, 2500);
          }
        };
      } catch (err) {
        console.warn('WebSocket setup notice:', err);
        if (!isDisposed) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    connectWebSocket();

    return () => {
      isDisposed = true;
      clearTimeout(reconnectTimeout);
      if (ws) {
        try {
          ws.close();
        } catch (_) {}
      }
    };
  }, [addLog]);

  const planCommand = async (
    command: string,
    lang: SupportedLanguage = selectedLanguage
  ): Promise<CognitiveTaskPlan | null> => {
    if (!command || !command.trim()) return null;
    setIsPlanning(true);
    addLog('INFO', 'PLANNER', `Dispatching command: "${command.trim()}" (lang: ${lang})`);

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: command.trim(), language: lang })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        const failReason =
          errorData.detail || errorData.error_reason || `Planning request failed with status ${res.status}`;

        const failedPlan: CognitiveTaskPlan = {
          task_id: `err_${Date.now()}`,
          action: 'error',
          object_id: '',
          source_zone: '',
          target_zone: '',
          language: lang,
          confidence: 0,
          raw_command: command,
          requires_clarification: false,
          clarification_options: [],
          steps: [],
          execution_timeline: [],
          status: 'failed',
          created_at: Date.now() / 1000,
          assistant_response: `Error: ${failReason}`,
          error_reason: failReason
        };
        setActivePlan(failedPlan);
        addLog('ERROR', 'PLANNER', failReason);
        return failedPlan;
      }

      const plan: CognitiveTaskPlan = await res.json();
      setActivePlan(plan);

      if (plan.object_id) setSelectedObjectId(plan.object_id);
      if (plan.target_zone) setTargetZoneId(plan.target_zone);

      if (plan.status === 'failed') {
        addLog('ERROR', 'VALIDATOR', `Plan validation rejected: ${plan.error_reason}`);
      } else {
        addLog('INFO', 'PLANNER', `Task plan verified: ${plan.action} (id: ${plan.task_id})`);
      }
      return plan;
    } catch (e: any) {
      const failMsg = `Network error during planning: ${e?.message || 'Server unreachable'}`;
      addLog('ERROR', 'PLANNER', failMsg);
      const failedPlan: CognitiveTaskPlan = {
        task_id: `err_${Date.now()}`,
        action: 'error',
        object_id: '',
        source_zone: '',
        target_zone: '',
        language: lang,
        confidence: 0,
        raw_command: command,
        requires_clarification: false,
        clarification_options: [],
        steps: [],
        execution_timeline: [],
        status: 'failed',
        created_at: Date.now() / 1000,
        assistant_response: 'Could not reach task planner backend. Please verify server connection.',
        error_reason: failMsg
      };
      setActivePlan(failedPlan);
      return failedPlan;
    } finally {
      setIsPlanning(false);
    }
  };

  const executeActivePlan = async () => {
    if (!activePlan || isExecuting) return;
    setIsExecuting(true);
    addLog('INFO', 'EXECUTOR', `Executing plan: ${activePlan.task_id}`);

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activePlan)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        setIsExecuting(false);
        addLog(
          'ERROR',
          'EXECUTOR',
          `Execution rejected: ${errData.detail || errData.error_reason || 'Unknown server error'}`
        );
      }
    } catch (e: any) {
      setIsExecuting(false);
      addLog('ERROR', 'EXECUTOR', `Execution initiation failed: ${e?.message}`);
    }
  };

  const cancelActiveTask = async () => {
    addLog('WARN', 'SAFETY', 'Operator initiated task cancellation.');
    try {
      await fetch('/api/cancel', { method: 'POST' });
    } catch (e: any) {
      console.error('Cancel task failed:', e);
    } finally {
      setIsExecuting(false);
    }
  };

  const triggerEstop = async () => {
    addLog('ERROR', 'SAFETY', 'EMERGENCY STOP ENGAGED!');
    setEstopActive(true);
    setIsExecuting(false);
    try {
      await fetch('/api/estop', { method: 'POST' });
    } catch (e: any) {
      console.error('Estop trigger notice:', e);
    }
  };

  const resetEstop = async () => {
    addLog('INFO', 'SAFETY', 'Emergency Stop reset.');
    setEstopActive(false);
    try {
      await fetch('/api/estop/reset', { method: 'POST' });
    } catch (e: any) {
      console.error('Estop reset notice:', e);
    }
  };

  const resolveClarification = async (option: string) => {
    if (!activePlan) return;
    addLog('INFO', 'PLANNER', `Selected clarification option: ${option}`);
    try {
      const res = await fetch('/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: activePlan.task_id,
          selected_option: option
        })
      });
      if (res.ok) {
        const resolvedPlan = await res.json();
        setActivePlan(resolvedPlan);
        if (resolvedPlan.object_id) setSelectedObjectId(resolvedPlan.object_id);
        if (resolvedPlan.target_zone) setTargetZoneId(resolvedPlan.target_zone);
      }
    } catch (e: any) {
      addLog('ERROR', 'PLANNER', `Clarification resolution failed: ${e?.message}`);
    }
  };

  const resetScene = async () => {
    addLog('INFO', 'WORKSPACE', 'Resetting object positions and zones.');
    try {
      const res = await fetch('/api/reset_inventory', { method: 'POST' });
      if (res.ok) {
        const newInv = await res.json();
        setObjects(newInv);
        setSelectedObjectId('ball_blue_01');
        setTargetZoneId('zone_b');
        setActivePlan(null);
        setIsExecuting(false);
      }
    } catch (e: any) {
      console.error('Reset scene notice:', e);
    }
  };

  const clearLogs = () => setLogs([]);

  const clearActivePlan = useCallback(() => {
    setActivePlan(null);
  }, []);

  const refreshHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const h = await res.json();
        if (Array.isArray(h)) setHistory(h);
      }
    } catch (e: any) {
      console.error('Refresh history notice:', e);
    }
  };

  return (
    <RobotContext.Provider
      value={{
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
      }}
    >
      {children}
    </RobotContext.Provider>
  );
};

export const useRobot = () => {
  const ctx = useContext(RobotContext);
  if (!ctx) throw new Error('useRobot must be used within a RobotProvider');
  return ctx;
};
