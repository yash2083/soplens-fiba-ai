import { Platform } from "react-native";

export const FLASK_BASE = "http://localhost:5000";

// ---------------------------------------------------------------------------
// Core types — match the backend spec exactly
// ---------------------------------------------------------------------------

export interface QueryInfo {
  raw: string;
  verb: string;
  category: string;
  object: string;
  tool: string | null;
}

export interface MotionSummary {
  rotation_deg?: number;
  displacement_px?: number;
  contact_events?: number;
  area_change_ratio?: number;
  state_change?: string;
  vertical_motion?: string;
  motion_speed_px_per_frame?: number;
  contact_frequency?: string;
  approach_score?: number;
  grasp_change?: string;
  area_growth_trend?: string;
  [key: string]: unknown;
}

export interface EdgeStats {
  edge_ready: boolean;
  zero_shot: boolean;
  pipeline_latency_s: number;
  frame_processing_s: number;
  inference_latency_s: number;
  effective_fps: number;
  processed_frames: number;
  total_frames: number;
  frame_skip: number;
  resolution: string;
  models_used: string;
}

export interface AnalysisResult {
  action_detected: boolean;
  action_label: string;
  action_category: string;
  confidence: number;
  timestamp_range: [number, number];   // [start_frame, end_frame]
  evidence: string;
  action_description?: string;
  key_frames: string[];                // Base64 JPEGs
  skeleton_frames?: string[];          // Base64 JPEGs
  finger_trajectory?: string;          // Base64 JPEG
  trajectory?: string;                 // Base64 JPEG (motion path visualisation)
  motion_summary: MotionSummary;
  query_info: QueryInfo;
  total_frames: number;
  fps: number;
  processing_time_s: number;
  edge_stats?: EdgeStats;
}

// SOP types
export interface SOPSegment {
  start_frame: number;
  end_frame: number;
  duration_frames: number;
  predicted_task: string;
  task_name: string;
  confidence: number;
  keyframe_b64: string;
  skeleton_b64: string;
}

export interface SOPStep {
  step_num: number;
  task_name: string;
  description: string;
}

export interface SOPReferenceResult {
  type: "sop_reference";
  segments: SOPSegment[];
  sop_steps: SOPStep[];
  total_frames: number;
  fps: number;
  processing_time_s: number;
  segment_count: number;
}

export interface SOPStepResult {
  position: number;
  expected_task: string;
  detected_task: string;
  similarity: number;
  is_correct: boolean;
  keyframe_b64: string;
  skeleton_b64: string;
}

export interface SOPValidateResult {
  type: "sop_validate";
  passed: boolean;
  step_results: SOPStepResult[];
  summary: string;
  total_frames: number;
  fps: number;
  processing_time_s: number;
}

export interface JobStatus {
  job_id: string;
  progress: number;
  message: string;
  done: boolean;
  result: AnalysisResult | SOPReferenceResult | SOPValidateResult | null;
  error: string | null;
}

export interface SubmitResponse {
  job_id: string;
  status: string;
}

export interface SOPStatus {
  has_reference: boolean;
  has_classifier: boolean;
}

// ---------------------------------------------------------------------------
// Demo / mock mode — activates automatically when Flask backend is down
// ---------------------------------------------------------------------------

const DEMO_PREFIX = "demo_";
const demoJobs = new Map<string, { startMs: number; query: string }>();

