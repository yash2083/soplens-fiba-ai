import { Platform } from "react-native";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  checkSOPStatus,
  pollJobStatus,
  submitJob,
  submitSOPReference,
  submitSOPValidate,
  subscribeSSE,
  type AnalysisResult,
  type JobStatus,
  type SOPReferenceResult,
  type SOPStatus,
  type SOPValidateResult,
} from "@/services/fibaApi";

export interface SOPBuilderStep {
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

interface SOPJobState {
  jobId: string | null;
  progress: number;
  message: string;
  loading: boolean;
  error: string | null;
  referenceResult: SOPReferenceResult | null;
  validateResult: SOPValidateResult | null;
}

interface JobContextValue {
  jobState: JobState;
  sopJobState: SOPJobState;
  sopStatus: SOPStatus | null;
  sopSteps: SOPBuilderStep[];
  setSopSteps: React.Dispatch<React.SetStateAction<SOPBuilderStep[]>>;
  currentQuery: string;
  setCurrentQuery: (q: string) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
  submitAnalysis: (videoUri: string, videoName: string, query: string) => Promise<void>;
  uploadSOPReference: (videoUri: string, videoName: string) => Promise<void>;
  runSOPValidate: (videoUri: string, videoName: string) => Promise<void>;
  refreshSOPStatus: () => Promise<void>;
  resetJob: () => void;
  overrideAction: (label: string) => void;
}

const defaultJobState: JobState = {
  jobId: null,
  progress: 0,
  message: "",
  done: false,
  loading: false,
  error: null,
  result: null,
};

const defaultSOPJobState: SOPJobState = {
  jobId: null,
  progress: 0,
  message: "",
  loading: false,
  error: null,
  referenceResult: null,
  validateResult: null,
};

const JobContext = createContext<JobContextValue | null>(null);

export function JobProvider({ children }: { children: React.ReactNode }) {
  const [jobState, setJobState] = useState<JobState>(defaultJobState);
  const [sopJobState, setSOPJobState] = useState<SOPJobState>(defaultSOPJobState);
  const [sopStatus, setSOPStatus] = useState<SOPStatus | null>(null);
  const [sopSteps, setSopSteps] = useState<SOPBuilderStep[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sopPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseCleanupRef = useRef<(() => void) | null>(null);
  const currentQueryRef = useRef<string>("");

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (sseCleanupRef.current) { sseCleanupRef.current(); sseCleanupRef.current = null; }
  }, []);

  const stopSOPPolling = useCallback(() => {
    if (sopPollRef.current) { clearInterval(sopPollRef.current); sopPollRef.current = null; }
  }, []);

  const applySOPCompliance = useCallback((result: AnalysisResult, steps: SOPBuilderStep[]): SOPBuilderStep[] => {
    if (steps.length === 0) return steps;
    const detectedAction = result.action_label?.toLowerCase() ?? "";
    const detectedObject = result.query_info?.object?.toLowerCase() ?? "";

    let matchIndex = -1;
    for (let i = 0; i < steps.length; i++) {
      const sa = steps[i].action.toLowerCase();
      const so = steps[i].object.toLowerCase();
      if ((detectedAction.includes(sa) || sa.includes(detectedAction)) && (!so || detectedObject.includes(so) || so.includes(detectedObject))) {
        matchIndex = i;
        break;
      }
    }

    return steps.map((step, i) => {
      const sa = step.action.toLowerCase();
      const so = step.object.toLowerCase();
      const aMatch = detectedAction.includes(sa) || sa.includes(detectedAction);
      const oMatch = !so || detectedObject.includes(so) || so.includes(detectedObject);
      if (aMatch && oMatch) return { ...step, status: "correct" };
      if (matchIndex >= 0 && i < matchIndex) return { ...step, status: "skipped" };
      if (matchIndex >= 0 && i > matchIndex) return { ...step, status: "wrong" };
      return { ...step, status: "skipped" };
    });
  }, []);

  const addToHistory = useCallback((jobId: string, query: string, result: AnalysisResult) => {
    const entry: HistoryEntry = {
      id: jobId,
      query,
      actionLabel: result.action_label ?? "Unknown",
      confidence: result.confidence ?? 0,
      actionDetected: result.action_detected ?? false,
      timestamp: Date.now(),
      result,
    };
    setHistory((prev) => [entry, ...prev]);
  }, []);

  const handleJobDone = useCallback((status: JobStatus, query: string) => {
    const analysisResult = status.result as AnalysisResult | null;
    setJobState({
      jobId: status.job_id,
      progress: 100,
      message: status.message,
      done: true,
      loading: false,
      error: status.error,
      result: analysisResult,
    });
    if (analysisResult) {
      setSopSteps((prev) => applySOPCompliance(analysisResult, prev));
      addToHistory(status.job_id, query, analysisResult);
    }
  }, [applySOPCompliance, addToHistory]);

