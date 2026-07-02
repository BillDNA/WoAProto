# CLI-responder LLM transport (`claude -p`)

Run an LLM behind your app's normal client interface, but route the call through the
**Claude Code subscription CLI** (`claude -p`) as a one-shot subprocess instead of the paid
API. Same request/response contract; **zero per-call API credits**. Great for prompt-tuning
batches (fire one input × N and score the spread) where API cost would otherwise dominate.

Ported from Isekai ISK-293. Original: `Assets/Scripts/Llm/ClaudeCliLlmClient.cs`.

## The idea

You already have (or should have) an `ILlmClient`-style seam — one interface with a
`Send(request) -> response` method, and concrete clients behind it (real API, fake, etc.).
Add one more implementation that shells out to the CLI. Nothing upstream changes.

```
request { systemPrompt, userMessage, model, outputSchema? }
   -> spawn:  claude -p --model <m> --system-prompt <sp> --output-format json
   -> stdin:  <userMessage (+ inlined schema instruction if outputSchema)>
   -> stdout: { "result": "...", "stop_reason": "...", "is_error": false, "usage": {...} }
   -> response { text, inputTokens, outputTokens, finishReason }
```

## The command

```
claude -p \
  --model <tier> \
  --system-prompt "<your role system prompt>" \
  --output-format json
```
Prompt (the user message, plus schema instruction if you want JSON) goes on **stdin**.

## Six things that will bite you (the whole reason to copy this vs. rolling your own)

1. **Prompt on stdin, not as an arg.** Assembled context blows past the OS command-line
   length cap (bad on Windows especially). Pass it through stdin.
2. **Drain stdout/stderr concurrently while writing stdin.** Classic full-pipe-buffer
   deadlock otherwise: start the async read *before* you finish writing the prompt.
3. **Off the UI/main thread.** The spawn + blocking pipe reads must not stall your app.
   Wrap in `Task.Run` / a worker.
4. **No structured-output param on the CLI.** Inline the schema into the prompt:
   *"Respond with ONLY a single JSON object — no markdown code fences, no commentary —
   matching exactly this JSON schema: `<schema>`"*. (This holds up in practice; validate it.)
5. **`--system-prompt` fully overrides the default prompt** → drops ambient `CLAUDE.md`
   auto-discovery, so the firing is faithful to your API path (only the role prompt, at the
   pinned model). Without it you drag in global+project CLAUDE.md (~19k cache-read tokens)
   and inherit the cwd's default model. Pin `--model` too.
6. **Binary resolution.** `claude` is on your interactive PATH, but a spawned process's PATH
   may differ (Unity Editor, service). Default to `"claude"`, allow an absolute-path override,
   and surface a clear errored result (not a silent hang) when it's missing.

## Fail-open (mandatory)

Missing binary, non-zero exit, timeout, `is_error: true`, empty/garbage stdout → return an
**errored response** (empty text, `finishReason = "error"`), never throw. A batch keeps running;
the firing shows as errored.

## Split for testability

Keep two **pure** helpers out of the process glue so they unit-test without spawning anything:
- `BuildPrompt(request)` — user message, + schema instruction only when `outputSchema` is set.
- `ParseEnvelope(stdout, exitCode)` — envelope → response; all fail-open cases → errored.

The process spawn itself is I/O; don't unit-test it — cover it with one manual end-to-end run.

## Reference implementation (C#, trim to taste)

```csharp
using System.Diagnostics;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

public class ClaudeCliLlmClient : ILlmClient
{
    private readonly string _binaryPath;
    private readonly int    _timeoutMs;

    public ClaudeCliLlmClient(string binaryPath = "claude", int timeoutMs = 180_000)
    {
        _binaryPath = string.IsNullOrEmpty(binaryPath) ? "claude" : binaryPath;
        _timeoutMs  = timeoutMs;
    }

    public Task<LlmResponse> SendAsync(LlmRequest request)
    {
        if (request == null) return Task.FromResult(ClaudeCliFormat.Errored());
        return Task.Run(() => Run(request));   // off the main thread
    }

    private LlmResponse Run(LlmRequest request)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = _binaryPath,
                RedirectStandardInput = true, RedirectStandardOutput = true,
                RedirectStandardError = true, UseShellExecute = false, CreateNoWindow = true,
            };
            psi.ArgumentList.Add("-p");
            psi.ArgumentList.Add("--model");         psi.ArgumentList.Add(request.model ?? "");
            psi.ArgumentList.Add("--system-prompt"); psi.ArgumentList.Add(request.systemPrompt ?? "");
            psi.ArgumentList.Add("--output-format"); psi.ArgumentList.Add("json");

            using var proc = new Process { StartInfo = psi };
            proc.Start();

            // read stdout async BEFORE writing stdin → no pipe-buffer deadlock
            var outTask = proc.StandardOutput.ReadToEndAsync();
            _ = proc.StandardError.ReadToEndAsync();
            proc.StandardInput.Write(ClaudeCliFormat.BuildPrompt(request));
            proc.StandardInput.Close();

            if (!proc.WaitForExit(_timeoutMs))
            {
                try { proc.Kill(); } catch { }
                return ClaudeCliFormat.Errored();
            }
            proc.WaitForExit();
            return ClaudeCliFormat.ParseEnvelope(outTask.Result, proc.ExitCode);
        }
        catch { return ClaudeCliFormat.Errored(); }   // binary missing / spawn failure
    }
}

public static class ClaudeCliFormat
{
    public static string BuildPrompt(LlmRequest request)
    {
        var user = request?.userMessage ?? "";
        if (request == null || string.IsNullOrEmpty(request.outputSchema)) return user;
        return user +
            "\n\nRespond with ONLY a single JSON object — no markdown code fences, no commentary " +
            "before or after — matching exactly this JSON schema:\n" + request.outputSchema;
    }

    public static LlmResponse ParseEnvelope(string stdout, int exitCode = 0)
    {
        if (exitCode != 0 || string.IsNullOrWhiteSpace(stdout)) return Errored();
        try
        {
            var o = JObject.Parse(stdout.Trim());
            if (o.Value<bool?>("is_error") == true) return Errored();
            var result = o.Value<string>("result");
            if (result == null) return Errored();

            var usage  = o["usage"] as JObject;
            int inTok  = usage?.Value<int?>("input_tokens")  ?? 0;
            int outTok = usage?.Value<int?>("output_tokens") ?? 0;
            var stop   = o.Value<string>("stop_reason");
            var finishReason = stop == "max_tokens" ? "max_tokens" : "stop";

            return new LlmResponse(result, inTok, outTok, finishReason);
        }
        catch { return Errored(); }
    }

    public static LlmResponse Errored() => new LlmResponse("", 0, 0, "error");
}
```

## Where it's headed (so you don't over-build now)

One-shot spawns a **cold process per call** (~1–2s auth/startup). Fine for independent batch
firings; poor for interactive/multi-call turns where the tax stacks. The upgrade path stays
subprocess-based — no listener/server needed: `claude -p` returns a `session_id` and supports
`--resume`/`--continue`, so a future warm-session client can reuse the prompt cache across calls.
Hard rule if you do: warm session is for **cache reuse, not conversational carryover** — each
firing must still get a fresh, fully-assembled context, or output N bleeds into call N+1.
YAGNI until measured.

---
skipped: warm `--resume` session client, session pool — add when interactive latency actually hurts.
