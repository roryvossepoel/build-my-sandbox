# Contributing

Thanks for helping improve Windows Sandbox Builder.

The project is intentionally designed so that many contributions can be made without changing the generator itself.

## Good first contributions

- Add a new application manifest under `apps/`.
- Add or improve a profile under `profiles/`.
- Improve documentation or FAQ entries.
- Add validation tests for `.wsb`, manifests or generated PowerShell.
- Improve architecture detection or dependency handling.

## Application manifests

Application definitions belong in `apps/<id>.json` and must validate against `schemas/app.schema.json`.

Please prefer:

- official vendor download locations;
- evergreen URLs where the publisher provides them;
- explicit architecture support;
- silent installation options;
- deterministic executable/detection paths;
- declared dependencies rather than hidden install logic.

Avoid repackaging or mirroring third-party binaries in this repository unless redistribution is explicitly allowed.

## Profiles

Profiles belong in `profiles/<id>.json` and must validate against `schemas/profile.schema.json`.

Profiles should describe a clear use case rather than simply selecting every available option.

## Pull requests

Keep changes focused. Explain what the change adds, how it was tested in Windows Sandbox and any architecture or dependency limitations.

## Security

Do not commit credentials, secrets, tokens or private download URLs. Treat all generated Sandbox configurations as code that may run elevated inside the Sandbox.
