# FAQ

## What is Build My Sandbox?

Build My Sandbox is a browser-based generator for repeatable Windows Sandbox configurations. It combines `.wsb` settings, application manifests and PowerShell provisioning logic into downloadable Sandbox configurations.

## Is the generated Sandbox persistent?

No. Normal Windows Sandbox contents are discarded when the Sandbox is closed. Persistence must be provided explicitly through mapped host folders or external services.

## Why generate a runner.ps1 instead of putting everything in the WSB file?

The `.wsb` format is excellent for Sandbox configuration, but non-trivial application provisioning is much easier to read, test and maintain in PowerShell. The generated `.wsb` contains the bootstrap required to start provisioning, while the bundle also exposes `runner.ps1` separately for inspection and customization.

## Can applications have dependencies?

Yes. A profile selects applications and the generator resolves their declared dependencies. For example, selecting CMTrace Open automatically adds WebView2.

## Can a mapped folder be read-only?

Yes, and read-only should be preferred when the Sandbox only needs to consume host files. Build My Sandbox maps Host Downloads read-only by default and exposes write access as a separate option.

## Why does the runner not use Expand-Archive?

Some localized Windows Sandbox images can have issues loading the `Microsoft.PowerShell.Archive` localization resources. Build My Sandbox uses `System.IO.Compression.ZipFile` instead to avoid that dependency.

## Does Windows Sandbox contain WinGet?

Do not assume it does. Build My Sandbox uses direct publisher download sources unless a tool explicitly requires another installation strategy.

## Can I add my own application?

Yes. Most tools should be added by creating a JSON manifest under `apps/`. Manifests can define installation, detection, dependencies and one or more launch actions.

## Will the website need an account?

No account is required for the core builder. Generation happens client-side without a database or application backend.

## Where can I learn more about Windows Sandbox itself?

The website FAQ links to the official Microsoft Learn documentation for Windows Sandbox concepts, installation, `.wsb` configuration, CLI usage and policy management.
