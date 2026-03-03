# RetroVault Documentation

![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-purple)

**RetroVault** is a local-first, browser-based retro game emulation platform. It embeds multiple Libretro WebAssembly cores inside a high-fidelity, skeuomorphic Game Boy DMG-01 console interface built entirely with React and Tailwind CSS.

No backend. No accounts. No uploads. Everything runs in your browser.

---

## 📚 Documentation Index

### 1. [Root README](../README.md)

The primary entry point for the project. Covers:

- What RetroVault does (feature list)
- Library Search & Filter functionality
- How the three-column UI is structured
- How to get started (clone, install, run)
- How to play a game step by step
- Platform and core support table
- Full tech stack

---

### 2. [System Architecture](./Architecture.md)

The definitive technical architecture reference. Covers:

- The five architectural layers (Presentation, Scanner, Emulation, Storage, Output)
- Exact responsibilities of `App.tsx`, `EmulatorConsole.tsx`, `@retrovault/core`, and `@retrovault/db`
- Full Mermaid sequence diagram: from clicking a game to audio output
- Why Nostalgist.js was chosen over raw WASM Web Workers
- Why `useRef` stabilization is critical in `EmulatorConsole.tsx`
- Why localforage was chosen over OPFS for save data
- The real monorepo directory structure
- CSS architecture (themes, CRT filter, scanlines, texture)

---

### 3. [Database & Storage Architecture](./Database_Architecture.md)

The data persistence reference. Covers:

- How `localforage` works and why it was chosen
- All four store instances and their purposes
- Full TypeScript data model definitions (`SaveStateMetadata`, `PlayHistory`, `UserSettings`, `KeyBindings`)
- Complete API method table for each Storage service
- Key naming conventions inside IndexedDB
- The auto-save lifecycle (30-second interval, on-boot restore)
- The play-time tracking lifecycle (10-second interval)
- The `gameId` derivation strategy (`${fileName}-${fileSize}`)

---

### 4. [Local Development Guide](./Development_Guide.md)

The contributor and developer setup guide. Covers:

- Prerequisites (Node.js, pnpm version requirements)
- Step-by-step first-time setup
- Complete annotated boot flow walkthrough
- ROM scanning and library build flow
- Emulator launch flow (from click to running game)
- Key files reference table
- Turborepo pipeline commands
- How to modify the Game Boy shell appearance
- How to add a new emulation core
- How to add a new storage feature
- Common issues and their root causes (with fixes)

---

### 5. [Product Requirements Document](./PRD.md)

The product vision and roadmap. Covers:

- Executive summary and target audience
- Core value propositions
- Phased feature roadmap (Phase 1 through Phase 5+)
- Strategy for future opt-in server-side scaling

---

### 6. [Software Requirements Specification](./SRS.md)

The formal functional and non-functional requirements. Covers:

- Strict UI/UX state requirements
- Functional requirements (FR-001 through FR-xxx)
- Non-functional requirements (performance, security, compatibility)
- Database object schemas

---

### 7. [UI Wireframes & Component Ecosystem](./Wireframes.md)

The visual layout reference. Covers:

- Global layout grid definition
- Component tree hierarchy
- UX state definitions (idle, scanning, loading, playing, paused)

---

## 🔧 Quick Command Reference

```bash
pnpm install          # Install all workspace dependencies
pnpm run dev          # Start development server (localhost:5173)
pnpm run build        # Production build (all packages → apps/web)
pnpm run lint         # ESLint across all workspaces
pnpm run typecheck    # TypeScript validation across all workspaces
pnpm run format       # Prettier format all .ts/.tsx/.md files
pnpm run preview      # Serve production build locally
```

---

## ⚖️ Legal Disclaimer

RetroVault is strictly an emulation frontend and runtime. It ships with no copyrighted BIOS files, ROM dumps, or proprietary game assets. It is designed solely as a tool for running backups of games the user legally owns. No game content is hosted, transmitted, or served by this application.
