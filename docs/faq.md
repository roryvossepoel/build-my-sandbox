# FAQ

## What is Windows Sandbox Builder?

A generator for repeatable Windows Sandbox configurations. It combines `.wsb` settings, application manifests and PowerShell bootstrap logic into downloadable Sandbox configurations.

## Is the generated Sandbox persistent?

No. Normal Windows Sandbox contents are discarded when the Sandbox is closed. Persistence must be provided explicitly through mapped host folders or external services.

## Why generate a runner.ps1 instead of putting everything in the WSB file?

The `.wsb` format is excellent for Sandbox configuration, but non-trivial application provisioning is much easier to read, test and maintain in PowerShell.

## Can profiles have dependencies?

Applications can. A profile selects applications; the generator resolves their declared dependencies. For example, selecting CMTrace Open automatically adds WebView2.

## Can a mapped folder be read-only?

Yes, and read-only should be preferred when the Sandbox only needs to consume host files.

## Why does the reference runner not use Expand-Archive?

Some localized Windows Sandbox images can have issues loading the `Microsoft.PowerShell.Archive` localization resources. The Sandbox Elite reference implementation uses `System.IO.Compression.ZipFile` instead to avoid that dependency.

## Does Windows Sandbox contain WinGet?

Do not assume it does. The builder should either provision WinGet explicitly when required or use direct publisher download sources.

## Can I add my own application?

Yes. The goal is for most applications to be added by creating a JSON manifest under `apps/` and, where necessary, extending the supported installer strategies.

## Will the website need an account?

The core generator is intended to run client-side without accounts, a database or a backend.
