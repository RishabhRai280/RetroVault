# Local Development & Setup Guide
## RetroVault

This guide assumes you are setting up the project to write code, test WASM implementation, or build UI components.

---

## 1. Prerequisites
Ensure your local host machine has the following tools installed:
*   **Node.js**: v18.x or heavily recommended **v20+ LTS**.
*   **Package Manager**: `pnpm` (RetroVault utilizes strict monorepo workspace caching. Install via `npm install -g pnpm`).
*   **Git**: For version control management.

## 2. Initial Setup Steps

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/retrovault.git
cd retrovault
```

### Step 2: Install Workspace Dependencies
Utilize `pnpm` to install dependencies across all internal monorepo packages simultaneously:
```bash
pnpm install
```

### Step 3: Run the Development Server
Because the project uses Turborepo running Vite underneath, initializing the entire suite is done with a single command:
```bash
pnpm run dev
```

This will concurrently compile the WASM cores inside `packages/core` and launch the UI frontend inside `apps/web`. The local server is typically exposed at `http://localhost:5173`.

> ⚠️ **Critical Note on Security Contexts**: 
> Advanced browser APIs like `SharedArrayBuffer` (for threading) and Origin Private File System (`OPFS`) demand a **Secure Context**. This means you must access the app via `http://localhost` or a valid `https://` domain. Using an internal IP like `http://192.168.1.5` without custom HTTPS certs will cause the APIs to wildly fail.

---

## 3. How the Code Operates (The Mental Model)

To orient yourself inside the codebase, here is the chronological boot flow of the application:

1.  **`apps/web/src/main.tsx`**: The main entry point. Initializes React/Svelte and Mounts the Virtual Shell components.
2.  **`apps/web/src/components/Vault.tsx`**: Triggers a query to IndexedDB (via `packages/db`) to fetch all saved games and visualizes the grid.
3.  **`apps/web/src/workers/emulation.worker.ts`**: The completely isolated sub-thread where the `libretro` WASM core lives and breathes.
4.  **The Communication Bridge**: 
    *   User clicks "Play Pokemon" in the Vault UI.
    *   UI sends a `postMessage('INIT_GAME', fileRef)` to the emulation Worker.
    *   Worker intercepts it, pulls the ROM from OPFS, and runs the emulator CPU loops.
    *   Worker constantly pushes raw video pixel data (ArrayBuffers) back to the UI thread's `<canvas>` tag for rendering.

## 4. Building for Production

To test the application exactly as a user will see it (including evaluating the Progressive Web App Service Worker offline caching functionality), you must run a production build locally:

```bash
# 1. Build all packages and output static files
pnpm run build

# 2. Start a local static file server simulating production
pnpm run preview
```

### Validating Offline Support
1. Run `pnpm run preview`.
2. Open the browser and visit the local port.
3. Open DevTools -> Network Tab -> Change throttling to "Offline".
4. Refresh the page. The application should load entirely from the Service Worker cache, and local gameplay should continue flawlessly.