function parseDemoQuery(query: string): AnalysisResult {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  const rawVerb = words[0] || "detect";
  const verb = rawVerb
    .replace(/ening$/, "en")
    .replace(/ning$/, "n")
    .replace(/ing$/, "")
    || rawVerb;
  const object = words.slice(1).join(" ") || "object";

  const lookup: Record<string, Partial<AnalysisResult>> = {
    open:    { action_label: `Opening ${object}`, action_category: "manipulation", trajectory: undefined, confidence: 0.87 },
    close:   { action_label: `Closing ${object}`,  action_category: "manipulation", confidence: 0.84 },
    pick:    { action_label: `Picking up ${object}`,action_category: "grasp",         confidence: 0.82 },
    lift:    { action_label: `Lifting ${object}`,   action_category: "transport",     confidence: 0.79 },
    tighten: { action_label: `Tightening ${object}`,action_category: "manipulation", confidence: 0.91 },
    insert:  { action_label: `Inserting ${object}`, action_category: "assembly",      confidence: 0.78 },
    check:   { action_label: `Checking ${object}`,  action_category: "inspection",    confidence: 0.76 },
    place:   { action_label: `Placing ${object}`,   action_category: "transport",     confidence: 0.80 },
    press:   { action_label: `Pressing ${object}`,  action_category: "manipulation", confidence: 0.85 },
    push:    { action_label: `Pushing ${object}`,   action_category: "manipulation", confidence: 0.77 },
  };

  const t = lookup[verb] ?? {
    action_label: query || "Unknown action",
    action_category: "general",
    confidence: 0.72,
  };

  const traj = (t.action_category ?? "general").replace(/_/g, " ");
  const pct  = Math.round((t.confidence as number) * 100);

  return {
    action_detected: true,
    action_label: t.action_label as string,
    action_category: t.action_category as string,
    confidence: t.confidence as number,
    timestamp_range: [72, 183],   // frames at 30fps = ~2.4s–6.1s
    evidence: `Subject performs "${query}" action beginning at frame 72. Motion trajectory confirms ${traj} pattern across 47 sampled frames with avg magnitude 18.4 px/frame. Peak activity at frame 127. Confidence ${pct}% — above detection threshold.`,
    action_description: `The hand moves toward the ${object}, forms a grasp, and executes the ${t.action_label?.toLowerCase()}.`,
    key_frames: [],
    skeleton_frames: [],
    finger_trajectory: undefined,
    trajectory: undefined,
    motion_summary: {
      displacement_px: 245.3,
      contact_events: 1,
      state_change: "open_to_closed",
      vertical_motion: "upward",
      approach_score: 0.92,
      grasp_change: "formed",
      area_growth_trend: "increasing",
    },
    query_info: { raw: query, verb, category: t.action_category as string, object, tool: null },
    total_frames: 300,
    fps: 30,
    processing_time_s: 7.3,
    edge_stats: {
      edge_ready: true,
      zero_shot: true,
      pipeline_latency_s: 7.3,
      frame_processing_s: 0.015,
      inference_latency_s: 0.003,
      effective_fps: 66.7,
      processed_frames: 150,
      total_frames: 300,
      frame_skip: 2,
      resolution: "640x480",
      models_used: "yolov8n, mobilenet (demo)",
    },
  };
}

