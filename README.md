# Build My Sandbox

**Build a Windows playground worth playing in.**

Build My Sandbox is an open-source, browser-based builder for Windows Sandbox. Pick the tools and Sandbox features you need, inspect the generated `.wsb` and PowerShell, then download a ready-to-use Sandbox configuration or a complete bundle.

Website: https://buildmysandbox.com/

## What it does

1. Start empty and pick the tools you need from the Toy Box.
2. Configure Windows Sandbox features such as memory, clipboard, vGPU and host-folder sharing.
3. Optionally enable targeted Sandbox fixes when a host needs them.
4. Review the generated WSB and PowerShell before launch.
5. Download a `.wsb` file or the complete bundle.
6. Follow provisioning live in the Build My Sandbox Toolbox inside Windows Sandbox.

The core generator runs client-side. No account, database or application backend is required.

## Toolbox experience

Generated Sandboxes include the Build My Sandbox Toolbox. It opens automatically while provisioning runs and shows each tool or fix as Pending, Installing, Ready or Failed.

After provisioning, supported tools expose useful actions directly in the Toolbox. Examples include:

- start an installed or portable application;
- open Chrome or Firefox in a private browsing mode;
- launch PowerShell 7 as SYSTEM when PsExec is part of the build;
- launch Command Prompt or Windows PowerShell 5 as SYSTEM through PsExec;
- retry a failed provisioning step without rebuilding the entire Sandbox.

Dependencies such as Microsoft Edge WebView2 Runtime stay visible for transparency, but do not receive a launch button when there is nothing useful to start.

## Windows Sandbox knowledge

The website FAQ includes Windows Sandbox basics, Toolbox behavior, troubleshooting notes and links to the official Microsoft Learn documentation. Microsoft documentation remains the source of truth for Windows Sandbox behavior and supported configuration settings.

See the [FAQ](https://buildmysandbox.com/faq.html) and the [Changelog](https://buildmysandbox.com/changelog.html).

## Repository structure

```text
build-my-sandbox/
├── apps/               # Declarative application manifests
├── profiles/           # Sandbox configuration data
├── schemas/            # JSON schemas for manifests and profiles
├── templates/          # WSB and PowerShell templates
├── src/                # Website, generator and Toolbox UI
├── docs/               # Additional documentation
├── examples/           # Reference examples
└── .github/workflows/  # Validation and GitHub Pages deployment
```

## Design principles

- **Windows Sandbox as code** — configurations should be repeatable and shareable.
- **Apps are data** — adding a tool should normally mean adding or updating a manifest rather than changing the UI.
- **Dependencies are explicit** — for example CMTrace Open declares WebView2 as a dependency.
- **Architecture-aware where needed** — packages can adapt to x64 and ARM64 when vendors publish different installers.
- **Client-side generation** — generated configurations stay in the browser unless the user chooses to download or share them.
- **Readable output** — generated `.wsb` and PowerShell remain inspectable and editable.
- **Useful after provisioning** — the Toolbox exposes sensible launch and recovery actions.
- **Safe defaults** — networking is required for startup downloads; host integrations such as clipboard and mapped folders remain explicit choices.

## Application catalog

The catalog currently includes tools such as:

- 7-Zip
- CMTrace Classic
- CMTrace Open
- Google Chrome
- IconsExtract
- Mozilla Firefox
- Notepad++
- Orca MSI Editor
- PowerShell 7
- Process Explorer
- Process Monitor
- PsExec
- Regshot
- Sigcheck
- UninstallView
- Visual Studio Code
- Microsoft Edge WebView2 Runtime (dependency only)

## Contributing

Contributions are welcome for app manifests, launch actions, documentation, validation improvements and generator features. See [CONTRIBUTING.md](CONTRIBUTING.md).

For a missing application, the website links directly to the repository's Tool Request issue form.

## Security

Windows Sandbox is disposable and isolated, but it is not a universal malware-analysis boundary. Networking, clipboard redirection and mapped folders can intentionally create paths between the host and Sandbox.

Read [SECURITY.md](SECURITY.md) for vulnerability reporting and [docs/security.md](docs/security.md) for the project's Sandbox security model.

## License

MIT. See [LICENSE](LICENSE).
