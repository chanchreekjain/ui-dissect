# Privacy Policy for UI Dissect

Last updated: September 5, 2026

UI Dissect ("the extension", "we", "us") is committed to protecting your privacy. This Privacy Policy outlines our practices regarding data collection, usage, and disclosure.

## 1. No Data Collection
UI Dissect does not collect, store, transmit, or sell any personal data, browsing history, keystrokes, or website contents.

## 2. Local-Only Execution
All styling extraction, DOM analysis, and code generation processes occur strictly and entirely on your local device within your browser session. No data is ever transmitted to external servers, APIs, or third-party tracking services.

## 3. Storage Usage
UI Dissect utilizes Chrome's local storage API (`chrome.storage.local`) exclusively to save user-defined tool preferences, such as:
- Your default preferred code export format (e.g., Tailwind CSS vs. Scoped CSS).

This preference data remains strictly on your local machine and is never synced or transmitted externally.

## 4. Permissions
The extension requests only the minimum permissions required to perform its core functionality:
- `activeTab`: Required to inspect element styles and render the HUD overlay only when the user explicitly activates the tool.
- `scripting`: Required to inject the content script into open tabs when triggered by the user.
- `storage`: Required to save local UI preferences.

## 5. Third-Party Services
UI Dissect contains no third-party analytics, tracking libraries, ads, or telemetry.

## 6. Contact
If you have any questions about this Privacy Policy, you can open an issue on GitHub:
https://github.com/chanchreekjain/ui-dissect
