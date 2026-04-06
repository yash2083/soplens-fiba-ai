import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { pollJobStatus, submitJob, type AnalysisResult, type JobStatus } from "@/services/fibaApi";

export interface SOPStep {
  id: string;
  text: string;
  object: string;
  action: string;
  status: "pending" | "correct" | "skipped" | "wrong";
}

export interface HistoryEntry {
  id: string;
  query: string;
  actionLabel: string;
  confidence: number;
  actionDetected: boolean;
  timestamp: number;
  result: AnalysisResult;
}

interface JobState {
  jobId: string | null;
  progress: number;
  message: string;
  done: boolean;
  loading: boolean;
  error: string | null;
  result: AnalysisResult | null;
}

interface JobContextValue {
  jobState: JobState;
  sopSteps: SOPStep[];
  setSopSteps: React.Dispatch<React.SetStateAction<SOPStep[]>>;
  currentQuery: string;
  setCurrentQuery: (q: string) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
  submitAnalysis: (videoUri: string, videoName: string, query: string) => Promise<void>;
  resetJob: () => void;
  overrideAction: (label: string) => void;
}

const defaultState: JobState = {
  jobId: null,
  progress: 0,
  message: "",
  done: false,
  loading: false,
  error: null,
  result: null,
};

const JobContext = createContext<JobContextValue | null>(null);

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobState, setJobState] = useState<JobState>(defaultState);
  const [sopSteps, setSopSteps] = useState<SOPStep[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentQueryRef = useRef<string>("");

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const applySOPCompliance = useCallback((result: AnalysisResult, steps: SOPStep[]): SOPStep[] => {
    if (steps.length === 0) return steps;
    const detectedAction = result.action_label?.toLowerCase() ?? "";
    const detectedObject = result.query_info?.object?.toLowerCase() ?? "";

    let matchIndex = -1;
    for (let i = 0; i < steps.length; i++) {
      const stepAction = steps[i].action.toLowerCase();
      const stepObject = steps[i].object.toLowerCase();
      const actionMatch = detectedAction.includes(stepAction) || stepAction.includes(detectedAction);
      const objectMatch = !stepObject || detectedObject.includes(stepObject) || stepObject.includes(detectedObject);
      if (actionMatch && objectMatch) {
        matchIndex = i;
        break;
      }
    }

    return steps.map((step, i) => {
      const stepAction = step.action.toLowerCase();
      const stepObject = step.object.toLowerCase();
      const actionMatch = detectedAction.includes(stepAction) || stepAction.includes(detectedAction);
      const objectMatch = !stepObject || detectedObject.includes(stepObject) || stepObject.includes(detectedObject);

      if (actionMatch && objectMatch) return { ...step, status: "correct" };
      if (matchIndex >= 0 && i < matchIndex) return { ...step, status: "skipped" };
      if (matchIndex >= 0 && i > matchIndex) return { ...step, status: "wrong" };
      return { ...step, status: "skipped" };
    });
  }, []);

  const submitAnalysis = useCallback(async (videoUri: string, videoName: string, query: string) => {
    stopPolling();
    setCurrentQuery(query);
    currentQueryRef.current = query;
    setJobState({ ...defaultState, loading: true, message: "Uploading video..." });

    try {
      const { job_id } = await submitJob(videoUri, videoName, query);
      setJobState((prev) => ({ ...prev, jobId: job_id, progress: 5, message: "Job started, analyzing..." }));

      pollRef.current = setInterval(async () => {
        try {
          const status: JobStatus = await pollJobStatus(job_id);
          setJobState((prev) => ({
            ...prev,
            progress: status.progress,
            message: status.message,
            done: status.done,
            error: status.error,
            result: status.result,
            loading: !status.done,
          }));

          if (status.done) {
            stopPolling();
            if (status.result) {
              setSopSteps((prev) => applySOPCompliance(status.result!, prev));
              // Add to history list
              const entry: HistoryEntry = {
                id: job_id,
                query: currentQueryRef.current,
                actionLabel: status.result.action_label ?? "Unknown",
                confidence: status.result.confidence ?? 0,
                actionDetected: status.result.action_detected ?? false,
                timestamp: Date.now(),
                result: status.result,
              };
              setHistory((prev) => [entry, ...prev]);
            }
          }

          if (status.error) stopPolling();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Polling error";
          setJobState((prev) => ({ ...prev, error: msg, loading: false }));
          stopPolling();
        }
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit job";
      setJobState({ ...defaultState, error: msg });
    }
  }, [stopPolling, applySOPCompliance]);

  const resetJob = useCallback(() => {
    stopPolling();
    setJobState(defaultState);
  }, [stopPolling]);

  const overrideAction = useCallback((label: string) => {
    setJobState((prev) => {
      if (!prev.result) return prev;
      return { ...prev, result: { ...prev.result, action_label: label } };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <JobContext.Provider value={{
      jobState,
      sopSteps,
      setSopSteps,
      currentQuery,
      setCurrentQuery,
      history,
      clearHistory,
      submitAnalysis,
      resetJob,
      overrideAction,
    }}>
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJob must be used within JobProvider");
  return ctx;
}
