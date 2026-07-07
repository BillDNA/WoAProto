# Piping live Claude Code sessions into a web hub + dispatch CLI

Handoff doc describing a working pattern (built and shipped in DynamicScrum) for two related but
independent features:

1. **Live Shells** — stream a running Claude Code session's activity into a web UI panel, in near
   real time, with zero changes to how the session is launched.
2. **Dispatch** — a server-side action that launches a new Claude Code session in a detached,
   human-visible terminal and claims some piece of work for it.

They share one transport (a single SSE stream) but are otherwise decoupled — dispatch launches,
watch observes. A session dispatch launches doesn't know or care that it's being watched, and the
watcher works equally well on a session started completely manually. Build them separately.

## 1. Live Shells: watch, don't wrap

The core decision: **do not spawn or wrap the Claude Code process.** Instead, tail the transcript
file Claude Code already writes for every session.

- Claude Code writes each session's full turn history to
  `~/.claude/projects/<slug>/<session-id>.jsonl`, one JSON object per line (`user` / `assistant` /
  `system` entries; assistant content is a list of blocks: `text`, `tool_use`, `thinking`).
- `<slug>` is the project's absolute path with every non-alphanumeric character replaced by `-`
  (case-insensitive fallback needed on Windows, where drive-letter casing isn't stable).
- A server-side watcher (`fs.watch` on that directory) finds the **newest** `.jsonl` file by mtime
  and does incremental byte-offset reads on it — track `offset` (bytes already consumed) and a
  `carry` buffer for a trailing partial line, keeping it as raw bytes (not decoded strings) so a
  multi-byte UTF-8 char split across two writes doesn't tear. Split on `0x0a`, JSON-parse whole
  lines only.
- A newer transcript file appearing supersedes the one being watched — a new session in the same
  project directory just takes over the live panel.
- Map each raw transcript entry to zero or more small "feed items" for the UI:
  - user prompt → `kind: 'user'`
  - assistant `text` block → `kind: 'claude'`
  - assistant `tool_use` block → `kind: 'tool'`, rendered as a terse one-liner (tool name + a short
    hint extracted from its input, not the full args)
  - `system` entries → `kind: 'system'`
  - drop `thinking` blocks and tool_result payloads entirely — noisy, not useful in a glance-view
  - drop harness-injected wrapper tags (a simple regex filtering things like `<command-...>`,
    `<system-reminder>`, etc.) so real user prompts aren't confused with harness plumbing
- Clip long text server-side for the compact row (e.g. 600 chars), but also carry the un-clipped
  original alongside it (`item.full`) so an "expand" view in the UI can show the whole thing without
  a second round trip.
- Push updates as `{ type: 'shell', session: { id }, reset, items: freshItemsSinceLastTick }` over
  the shared broadcast channel (see §3). `reset: true` when a new session starts or the transcript
  disappears (session ended) — client should clear and refetch a snapshot in that case.
- Also expose a plain snapshot endpoint (`GET /api/shell?tail=N`) returning `{ session, items }` —
  the last N feed items — for initial page load / panel mount, independent of the live stream.

### Windows-specific gotchas (worth carrying over as-is)
- Do nothing synchronous inside an `fs.watch` callback — the file may still be held open by the
  writer (EBUSY).
- A watcher on a directory that gets deleted emits an `'error'` event on Windows (not silently
  dropped like POSIX) — handle it explicitly, don't let it crash the process.
- `~/.claude/projects` may not exist yet on first run for a brand-new project. Poll for its
  existence on an interval (e.g. every 5s) until it appears, then start the `fs.watch`.

### Client rendering
- No terminal emulation needed — no xterm.js, no ANSI parsing. Plain rows in the UI, one per feed
  item, prefixed by kind (e.g. `YOU ▸`, `CLAUDE ▸`, `⚙`, `◆`).
- A tiny, dependency-free regex-based markdown formatter (just bold/italic/inline-code/heading/
  bullet) is enough to make assistant text readable inline — don't reach for a full markdown
  library just for this if one isn't already a hard dependency elsewhere in the app.
- Consume the live feed via a single shared `EventSource` for the whole app (not one per panel);
  route `type: 'shell'` events to their own piece of state so transcript increments don't trigger
  unrelated re-fetches of other app state.
- Guard against races: tag each snapshot fetch with a sequence number so a slow in-flight fetch
  can't clobber state already advanced by a faster SSE event that arrived after it was issued.
- On SSE reconnect, re-fetch the snapshot — any increments that arrived while disconnected are
  gone and only a fresh snapshot recovers them.
- Auto-scroll to follow the tail; render nothing if no session is currently live.

## 2. Dispatch: launch a detached, human-visible terminal

Dispatch is a server action, not a standalone CLI binary — triggered by an HTTP endpoint (button in
the UI, or an MCP tool call), which then spawns a real OS terminal window running the actual
`claude` CLI. The server never runs the session in-process or headlessly; a human can see and take
over what's happening.

- Enforce one active dispatch at a time per project (reject a second dispatch while one is active).
- On dispatch: do whatever your app's bookkeeping requires (e.g. mark the work item "in progress"),
  pick a model (a simple type→model lookup table is enough — don't build a policy engine), then
  spawn a terminal per OS:
  - **Windows:** write a per-dispatch temp `.cmd` script file (`%TEMP%/dispatch-<id>.cmd`)
    containing the `cd` + `claude --model <model> "<prompt>"` invocation, then
    `spawn('cmd', ['/c', 'start', 'title', 'cmd', '/k', scriptPath])`. Writing a script file instead
    of inlining the command avoids nested-quote mangling that breaks on Windows' argument parsing.
  - **macOS:** `osascript -e 'tell app "Terminal" to do script "..."'`.
  - **Linux:** `x-terminal-emulator -e bash -lc '...'`.
  - Use `.unref()` on the spawned process so the server doesn't wait on it or die if it exits.
- Keep the injected prompt minimal — a single slash-command/skill invocation naming the work item
  ID, letting that skill do its own orientation, rather than dispatch trying to construct a full
  context bundle itself.
- Broadcast `{ type: 'dispatch', id, at }` on launch and `{ type: 'release', id }` when the slot
  frees up (either explicitly, or automatically when the underlying work item is detected as
  closed).
- Status feedback loop, decoupled from the transcript watcher above: have the dispatched session's
  own tooling write a small plain-text status file at the project root (a simple pipe-delimited
  contract, e.g. `<context>|<item-id>|<state>`) on each state transition. The server watches that
  file and broadcasts `{ type: 'session', session }` on change — this is what should drive things
  like a colored border or state label in the UI, separate from the content feed. A Claude Code
  `statusLine` hook can read the same file to mirror the state in the CLI's own status bar.

## 3. Wiring it together

- One long-running local Node process, one HTTP server, localhost-only (no auth needed for a local
  dev tool).
- One shared SSE endpoint (e.g. `GET /api/events`) fanning out every event type your app has
  (mutations, reloads, warnings, session state, dispatch/release, shell feed) — don't build a
  separate stream per feature. Keep a `Set` of connected `res` objects, write
  `data: ${JSON.stringify(event)}\n\n` to all of them, remove on `req.on('close')`.
- Dispatch and the shell watcher deliberately don't share a protocol beyond that broadcast channel —
  keep them decoupled so either can change independently (e.g. a future headless "drive" mode could
  replace dispatch's terminal-spawn without touching the watcher at all).

## Build order that worked well

1. Spec/design decision doc (rejected alternatives: pty + xterm.js, or having hooks POST directly to
   the server — both rejected in favor of passive transcript tailing, which requires zero changes to
   how sessions are launched).
2. Server-side transcript watcher + snapshot endpoint + SSE event type.
3. Client panel consuming both.
4. A code-review pass once the above is working end-to-end.
5. A small follow-up polish pass (e.g. un-clipped expand view, better inline formatting) — don't
   try to get this right in the first pass.
