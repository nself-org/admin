# Vibe-Code Web IDE

Vibe-Code is a browser-based AI pair-programming IDE built into the ɳSelf Admin UI at
`http://localhost:3021/vibe`. Describe a feature in plain language and it generates the complete
vertical stack: a SQL migration, Hasura permissions, and a React UI component, in one AI turn.

## Requirements

- ɳSelf Admin running at `http://localhost:3021`
- `NSELF_VIBE_ENABLED=true` in your `.env` file
- Local ɳSelf Docker stack running (`nself start`)
- For full AI generation: vibe_api CS_2 on port 8002 (`NSELF_VIBE_PORT=8002`)
- Without vibe_api: stub mode generates a realistic template for UI development

## Quick Start

1. Set `NSELF_VIBE_ENABLED=true` in `admin/.env`
2. Open `http://localhost:3021/vibe`
3. Click **local** to start a session
4. Type a feature request, for example:
   ```
   Add a comments table with user_id and body, visible only to the comment owner
   ```
5. Review the generated migration SQL, Hasura permissions, and React component
6. Click **Apply Changes** and confirm in the dialog

## Interface

The IDE is a 4-panel layout:

| Panel       | Keyboard | Purpose                                                                           |
| ----------- | -------- | --------------------------------------------------------------------------------- |
| Chat        | Alt+1    | Feature request input and conversation history                                    |
| Diff Viewer | Alt+2    | Monaco editor showing the generated code per layer (Migration / Permissions / UI) |
| File Tree   | Alt+3    | Preview of all generated files                                                    |
| Terminal    | Alt+4    | Apply output stream and apply button                                              |

## Layer Tabs

Within the Diff Viewer, use **Left/Right arrow keys** to switch between:

- **Migration SQL**, the `CREATE TABLE` / `CREATE INDEX` statements
- **Permissions**, the Hasura metadata JSON for row-level access control
- **UI Files**, the generated React (TSX) component(s)

## Apply Pipeline

1. Generate a feature (30 seconds or less for a typical CRUD feature on local Ollama)
2. Click **Apply Changes** in the Terminal panel
3. A 3-second countdown starts, review the diff before it completes
4. Click **Apply** after the countdown
5. The pipeline runs: SQL migration via `nself migrate apply`, then Hasura permissions, then file write

### Production Guard

To apply against a production stack:

1. Set `NSELF_VIBE_TARGET_ENV=prod` in your admin environment
2. Start a **prod** session
3. When applying, type `confirm-prod` in the confirmation dialog
4. Click Apply

The Apply button stays disabled until the phrase is typed exactly.

## Environment Variables

All vars go in `admin/.env`:

| Variable                            | Default   | Description                                      |
| ----------------------------------- | --------- | ------------------------------------------------ |
| `NSELF_VIBE_ENABLED`                | `true`    | Enable Vibe-Code IDE                             |
| `NSELF_VIBE_PORT`                   | `8002`    | Port for vibe_api CS_2                           |
| `NSELF_VIBE_MAX_PROMPT_TOKENS`      | `16000`   | Max tokens per generation                        |
| `NSELF_VIBE_MAX_SESSIONS_PER_USER`  | `3`       | Max concurrent sessions                          |
| `NSELF_VIBE_AI_PROVIDER`            | `claw-ai` | AI provider: `claw-ai` or `ollama`               |
| `NSELF_VIBE_TARGET_ENV`             | `local`   | Default environment: `local`, `staging`, `prod`  |
| `NSELF_VIBE_APPLY_REQUIRES_CONFIRM` | `true`    | Always require confirmation before apply         |
| `NSELF_VIBE_UI_FRAMEWORK`           | `react`   | Generated UI framework: `react` or `flutter-web` |

## Security

- SQL migrations run only through `nself migrate apply`, no direct SQL execution endpoint
- Generated DDL is validated: only `CREATE TABLE` and `CREATE INDEX` are allowed in CRUD features
- Every apply logs to `np_audit_log` with the diff snapshot, user ID, environment, and timestamp
- Rate limit: max 1 apply per 30 seconds per generation
- Cross-tenant isolation: the vibe service role is scoped to the authenticated tenant

## Accessibility

- **Keyboard navigation:** Alt+1..4 switches focus between panels
- **High contrast:** click "High Contrast" in the header; state persists to localStorage
- **Screen reader:** `aria-live="polite"` on the chat stream; `role="status"` for AI status updates
- **Diff viewer:** added/removed lines carry text labels, not color alone
- All panels have visible `<h2>` headings and `role="region"` landmarks

## Architecture

```
Browser (localhost:3021/vibe)
  └── Next.js App Router page (src/app/vibe/page.tsx)
        ├── ChatPanel     — prompt input + streaming chat
        ├── DiffViewer    — Monaco editor with layer tabs
        ├── FileTree      — generated files preview
        └── TerminalPanel — apply output + confirm dialog
              │
              ▼
        Next.js API routes (src/app/api/vibe/)
              │
              ▼
        vibe_api CS_2 (port 8002) — Go VibeAgent
              │
              ├── MigrationAgent → nself migrate apply
              ├── PermissionsAgent → Hasura metadata API
              └── UIAgent → React/Flutter Web codegen
```

See also: `web/docs/content/vibe-code/getting-started.mdx`, `web/docs/content/vibe-code/local-mode.mdx`
