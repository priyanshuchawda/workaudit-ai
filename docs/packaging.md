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

Successful local builds create an ignored artifact like:

```txt
apps/desktop/src-tauri/target/release/bundle/nsis/WorkTrace AI_0.1.0_x64-setup.exe
```

## Current limits

- The installer is not code-signed.
- The installer does not bundle the Python sidecar yet.
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
