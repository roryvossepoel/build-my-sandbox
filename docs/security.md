# Security

Windows Sandbox is disposable and isolated from the host, but configuration choices can deliberately create communication paths between the two environments.

## Networking

When networking is enabled, software in the Sandbox can access the network. Do not assume that opening an unknown file in Windows Sandbox automatically makes network activity safe.

## Clipboard redirection

Clipboard redirection makes copy/paste convenient but also creates a data path between host and Sandbox. Disable it for higher-isolation scenarios.

## Mapped folders

Mapped folders expose host files inside the Sandbox. Prefer read-only mappings unless the Sandbox must write output back to the host.

A writable mapped folder significantly reduces the disposable boundary: software running in the Sandbox can modify content on the host through that mapping.

## Credentials

Avoid signing into privileged services with sensitive credentials inside a Sandbox that is being used to inspect untrusted software.

## Elevated bootstrap scripts

Generated bootstrap scripts may install software or change Windows settings inside the Sandbox. Review generated PowerShell before running profiles from sources you do not trust.

## Malware analysis

Windows Sandbox is useful for many testing and inspection scenarios, but this project does not claim that it is an appropriate containment boundary for every malware-analysis workflow.
