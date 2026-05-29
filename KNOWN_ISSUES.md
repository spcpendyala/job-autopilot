# Known Browser Console Warnings

## "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"

**Source:** Third-party browser extension (LastPass, Grammarly, 1Password, etc.)
**Not from:** Job AutoPilot code

Job AutoPilot only reads `window.chrome?.runtime?.id` (a single property read, no listeners).
To confirm: open in Chrome incognito mode with all extensions disabled — the warning disappears.

## SSL handshake errors in Nginx log (`bad key share`)

**Source:** Automated scanners and bots probing port 443 with old TLS configs.
**Not from:** Legitimate user traffic. Safe to ignore.
