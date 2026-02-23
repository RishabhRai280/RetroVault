# RetroVault Development Workflows

This document outlines the standard workflows to effectively work within the RetroVault workspace.

---

## 1. Initial Local Setup

RetroVault is managed as a modern `Turborepo` monorepo structure. Follow these steps to prepare your local development environment:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/retrovault.git

# 2. Navigate into directory
cd retrovault

# 3. Install core dependencies strictly via npm/yarn/pnpm (Assuming pnpm mapped workspaces)
pnpm install

# 4. Generate initial WASM build layers (if applicable)
pnpm run build:core

# 5. Start the iterative development suite across all packages
pnpm run dev
```

## 2. Package Architecture Guidelines

We enforce a strict separation of concerns within the `packages` layout:
* **`apps/web`**: Any modifications to UI states, routing parameters, responsive design CSS, or PWA `manifest.json` happen here.
* **`packages/core`**: When extending Web Worker messaging loops, updating the Libretro WASM bridge bounds, or optimizing Web Audio Worklet nodes, changes exist exclusively here.
* **`packages/ui`**: All agnostic interface utilities (the custom UI buttons, library grid items, modal screens) must be exported out of here. Think of it as RetroVault's dedicated "Storybook".
* **`packages/db`**: Database migrations regarding new `IndexedDB` columns or OPFS handlers are written here.

## 3. Emulation Core Testing Workflow
Testing binary/emulator behavior isn't standardized to strict unit tests alone due to the visual & auditory nature of the output. 

When validating a newly added `libretro` core or WASM modifications:
1. Ensure `apps/web` runs via `pnpm dev`.
2. Load a standard suite of Homebrew ROMs (e.g. standard open-source GBA visual test suites).
3. Validate:
   * **Visual integrity**: Do colors bleed or alias incorrectly?
   * **Auditory integrity**: Are there audible "pops" due to sample drift?
   * **Input integrity**: Using the gamepad API testing page, assert input delay remains strictly constrained.
4. Record latency profiles inside your browser's Performance tab. Drops below ~58fps indicates algorithmic flaws inside `packages/core`.

## 4. Contributing & PR Workflow
Before submitting a Pull Request:
1. Format all code: `pnpm run format`
2. Validate Typescript integrity: `pnpm run typecheck`
3. Execute Jest/Vitest UI assertions: `pnpm run test`
4. Attach Performance snapshots if submitting graphical or buffer-heavy pull requests.
