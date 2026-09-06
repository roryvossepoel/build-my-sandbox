# Build My Sandbox

**Build a Windows playground worth playing in.**

Build My Sandbox is an open-source, browser-based builder for Windows Sandbox. Pick the tools and Sandbox features you need, inspect the generated `.wsb` and PowerShell, then download a ready-to-use Sandbox configuration or a complete bundle.

Website: https://buildmysandbox.com/

## What it does

1. Start empty or choose a preset.
2. Pick tools from the Toy Box.
3. Configure Windows Sandbox features such as memory, networking, clipboard, vGPU and host-folder sharing.
4. Optionally enable targeted Sandbox fixes when a host needs them.
5. Review the generated WSB and PowerShell before launch.
6. Download a `.wsb` file or the complete bundle.

The core generator runs client-side. No account, database or application backend is required.

## Tooling experience

Generated Sandboxes include a Build My Sandbox provisioning window that shows progress per tool and fix. Supported tools can also expose launch actions that become shortcuts in the Sandbox Start menu and actions in the provisioning UI.

Examples include:

- launch an installed or portable application;
- open a tool folder;
- launch PowerShell as administrator;
- open the Build My Sandbox log in CMTrace;
- open PsExec Command Prompt / PowerShell / SYSTEM sessions.

## Windows Sandbox knowledge

The website FAQ includes Windows Sandbox basics, troubleshooting notes and links to the official Microsoft Learn documentation. Microsoft documentation remains the source of truth for Windows Sandbox behavior and supported configuration settings.

## Repository structure

```text
build-my-sandbox/
├── apps/               # Declarative application manifests
├── profiles/           # Reusable Sandbox presets
├── schemas/            # JSON schemas for manifests and profiles
├── templates/          # WSB and PowerShell templates
├── src/                # Website, generator and provisioning UI
├── docs/               # Additional documentation
├── examples/           # Reference examples
└── .github/workflows/  # Validation and GitHub Pages deployment
```

## Design principles

- **Windows Sandbox as code** — configurations should be repeatable and shareable.
- **Apps are data** — adding a tool should normally mean adding or updating a manifest rather than changing the UI.
- **Dependencies are explicit** — for example CMTrace Open can declare WebView2 as a dependency.
- **Client-side generation** — generated configurations stay in the browser unless the user chooses to download or share them.
- **Readable output** — generated `.wsb` and PowerShell remain inspectable and editable.
- **Useful after provisioning** — tools should expose sensible launch actions or shortcuts when possible.
- **Safe defaults** — networking, clipboard, mapped folders and other host-integration features are visible and intentional.

## Application catalog

The catalog currently includes tools such as:

- 7-Zip
- Notepad++
- PowerShell 7
- Visual Studio Code
- Google Chrome
- Mozilla Firefox
- Process Explorer
- Process Monitor
- PsTools / PsExec
- RegShot
- UninstallView
- IconsExtract
- Orca MSI Editor
- CMTrace Classic
- CMTrace Open
- Microsoft Edge WebView2 Runtime (dependency only)

## Contributing

Contributions are welcome for app manifests, launch actions, presets, documentation, validation improvements and generator features. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Windows Sandbox is disposable and isolated, but it is not a universal malware-analysis boundary. Networking, clipboard redirection and mapped folders can intentionally create paths between the host and Sandbox. See [docs/security.md](docs/security.md) before using untrusted content.

## License

MIT. See [LICENSE](LICENSE).
