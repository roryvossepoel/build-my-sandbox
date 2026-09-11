# Security Policy

## Supported versions

Build My Sandbox is a small open-source project that evolves quickly. Security fixes are applied to the current `main` branch and, after the first stable release, to the latest published release where practical.

Older generated bundles are not serviced independently. If a security fix affects generated output, create a fresh Sandbox configuration with the updated builder.

## Reporting a vulnerability

Please do not publish exploit details, credentials or sensitive reproduction data in a public issue.

If GitHub offers **Report a vulnerability** for this repository, use that private reporting flow from the repository's **Security** tab. Include:

- the affected Build My Sandbox page, generator feature or generated output;
- clear reproduction steps;
- the security impact you observed;
- a minimal proof of concept when needed;
- any relevant browser and Windows version information.

If private vulnerability reporting is not available, open a public issue containing only enough non-sensitive information to establish contact and indicate that the report contains security-sensitive details.

## Security model

Build My Sandbox generates Windows Sandbox configuration and PowerShell locally in the browser. The generated Sandbox can intentionally enable networking, clipboard redirection, mapped folders and software installation. These capabilities affect the isolation boundary and should be reviewed before use.

See [docs/security.md](docs/security.md) for the project's Windows Sandbox security guidance.

## Third-party software

Application manifests download software from third-party vendors. Build My Sandbox does not control those packages, download endpoints or release processes. Review generated PowerShell and vendor sources when using the project in a sensitive environment.
