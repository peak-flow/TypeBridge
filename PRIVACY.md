# Privacy Policy for TypeBridge

Last updated: June 26, 2026

TypeBridge does not collect, transmit, sell, rent, or share user data.

## Data Stored Locally

TypeBridge stores saved snippets and typing-speed settings locally in the user's
Chrome profile using `chrome.storage.local`.

This data stays on the user's device. TypeBridge does not send snippets,
settings, or usage data to any server.

## Data Collection

TypeBridge does not collect personal information, browsing history, analytics,
usage metrics, or remote desktop content.

TypeBridge does not use cookies, tracking pixels, analytics SDKs, advertising
SDKs, or telemetry services.

## Data Sharing and Sale

TypeBridge does not sell user data.

TypeBridge does not share user data with third parties.

## Permissions

TypeBridge requests only the permissions needed for its single purpose: typing
user-saved snippets into a user-selected web Remote Desktop tab.

- `storage` is used to save snippets and settings locally.
- `sidePanel` is used to display the TypeBridge user interface.
- `tabs` is used to identify the active tab and avoid browser-internal pages.
- `debugger` is used to send trusted keyboard events to the selected tab through
  the Chrome DevTools Protocol.

The `debugger` permission is not used to inspect network traffic, collect page
content, modify page code, or monitor browsing activity.

## Remote Code

TypeBridge does not use remote code. All JavaScript files used by the extension,
including the bundled YAML parser, are included in the extension package.

TypeBridge does not load scripts from external URLs, use `eval`, or execute
remotely hosted code.

## User Control

Users can delete snippets from the TypeBridge side panel at any time.

Users can export or import snippets manually. Import and export actions are
initiated by the user and are handled locally.

## Contact

For questions about this privacy policy, open an issue in the TypeBridge GitHub
repository:

https://github.com/peak-flow/TypeBridge
