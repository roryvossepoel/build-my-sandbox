# Windows Sandbox Builder

Build reproducible, disposable Windows environments from a simple configuration.

**Windows Sandbox Builder** is an open-source project for generating Windows Sandbox (`.wsb`) configurations and PowerShell bootstrap scripts. The goal is simple: choose the Sandbox settings and tools you need, generate the files, and launch a clean environment built for that purpose.

> **Project status:** early development / v0.1 foundation.

## Vision

The public website will provide a friendly client-side builder:

1. Choose a preset or start from scratch.
2. Configure Windows Sandbox settings.
3. Select applications and useful Windows tweaks.
4. Review dependencies and the generated configuration.
5. Download a `.wsb` file or a complete bundle.

No account, database, or backend should be required for the core generator.

## Planned presets

- **Minimal** — a clean Sandbox with only the selected Windows settings.
- **App Packaging** — tools for installer inspection, packaging and troubleshooting.
- **Sandbox Elite** — the full Modern Workplace troubleshooting toolbox and reference implementation.

## Repository structure

```text
windows-sandbox-builder/
├── apps/               # Declarative application manifests
├── profiles/           # Reusable Sandbox presets
├── schemas/            # JSON schemas for manifests and profiles
├── templates/          # WSB and PowerShell templates
├── src/                # Generator / future website source
├── docs/               # Documentation and FAQ
├── examples/           # Working examples and reference implementations
└── .github/workflows/  # Validation and CI
```

## Design principles

- **Windows Sandbox as code** — configurations should be repeatable and shareable.
- **Apps are data** — adding an app should normally mean adding a manifest, not changing the UI.
- **Dependencies are explicit** — for example CMTrace Open can declare WebView2 as a dependency.
- **Client-side generation** — generated configurations stay in the browser unless the user chooses to download or share them.
- **Readable output** — generated `.wsb` and PowerShell should remain understandable and editable.
- **Safe defaults** — networking, clipboard, mapped folders and other host-integration features should be clearly visible to the user.

## Initial application catalog

The first catalog is based on the tools used in the Sandbox Elite reference environment, including:

- 7-Zip
- Notepad++
- PowerShell 7
- Visual Studio Code
- Process Explorer
- Process Monitor
- PsTools / PsExec
- Regshot
- UninstallView
- IconsExtract
- Orca
- CMTrace Classic
- CMTrace Open
- Microsoft Edge WebView2 Runtime (dependency)

## Contributing

Contributions will be welcome for new app manifests, presets, documentation, validation improvements and generator features. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Windows Sandbox is disposable and isolated, but it is not a universal malware-analysis boundary. Networking, clipboard redirection and mapped folders can intentionally create paths between the host and Sandbox. See [docs/security.md](docs/security.md) before using untrusted content.

## License

MIT. See [LICENSE](LICENSE).
