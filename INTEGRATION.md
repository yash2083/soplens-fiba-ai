# SOPLens ↔ FIBA AI Backend — Integration Guide

Complete reference for connecting the SOPLens Expo frontend to the Flask backend.

---

## Quick Start

1. Start the Flask server:
   ```bash
   cd web_app
   python app.py
   # Server: http://localhost:5000
   ```

2. The app auto-detects the backend. If `localhost:5000` is unreachable, it falls back to **Demo Mode** (simulated pipeline) automatically.

---

## Base URL

```
http://localhost:5000
```

Configured in `artifacts/soplens/services/fibaApi.ts` → `FLASK_BASE`.  
Change this constant if your server runs on a different host/port.

---

## Endpoints Used by the App

### Action Analysis

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/process` | Submit video + query → returns `{ job_id }` |
| `GET`  | `/api/status/<job_id>` | Poll for progress + result |
| `GET`  | `/api/stream/<job_id>` | SSE real-time progress (web only, auto-fallback to polling on native) |

### SOP Compliance

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/sop/status` | Check if reference/classifier is loaded |
| `POST` | `/api/sop/reference` | Upload reference video to learn SOP sequence |
| `POST` | `/api/sop/validate` | Upload test video to validate SOP compliance |

SOP jobs also use `/api/status/<job_id>` for polling.

---

## Request Formats

### POST `/api/process`

```
Content-Type: multipart/form-data
  video  — video file (any format OpenCV supports)
  query  — natural language string, e.g. "person picking up a cup"
```

Response: `{ "job_id": "abc123", "status": "started" }`

### POST `/api/sop/reference` and `/api/sop/validate`

```
Content-Type: multipart/form-data
  video  — video file
```

Response: `{ "job_id": "sop_ref_abc123", "status": "started" }`

---

## Job Status Response

```json
{
  "job_id": "abc123",
  "progress": 45,
  "message": "Detecting objects...",
  "done": false,
  "result": null,
  "error": null
}
```

When `done: true`, `result` is populated. Three result shapes are possible:

### Action Result (`result.type` absent — default)

```typescript
{
  action_detected: boolean
  action_label: string
  action_category: string
  confidence: number           // 0.0–1.0
  timestamp_range: [number, number]  // [start_frame, end_frame] — NOT milliseconds
  evidence: string
  action_description: string
  key_frames: string[]         // Base64 JPEGs
  skeleton_frames: string[]    // Base64 JPEGs
  finger_trajectory: string    // Base64 JPEG
  trajectory: string           // Base64 JPEG
  motion_summary: { ... }
  query_info: { raw, verb, category, object, tool }
  total_frames: number
  fps: number
  processing_time_s: number
  edge_stats: { edge_ready, zero_shot, pipeline_latency_s, effective_fps, resolution, models_used, ... }
}
```

> **Important:** `timestamp_range` values are **frame numbers**, not milliseconds.  
> Convert to time: `frame / fps = seconds`.  
> The app uses `formatFrameTime(frame, fps)` for display.

### SOP Reference Result (`result.type === "sop_reference"`)

```typescript
{
  type: "sop_reference"
  segments: [{ start_frame, end_frame, predicted_task, task_name, confidence, keyframe_b64, skeleton_b64 }]
  sop_steps: [{ step_num, task_name, description }]
  total_frames: number
  fps: number
  processing_time_s: number
  segment_count: number
}
```

### SOP Validate Result (`result.type === "sop_validate"`)

```typescript
{
  type: "sop_validate"
  passed: boolean
  step_results: [{
    position: number
    expected_task: string
    detected_task: string
    similarity: number         // 0.0–1.0
    is_correct: boolean
    keyframe_b64: string       // Base64 JPEG
    skeleton_b64: string       // Base64 JPEG
  }]
  summary: string
  total_frames: number
  fps: number
  processing_time_s: number
}
```

---

## SSE Streaming (Web)

On web, the app connects to `GET /api/stream/<job_id>` (EventSource) for real-time updates.  
Each SSE message: `data: { "progress": 45, "message": "Detecting...", "done": false }`

On mobile (React Native), or if SSE fails, the app automatically falls back to polling `/api/status/<job_id>` every 800ms.

---

## Pipeline Progress Stages

These are the typical progress ranges from the Flask pipeline:

| Stage | Progress | Message |
|-------|----------|---------|
| Parse Query | 0–15% | "Parsing query…" |
| Detect | 15–45% | "Detecting objects…" |
| Track | 45–72% | "Tracking across frames…" |
| Infer | 72–85% | "Inferring action…" |
| Render | 85–100% | "Rendering visualizations…" |

---

## Base64 Image Rendering

All image fields (`key_frames`, `skeleton_frames`, `finger_trajectory`, `trajectory`, `keyframe_b64`, `skeleton_b64`) are Base64-encoded JPEGs.

The app renders them as:
```
source={{ uri: `data:image/jpeg;base64,${b64String}` }}
```

---

## CORS

CORS is enabled on all backend endpoints. No proxy configuration needed.

---

## Demo Mode

When `localhost:5000` is unreachable, the app auto-activates **Demo Mode**:
- `submitJob` returns a `demo_XXXXXXXX` job ID
- Progress is simulated over ~7.5 seconds
- A realistic `AnalysisResult` is returned based on the query text

To force demo mode in testing: navigate to the app URL with `?skip=1` appended.  
Demo mode banner appears in amber on the Analyze screen once triggered.

---

## File Locations

| File | Purpose |
|------|---------|
| `artifacts/soplens/services/fibaApi.ts` | All API calls, TypeScript interfaces, SSE, demo mode |
| `artifacts/soplens/context/JobContext.tsx` | Global state, SSE/polling orchestration, SOP methods |
| `artifacts/soplens/app/(tabs)/index.tsx` | Analyze screen — video upload + query |
| `artifacts/soplens/app/processing.tsx` | Processing screen — live progress |
| `artifacts/soplens/app/results.tsx` | Results screen — action, evidence, visuals, edge stats |
| `artifacts/soplens/app/(tabs)/sop.tsx` | SOP Builder — reference upload, validation, templates |
| `artifacts/soplens/app/(tabs)/history.tsx` | Session history |

---

## Error Handling

| Backend Error | App Behaviour |
|---------------|--------------|
| `No video file provided` | Blocked at UI level — button disabled without file |
| `No query provided` | Blocked at UI level |
| `Job not found` | Error shown on Processing screen with retry option |
| `No classifier trained...` | Warning banner on SOP tab; validate button disabled |
| Network timeout | Falls back to demo mode on Analyze; shows error on SOP flows |
