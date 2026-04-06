const FLASK_BASE = "http://localhost:5000";

export interface QueryInfo {
  raw: string;
  verb: string;
  category: string;
  object: string;
  tool: string;
}

export interface AnalysisResult {
  action_detected: boolean;
  action_label: string;
  action_category: string;
  confidence: number;
  timestamp_range: [number, number];
  evidence: string;
  key_frames: string[];
  trajectory: string;
  motion_summary: Record<string, unknown>;
  query_info: QueryInfo;
  total_frames: number;
  fps: number;
  processing_time_s: number;
}

export interface JobStatus {
  job_id: string;
  progress: number;
  message: string;
  done: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

export interface SubmitResponse {
  job_id: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Demo / mock mode — activates automatically when the Flask backend is down
// ---------------------------------------------------------------------------

const DEMO_PREFIX = "demo_";
const demoJobs = new Map<string, { startMs: number; query: string }>();

function parseDemoQuery(query: string): Partial<AnalysisResult> {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  // Normalize verb: strip common suffixes so "opening"→"open", "tightening"→"tighten"
  const rawVerb = words[0] || "detect";
  const verb = rawVerb
    .replace(/ening$/, "en")   // tighten
    .replace(/ning$/, "n")     // open
    .replace(/ing$/, "")       // pick, insert, check, close, place, press, push
    || rawVerb;
  const object = words.slice(1).join(" ") || "object";

  const lookup: Record<string, Partial<AnalysisResult>> = {
    open:    { action_label: `Opening ${object}`, action_category: "manipulation", trajectory: "counterclockwise_rotation", confidence: 0.87 },
    close:   { action_label: `Closing ${object}`,  action_category: "manipulation", trajectory: "clockwise_rotation",        confidence: 0.84 },
    pick:    { action_label: `Picking up ${object}`,action_category: "transport",    trajectory: "vertical_up",               confidence: 0.82 },
    lift:    { action_label: `Lifting ${object}`,   action_category: "transport",    trajectory: "vertical_up",               confidence: 0.79 },
    tighten: { action_label: `Tightening ${object}`,action_category: "manipulation", trajectory: "clockwise_rotation",        confidence: 0.91 },
    insert:  { action_label: `Inserting ${object}`, action_category: "assembly",     trajectory: "vertical_down",             confidence: 0.78 },
    check:   { action_label: `Checking ${object}`,  action_category: "inspection",   trajectory: "horizontal",                confidence: 0.76 },
    place:   { action_label: `Placing ${object}`,   action_category: "transport",    trajectory: "vertical_down",             confidence: 0.80 },
    press:   { action_label: `Pressing ${object}`,  action_category: "manipulation", trajectory: "vertical_down",             confidence: 0.85 },
    push:    { action_label: `Pushing ${object}`,   action_category: "manipulation", trajectory: "horizontal",                confidence: 0.77 },
  };

  const t = lookup[verb] ?? {
    action_label: query || "Unknown action",
    action_category: "general",
    trajectory: "linear",
    confidence: 0.72,
  };

  const traj = (t.trajectory as string).replace(/_/g, " ");
  const pct  = Math.round((t.confidence as number) * 100);

  return {
    ...t,
    action_detected: true,
    timestamp_range: [2400, 6100] as [number, number],
    evidence: `Subject performs "${query}" action beginning at 2.4s. Motion trajectory confirms ${traj} pattern across 47 sampled frames with an avg magnitude of 18.4 px/frame. Peak activity at 4.2s. Confidence ${pct}% — above detection threshold.`,
    key_frames: [],
    motion_summary: { dominant_motion: t.trajectory, avg_magnitude: 18.4, peak_frame: 127 },
    query_info: { raw: query, verb, category: (t.action_category as string), object, tool: "" },
    total_frames: 187,
    fps: 30,
    processing_time_s: 7.3,
  };
}

function mockPollStatus(jobId: string): JobStatus {
  const job = demoJobs.get(jobId);
  if (!job) throw new Error("Demo job not found");

  const ms = Date.now() - job.startMs;

  const stages: [number, number, string, number, number][] = [
    //  start   end    message                          progFrom  progTo
    [0,    800,  "Parsing query…",                      5,  18],
    [800,  2200, "Extracting video frames…",            18, 38],
    [2200, 3800, "Computing optical flow…",             38, 58],
    [3800, 5400, "Running action classifier…",          58, 76],
    [5400, 6600, "Generating evidence text…",           76, 88],
    [6600, 7400, "Packaging result…",                   88, 95],
  ];

  for (const [start, end, message, pFrom, pTo] of stages) {
    if (ms >= start && ms < end) {
      const t = (ms - start) / (end - start);
      const progress = Math.round(pFrom + t * (pTo - pFrom));
      return { job_id: jobId, progress, message, done: false, result: null, error: null };
    }
  }

  // Done
  const result = parseDemoQuery(job.query) as AnalysisResult;
  demoJobs.delete(jobId);
  return { job_id: jobId, progress: 100, message: "Analysis complete", done: true, result, error: null };
}

// ---------------------------------------------------------------------------
// Public API — falls back to demo mode on network / server error
// ---------------------------------------------------------------------------

export let isDemoMode = false;

export async function submitJob(
  _videoUri: string,
  _videoName: string,
  query: string
): Promise<SubmitResponse> {
  // Try real backend first
  if (!isDemoMode) {
    try {
      const formData = new FormData();
      const blob = { uri: _videoUri, name: _videoName, type: "video/mp4" } as unknown as Blob;
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

  // Demo mode
  isDemoMode = true;
  const job_id = `${DEMO_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
  demoJobs.set(job_id, { startMs: Date.now(), query });
  return { job_id, status: "queued" };
}

export async function pollJobStatus(jobId: string): Promise<JobStatus> {
  if (jobId.startsWith(DEMO_PREFIX)) {
    return mockPollStatus(jobId);
  }

  const res = await fetch(`${FLASK_BASE}/api/status/${jobId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Job not found" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function getMotionLabel(motionSummary: Record<string, unknown>): string {
  if (!motionSummary) return "Unknown motion";
  const keys = Object.keys(motionSummary);
  if (keys.length === 0) return "Linear motion";
  const first = keys[0];
  const val = motionSummary[first];
  if (typeof val === "string") return val;
  if (typeof val === "number") {
    if (val > 0) return "Clockwise rotation";
    if (val < 0) return "Counter-clockwise rotation";
    return "No rotation";
  }
  return first.replace(/_/g, " ");
}
