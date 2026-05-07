# Packaging

See `../plan.md` for the full packaging roadmap.

## Windows installer target

The desktop package now has an explicit NSIS packaging command:

```powershell
pnpm --dir apps/desktop package:windows
```

This maps to:

```powershell
tauri build --bundles nsis
```

The Tauri config targets the NSIS installer and uses `currentUser` install mode.
This follows the Tauri v2 Windows installer guidance that Windows apps can be
distributed as NSIS setup executables or MSI installers. NSIS is the safer first
target here because this repo is not ready for WiX/MSI release handling or
signing review.

## Sidecar launch status

The Tauri sidecar service can now use a configured local Python sidecar bridge
without requiring a manual `WORKTRACE_SIDECAR_URL` in the normal code path:

- `WORKTRACE_SIDECAR_PORT` selects the localhost port for health, event, and
  recorder-control requests.
- `WORKTRACE_SIDECAR_BIN` selects a local sidecar executable/script to start.
  If it is absent, the desktop looks for a packaged `worktrace-local-agent`
  executable next to the desktop app or under a sibling `sidecars/` folder.
- `WORKTRACE_SIDECAR_ARGS` passes simple whitespace-separated arguments without
  invoking a shell.
- `WORKTRACE_DB_PATH` can point the Python sidecar at a specific SQLite file;
  session artifacts are stored under the database parent by the current Python
  session service.

When a configured sidecar binary is started, Tauri sets
`WORKTRACE_SIDECAR_HOST=127.0.0.1`, sets `WORKTRACE_SIDECAR_PORT`, suppresses
sidecar stdio, inherits the local process environment for DB path configuration,
and can stop the managed process. Missing or unhealthy sidecars still return
safe missing/unhealthy states instead of panicking.

Successful local builds create an ignored artifact like:

```txt
apps/desktop/src-tauri/target/release/bundle/nsis/WorkTrace AI_0.1.0_x64-setup.exe
```

## Current limits

- The installer is not code-signed.
- The installer does not bundle the Python sidecar yet.
- The configured sidecar launch path exists, but full installer integration for
  a packaged Python sidecar artifact is not complete yet.
- The installer does not bundle local AI models.
- The app is still a desktop shell and preview UI.
- There is no updater configuration.
- There is no release channel or production distribution process.

## Verification

Run this before presenting packaging status:

```powershell
pnpm --dir apps/desktop typecheck
pnpm --dir apps/desktop lint
pnpm --dir apps/desktop test
pnpm --dir apps/desktop build
pnpm --dir apps/desktop package:windows
```

If the packaging command fails because local NSIS/WebView2/build tools are
missing, report that as a packaging environment blocker. Do not publish a release
claim without a successful local packaging command and reviewed artifact.