  const startPollingJob = useCallback((jobId: string, query: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const status = await pollJobStatus(jobId);
        setJobState((prev) => ({
          ...prev,
          progress: status.progress,
          message: status.message,
          done: status.done,
          error: status.error,
          result: (status.result as AnalysisResult | null),
          loading: !status.done,
        }));
        if (status.done) {
          stopPolling();
          if (status.result) {
            const analysisResult = status.result as AnalysisResult;
            setSopSteps((prev) => applySOPCompliance(analysisResult, prev));
            addToHistory(jobId, query, analysisResult);
          }
        }
        if (status.error) stopPolling();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Polling error";
        setJobState((prev) => ({ ...prev, error: msg, loading: false }));
        stopPolling();
      }
    }, 800);
  }, [stopPolling, applySOPCompliance, addToHistory]);

  const submitAnalysis = useCallback(async (videoUri: string, videoName: string, query: string) => {
    stopPolling();
    setCurrentQuery(query);
    currentQueryRef.current = query;
    setJobState({ ...defaultJobState, loading: true, message: "Uploading video…" });

    try {
      const { job_id } = await submitJob(videoUri, videoName, query);
      setJobState((prev) => ({ ...prev, jobId: job_id, progress: 5, message: "Job queued, connecting…" }));

      // Try SSE on web (not for demo jobs)
      const cleanup = subscribeSSE(
        job_id,
        (progress, message, done, error) => {
          if (error === "SSE_FALLBACK") {
            // SSE failed — switch to polling
            stopPolling();
            startPollingJob(job_id, query);
            return;
          }
          setJobState((prev) => ({ ...prev, progress, message, done: !!done, error, loading: !done }));
          if (done) {
            stopPolling();
            // Fetch full result (SSE only carries progress, not full result)
            pollJobStatus(job_id).then((status) => {
              handleJobDone(status, query);
            }).catch((err) => {
              setJobState((prev) => ({
                ...prev,
                error: err instanceof Error ? err.message : "Failed to fetch result",
                loading: false,
              }));
            });
          }
        }
      );

      if (cleanup) {
        sseCleanupRef.current = cleanup;
      } else {
        // Native or demo — use polling
        startPollingJob(job_id, query);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit job";
      setJobState({ ...defaultJobState, error: msg });
    }
  }, [stopPolling, startPollingJob, handleJobDone]);

  const uploadSOPReference = useCallback(async (videoUri: string, videoName: string) => {
    stopSOPPolling();
    setSOPJobState({ ...defaultSOPJobState, loading: true, message: "Uploading reference video…" });

    try {
      const { job_id } = await submitSOPReference(videoUri, videoName);
      setSOPJobState((prev) => ({ ...prev, jobId: job_id, progress: 5, message: "Processing reference…" }));

      sopPollRef.current = setInterval(async () => {
        try {
          const status = await pollJobStatus(job_id);
          setSOPJobState((prev) => ({
            ...prev,
            progress: status.progress,
            message: status.message,
            loading: !status.done,
            error: status.error,
          }));
          if (status.done) {
            stopSOPPolling();
            if (status.result) {
              setSOPJobState((prev) => ({
                ...prev,
                referenceResult: status.result as SOPReferenceResult,
              }));
              // Refresh SOP status
              checkSOPStatus().then(setSOPStatus).catch(console.error);
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Polling error";
          setSOPJobState((prev) => ({ ...prev, error: msg, loading: false }));
          stopSOPPolling();
        }
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setSOPJobState({ ...defaultSOPJobState, error: msg });
    }
  }, [stopSOPPolling]);

  const runSOPValidate = useCallback(async (videoUri: string, videoName: string) => {
    stopSOPPolling();
    setSOPJobState((prev) => ({ ...prev, loading: true, message: "Uploading test video…", validateResult: null, error: null }));

    try {
      const { job_id } = await submitSOPValidate(videoUri, videoName);
      setSOPJobState((prev) => ({ ...prev, jobId: job_id, progress: 5, message: "Validating…" }));

      sopPollRef.current = setInterval(async () => {
        try {
          const status = await pollJobStatus(job_id);
          setSOPJobState((prev) => ({
            ...prev,
            progress: status.progress,
            message: status.message,
            loading: !status.done,
            error: status.error,
          }));
          if (status.done) {
            stopSOPPolling();
            if (status.result) {
              setSOPJobState((prev) => ({
                ...prev,
                validateResult: status.result as SOPValidateResult,
              }));
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Polling error";
          setSOPJobState((prev) => ({ ...prev, error: msg, loading: false }));
          stopSOPPolling();
        }
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setSOPJobState((prev) => ({ ...prev, error: msg, loading: false }));
    }
  }, [stopSOPPolling]);

  const refreshSOPStatus = useCallback(async () => {
    try {
      const s = await checkSOPStatus();
      setSOPStatus(s);
    } catch {
      setSOPStatus(null);
    }
  }, []);

  const resetJob = useCallback(() => {
    stopPolling();
    setJobState(defaultJobState);
  }, [stopPolling]);

  const overrideAction = useCallback((label: string) => {
    setJobState((prev) => {
      if (!prev.result) return prev;
      return { ...prev, result: { ...prev.result, action_label: label } };
    });
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return (
    <JobContext.Provider value={{
      jobState,
      sopJobState,
      sopStatus,
      sopSteps,
      setSopSteps,
      currentQuery,
      setCurrentQuery,
      history,
      clearHistory,
      submitAnalysis,
      uploadSOPReference,
      runSOPValidate,
      refreshSOPStatus,
      resetJob,
      overrideAction,
    }}>
      {children}
    </JobContext.Provider>
  );
}

// Keep backward compat alias
export type { SOPBuilderStep as SOPStep };

export function useJob() {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error("useJob must be used within JobProvider");
  return ctx;
}
