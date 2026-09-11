# Sandbox Elite

Sandbox Elite is the reference implementation used to prove Windows Sandbox Builder features in a real Windows Sandbox.

It demonstrates:

- a WPF toolbox UI with live provisioning status;
- application icons extracted from installed executables;
- hidden bootstrap console with the Toolbox kept in the foreground;
- Edge managed favorites and first-run policy configuration;
- custom Windows wallpaper;
- desktop and SYSTEM shortcuts;
- direct publisher downloads and portable applications;
- dependency handling for CMTrace Open and WebView2;
- ZIP extraction through `System.IO.Compression.ZipFile` for localized Sandbox compatibility;
- Process Monitor, Process Explorer, CMTrace Classic/Open, PowerShell 7, VS Code, Orca, Regshot and packaging utilities.

The current production-tested Sandbox Elite runner is the source for the `sandbox-elite` profile. As the generator engine matures, this example will be generated from manifests instead of maintained as a separate monolithic implementation.
