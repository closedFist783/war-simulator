# War Simulator 🃏

A probabilistic War card game simulator built with React + TypeScript + Vite.

## Features

- **2-4 player support** — Standard and multiplayer War rules
- **Three solver modes:**
  - **Exact** — Fully deterministic for known ordered hands
  - **Enumeration** — Exhaustive for small latent state spaces
  - **Adaptive Monte Carlo** — Wilson-score 95% CIs with convergence detection
- **Loop detection** — Tracks visited states to flag infinite games
- **Delta engine** — Win% swing analysis between events
- **Full rule configuration** — War depth, tie policies, capture order, insufficient card policies

## Tech Stack

- Vite + React 19 + TypeScript
- Recharts (charting)
- No external CSS frameworks — inline styles with design system tokens

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

## Design Palette

| Token | Value |
|-------|-------|
| Background | `#0B1020` |
| Surface | `#121A2B` |
| Primary | `#5B8DEF` |
| Secondary | `#8B5CF6` |
| Positive | `#22C55E` |
| Negative | `#F87171` |

## Architecture

```
src/
  engine/
    types.ts          # All shared TypeScript types
    gameEngine.ts     # War game simulator (all rule variants)
    loopDetector.ts   # State hashing + loop detection
    validator.ts      # State validation with error messages
  solver/
    exactSolver.ts    # Deterministic ordered-state solver
    enumSolver.ts     # Hidden-order enumeration + sampling
    mcSolver.ts       # Adaptive Monte Carlo + Wilson CIs
    deltaSolver.ts    # Win% delta between events
    index.ts          # Auto-select solver + run
  components/
    InputPanel.tsx    # Game state + rule + solver config UI
    ResultsPanel.tsx  # Charts + diagnostics
    WinProbChart.tsx  # Win probability bar chart with CI error bars
    FinishPositionChart.tsx  # Stacked place marginals chart
    RoundsDistChart.tsx      # Rounds distribution histogram
    DeltaChart.tsx           # Win% delta waterfall
    DiagnosticsPanel.tsx     # Solver diagnostics + expected rounds
```

## Known Limitations

- The exact enumeration solver samples from the latent space rather than exhaustively enumerating (for large spaces); exact combinatorial enumeration would require exponential memory
- The loop detector only works for fully-ordered hands (hashing is deterministic only when card order is known)
- `reuse_last_faceup` and `equalize_to_shortest` insufficient-card policies are partially implemented (game engine falls back to `all_in` behavior for edge cases)
- Chunk size is large (~580 kB) due to Recharts; could be code-split for production use