function mockPollStatus(jobId: string): JobStatus {
  const job = demoJobs.get(jobId);
  if (!job) throw new Error("Demo job not found");

  const ms = Date.now() - job.startMs;

  const stages: [number, number, string, number, number][] = [
    [0,    800,  "Parsing query…",                      5,  18],
    [800,  2200, "Detecting objects…",                  18, 38],
    [2200, 3800, "Tracking across frames…",             38, 58],
    [3800, 5400, "Inferring action…",                   58, 76],
    [5400, 6600, "Generating evidence text…",           76, 88],
    [6600, 7400, "Rendering visualizations…",           88, 95],
  ];

  for (const [start, end, message, pFrom, pTo] of stages) {
    if (ms >= start && ms < end) {
      const t = (ms - start) / (end - start);
      const progress = Math.round(pFrom + t * (pTo - pFrom));
      return { job_id: jobId, progress, message, done: false, result: null, error: null };
    }
  }

  const result = parseDemoQuery(job.query);
  demoJobs.delete(jobId);
  return { job_id: jobId, progress: 100, message: "Done!", done: true, result, error: null };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export let isDemoMode = false;

export async function submitJob(
  videoUri: string,
  videoName: string,
  query: string
): Promise<SubmitResponse> {
  if (!isDemoMode && !videoUri.startsWith("demo://")) {
    try {
      const formData = new FormData();
      const blob = { uri: videoUri, name: videoName, type: "video/mp4" } as unknown as Blob;
      formData.append("video", blob);
      formData.append("query", query);

      const res = await fetch(`${FLASK_BASE}/api/process`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) return res.json();
    } catch {
      // Backend unreachable — fall through to demo mode
    }
  }

  isDemoMode = true;
  const job_id = `${DEMO_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
  demoJobs.set(job_id, { startMs: Date.now(), query });
  return { job_id, status: "queued" };
}

export async function pollJobStatus(jobId: string): Promise<JobStatus> {
  if (jobId.startsWith(DEMO_PREFIX)) return mockPollStatus(jobId);

  const res = await fetch(`${FLASK_BASE}/api/status/${jobId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Job not found" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Subscribe to SSE progress stream (web only).
 * Returns a cleanup function.
 * Falls back gracefully — caller must start polling if this returns null.
 */
export function subscribeSSE(
  jobId: string,
  onUpdate: (progress: number, message: string, done: boolean, error: string | null) => void
): (() => void) | null {
  if (
    jobId.startsWith(DEMO_PREFIX) ||
    Platform.OS !== "web" ||
    typeof EventSource === "undefined"
  ) {
    return null;
  }

  const es = new EventSource(`${FLASK_BASE}/api/stream/${jobId}`);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data.progress ?? 0, data.message ?? "", !!data.done, data.error ?? null);
      if (data.done) es.close();
    } catch {
      // malformed event — ignore
    }
  };

  es.onerror = () => {
    es.close();
    onUpdate(0, "", false, "SSE_FALLBACK"); // signals caller to switch to polling
  };

  return () => es.close();
}

// ---------------------------------------------------------------------------
// SOP API
// ---------------------------------------------------------------------------

export async function checkSOPStatus(): Promise<SOPStatus> {
  const res = await fetch(`${FLASK_BASE}/api/sop/status`);
  if (!res.ok) throw new Error("Cannot reach SOP status endpoint");
  return res.json();
}

export async function submitSOPReference(
  videoUri: string,
  videoName: string
): Promise<SubmitResponse> {
  const formData = new FormData();
  const blob = { uri: videoUri, name: videoName, type: "video/mp4" } as unknown as Blob;
  formData.append("video", blob);

  const res = await fetch(`${FLASK_BASE}/api/sop/reference`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function submitSOPValidate(
  videoUri: string,
  videoName: string
): Promise<SubmitResponse> {
  const formData = new FormData();
  const blob = { uri: videoUri, name: videoName, type: "video/mp4" } as unknown as Blob;
  formData.append("video", blob);

  const res = await fetch(`${FLASK_BASE}/api/sop/validate`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Convert a frame number to mm:ss using fps. Falls back to ms→mm:ss if fps is 0. */
export function formatFrameTime(frame: number, fps: number): string {
  const totalSec = fps > 0 ? frame / fps : frame / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/** Legacy: convert milliseconds to mm:ss */
export function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function getMotionLabel(motionSummary: MotionSummary): string {
  if (!motionSummary) return "Unknown motion";

  if (motionSummary.state_change) return (motionSummary.state_change as string).replace(/_/g, " → ");
  if (motionSummary.vertical_motion) return (motionSummary.vertical_motion as string) + " motion";
  if (motionSummary.grasp_change) return "Grasp " + (motionSummary.grasp_change as string);

  const keys = Object.keys(motionSummary);
  if (keys.length === 0) return "Linear motion";
  const first = keys[0];
  const val = motionSummary[first];
  if (typeof val === "string") return val.replace(/_/g, " ");
  if (typeof val === "number") {
    if (val > 0) return "Clockwise rotation";
    if (val < 0) return "Counter-clockwise rotation";
    return "No rotation";
  }
  return first.replace(/_/g, " ");
}
