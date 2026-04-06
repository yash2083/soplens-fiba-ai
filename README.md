# SOPLens — FIBA AI · Hitachi Hackathon

  **Find-It-By-Action** — an enterprise-grade Expo/React Native mobile app for SOP compliance validation using AI video analysis.

  ## Overview

  Field workers upload a short video clip and describe an action in plain language (e.g. *"opening the bottle cap"*). The AI pipeline detects the action, validates it against Standard Operating Procedures, and returns a confidence score with explainable evidence. Experts can override AI decisions to create a human-in-the-loop feedback loop.

  ## Key Features

  | Feature | Description |
  |---|---|
  | 🎥 **Video Upload** | Select any MP4/MOV/AVI clip from device storage |
  | 🔍 **Natural Language Query** | Describe the action in plain English |
  | 🤖 **AI Pipeline** | 5-stage analysis: parse → frames → optical flow → classifier → evidence |
  | ✅ **SOP Compliance** | Validate detected actions against pre-loaded SOP step templates |
  | 🧑‍🔬 **Expert Override** | Human-in-the-loop relabeling with model feedback loop |
  | 📜 **History** | ChatGPT-style session log with confidence badges and expandable evidence |
  | 🎭 **Demo Mode** | Full simulated AI pipeline when Flask backend is offline — no setup required |

  ## Screens

  - **Analyze** — video picker, query input, quick-fill chips, "Try Demo" for offline testing
  - **Processing** — animated staged progress bar matching the real Flask pipeline steps
  - **Results** — action label, confidence %, timestamp range, evidence, expert override panel
  - **SOP Builder** — define custom SOP steps or load factory templates (Bottle Assembly, Box Inspection)
  - **History** — time-grouped session log (Today / Yesterday / This Week)

  ## Demo Mode

  The app works completely offline. Tap **Try Demo** on the Analyze screen to select a pre-built factory scenario. A simulated AI pipeline runs for ~7.5 seconds, then delivers a full result to the Results screen — no Flask server needed.

  Demo scenarios: Bottle cap · Bolt tighten · Pick & place · Seal ring · Inspection

  ## Backend

  Connect to the Flask API at `http://localhost:5000`. See [`backend_integration.md`](../backend_integration.md) for the full API spec, endpoint contracts, and pipeline architecture.

  ## Tech Stack

  - **Expo SDK 54** / React Native
  - **expo-router** (file-based routing)
  - **expo-video** (intro animation)
  - **Reanimated + Gesture Handler** (liquid glass tab bar, animations)
  - **TypeScript** throughout
  - **Inter font** (400 / 500 / 600 / 700)

  ## Getting Started

  ```bash
  # Install dependencies
  pnpm install

  # Start Expo dev server
  pnpm --filter @workspace/soplens run dev

  # Scan QR code with Expo Go (iOS/Android)
  # Or open in browser at the printed URL
  ```

  ## Project Structure

  ```
  app/
    (tabs)/
      index.tsx       # Analyze tab
      sop.tsx         # SOP Builder tab
      history.tsx     # History tab
    processing.tsx    # Processing screen (modal)
    results.tsx       # Results screen
    _layout.tsx       # Root layout + intro animation
  components/         # Shared UI components
  context/            # JobContext (global analysis state)
  services/
    fibaApi.ts        # Flask API client + demo mode mock
  hooks/
    useColors.ts      # Theme-aware color tokens
  ```

  ---

  *Built for the Hitachi FIBA AI Hackathon — 2026*
  