# Getting started

Build My Sandbox treats Windows Sandbox as a small, disposable environment defined by code.

## Requirements

Windows Sandbox must be available and enabled on the Windows host. Generated configurations use the `.wsb` file format supported by Windows Sandbox.

For installation guidance and supported configuration options, use the Microsoft Learn links collected in the website FAQ.

## Core concepts

### Profiles

A profile describes the desired Sandbox: memory, host-integration settings, selected applications and optional features. Profiles are stored under `profiles/`.

### Application manifests

Each selectable tool is described by a manifest under `apps/`. The generator uses these manifests to build installation instructions, resolve dependencies and expose launch actions.

### Generated output

Build My Sandbox can generate:

```text
My-Sandbox.wsb
```

or a complete bundle containing:

```text
My-Sandbox/
├── My-Sandbox.wsb
├── runner.ps1
└── configuration.json
```

The generated `.wsb` contains the bootstrap required to start provisioning inside Windows Sandbox. `runner.ps1` is included separately in the bundle so it can be reviewed or customized.

## Provisioning experience

When a generated Sandbox starts, Build My Sandbox shows a provisioning window with per-step states such as Pending, Installing, Ready and Failed. Supported tools can expose launch actions that become Start menu shortcuts and buttons in the provisioning UI.

## Development status

Build My Sandbox is actively developed. The website, generator, app catalog, provisioning UI and GitHub Pages deployment are all part of the repository.
