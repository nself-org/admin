# Output Viewer

The Output Viewer streams live CLI command output into the Admin UI via Server-Sent Events (SSE). You see the same output you would see in a terminal — in real time, in the browser.

---

## How It Works

1. Admin UI dispatches a CLI command (e.g., `nself build`).
2. The Admin backend spawns the CLI process and opens an SSE stream from its stdout/stderr.
3. The Output Viewer panel subscribes to the SSE stream and renders each line as it arrives.
4. When the CLI process exits, the stream closes and the Output Viewer shows exit code + elapsed time.

---

## Output Viewer Panel

The panel appears at the bottom of the relevant Admin zone (e.g., Build zone for `nself build`). It supports:

- **ANSI color codes** — nSelf CLI color-codes its output. The Output Viewer renders colors correctly.
- **Line-level buffering** — Each line appears as soon as it's flushed, not after the command finishes.
- **Search** — Filter output lines by keyword.
- **Copy** — Copy the full output to clipboard.
- **Persist** — Output is saved to LokiJS `activity_log` collection for the session so you can scroll back after the command finishes.

---

## Supported Commands

All CLI commands that produce streaming output are supported. Commands with interactive prompts (e.g., `nself init --wizard`) open a dedicated modal with a pseudo-TTY rather than the Output Viewer panel.

---

## Technical Detail

The SSE endpoint is exposed by the Admin backend:

```
GET /api/cli/stream?cmd=<base64-encoded-args>
Content-Type: text/event-stream
```

Each SSE event is a JSON payload:

```json
{ "line": "...", "stream": "stdout|stderr", "exitCode": null }
```

Final event when command exits:

```json
{ "line": null, "stream": null, "exitCode": 0, "elapsed": 1234 }
```
