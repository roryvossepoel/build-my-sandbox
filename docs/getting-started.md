# Getting started

Windows Sandbox Builder treats a Windows Sandbox as a small, disposable environment defined by code.

## Requirements

Windows Sandbox must be available and enabled on the Windows host. Generated configurations use the `.wsb` file format supported by Windows Sandbox.

## Core concepts

### Profiles

A profile describes the desired Sandbox: memory, host-integration settings, selected applications and optional features. Profiles are stored under `profiles/`.

### Application manifests

Each selectable application is described by a manifest under `apps/`. The generator uses these manifests to build installation instructions and resolve dependencies.

### Generated output

The intended builder output is:

```text
My-Sandbox/
├── My-Sandbox.wsb
└── runner.ps1
```

For simple configurations the website may also offer a single `.wsb` that downloads its bootstrap script at launch.

## Development status

The repository currently contains the v0.1 data model and generator foundation. The interactive website will be built on top of these files.
