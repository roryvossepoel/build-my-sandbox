# Build My Sandbox — Tool Validation Matrix

Use this checklist to validate every tool in a **fresh Windows Sandbox session** before treating the catalog as production-ready.

## Status legend

- ⬜ Not tested
- 🟡 Partially tested / needs investigation
- ✅ Passed
- ❌ Failed

## Per-tool test flow

Run each tool separately first.

1. Start with an empty sandbox configuration.
2. Add **one tool only**.
3. Generate the `.wsb` file and bundle.
4. Review the generated `.wsb` and PowerShell bootstrap for obvious errors.
5. Start a **fresh Windows Sandbox** with the generated `.wsb`.
6. Confirm the bootstrap starts without manual intervention.
7. Confirm the download succeeds.
8. Confirm installation/extraction completes without errors.
9. Verify the expected executable/file is present.
10. Launch the tool and confirm it actually works.
11. Verify required dependencies are installed automatically where applicable.
12. Record any installer UI, restart requirement, elevation prompt, SmartScreen prompt or first-run dialog.
13. Close Windows Sandbox completely before testing the next tool.

> A successful download is **not** a pass. The application must install/extract correctly and launch successfully inside Windows Sandbox.

## Tool matrix

| Status | Tool | Manifest | Download | Install / Extract | Launch | Dependencies | Silent / unattended | Notes |
|---|---|---|---|---|---|---|---|---|
| ⬜ | 7-Zip | `apps/7zip.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | CMTrace Classic | `apps/cmtrace-classic.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | CMTrace Open | `apps/cmtrace-open.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Firefox | `apps/firefox.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Google Chrome | `apps/google-chrome.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | IconsExtract | `apps/iconsextract.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Notepad++ | `apps/notepadplusplus.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Orca | `apps/orca.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | PowerShell 7 | `apps/powershell7.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Process Explorer | `apps/process-explorer.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Process Monitor | `apps/procmon.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | PsTools | `apps/pstools.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Regshot | `apps/regshot.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Sigcheck | `apps/sigcheck.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | UninstallView | `apps/uninstallview.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | Visual Studio Code | `apps/vscode.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ⬜ | WebView2 Runtime | `apps/webview2.json` | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |

## What to capture when a tool fails

For a failed test, record at least:

- Tool name
- Date/time
- Generated profile or `.wsb` filename
- Stage that failed: **download / install / extract / dependency / launch**
- Exit code, if available
- PowerShell error text
- Download URL used
- Expected executable path
- Actual files created
- Whether retrying in a new Sandbox changes the result
- Whether the same command works manually inside Sandbox

This should make it possible to determine quickly whether the problem is in the manifest, download source, silent-install arguments, dependency handling or generated runner.

## Combination tests

After every individual tool passes, test a few realistic combinations in a fresh Sandbox:

| Status | Combination | Goal | Notes |
|---|---|---|---|
| ⬜ | Chrome + 7-Zip + Notepad++ | Basic multi-tool installation | |
| ⬜ | PowerShell 7 + Visual Studio Code + WebView2 | Developer stack / dependency behavior | |
| ⬜ | Process Explorer + Process Monitor + PsTools + Sigcheck | Sysinternals-style troubleshooting stack | |
| ⬜ | CMTrace + Orca + Regshot + UninstallView | Application packaging / troubleshooting stack | |
| ⬜ | Sandbox Elite preset | Full end-to-end preset validation | |

For combination tests, verify that one failed tool does not silently prevent later tools from being processed. If the intended behavior is fail-fast, verify that the error shown is clear enough to identify the failing tool.

## Final release criteria

The catalog is ready for a release when:

- Every published tool has passed download, installation/extraction and launch validation.
- Dependencies are resolved automatically and in the correct order.
- No installer requires unexpected user interaction.
- A failed installation produces a useful error instead of appearing successful.
- At least one multi-tool build and every published preset have been tested end-to-end.
- Generated `.wsb` and PowerShell output remain readable and reviewable.
