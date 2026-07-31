import { useCallback, useEffect, useRef, useState } from "react";
import type { DatabaseProject } from "@/core/model";

const MAX_HISTORY_SIZE = 50;

export type ProjectHistory = {
  past: DatabaseProject[];
  future: DatabaseProject[];
};

export type UseProjectHistoryResult = {
  commitHistory: (currentProject: DatabaseProject) => void;
  undo: (currentProject: DatabaseProject) => DatabaseProject | null;
  redo: (currentProject: DatabaseProject) => DatabaseProject | null;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
};

export function useProjectHistory(): UseProjectHistoryResult {
  const [history, setHistory] = useState<ProjectHistory>({
    past: [],
    future: [],
  });

  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  });

  const commitHistory = useCallback((currentProject: DatabaseProject) => {
    setHistory((prev) => {
      const next = prev.past.length >= MAX_HISTORY_SIZE
        ? prev.past.slice(prev.past.length - MAX_HISTORY_SIZE + 1)
        : prev.past;
      return {
        past: [...next, currentProject],
        future: [],
      };
    });
  }, []);

  const undo = useCallback((currentProject: DatabaseProject): DatabaseProject | null => {
    const { past, future } = historyRef.current;
    if (past.length === 0) return null;
    const previous = past[past.length - 1];
    setHistory({
      past: past.slice(0, past.length - 1),
      future: [currentProject, ...future],
    });
    return previous;
  }, []);

  const redo = useCallback((currentProject: DatabaseProject): DatabaseProject | null => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return null;
    const next = future[0];
    setHistory({
      past: [...past, currentProject],
      future: future.slice(1),
    });
    return next;
  }, []);

  const clearHistory = useCallback(() => {
    setHistory({ past: [], future: [] });
  }, []);

  return {
    commitHistory,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clearHistory,
  };
}
