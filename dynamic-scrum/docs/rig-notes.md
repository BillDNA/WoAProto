<!-- Rig-notes stub scaffolded by init/adopt (canonical DS-210). The consumer-side home for THIS project's
     rig lore — the engine / editor / GPU-pipeline / device recipes a build or verify agent needs here and
     nowhere else. It is the extension point `run-ticket` defers to, so the served skills stay rig-agnostic.

     Fill in the sections that match your rig; DELETE the rest, INCLUDING the worked Unity example below
     (it is a specimen of the shape, not a requirement). Then refresh `last-reviewed:`.
     Graded by the `orientation-doc` rubric: one topic, as-built, scannable. -->
---
last-reviewed: 2026-07-18
---

# Rig notes — WarOfAttrition

Rig- and tooling-specific run recipes for this project. `run-ticket` **defers** here: the generic rules
(never certify pixels you haven't seen rendered; check the session's tool inventory; scratch-port the
server; session-background processes die with the session) stay in the skill, and everything that only
makes sense on *this* rig lives in this doc.

## Routing convention — rig lore lands here, not in the served skill

- **Rig-specific run-signal routes to this doc.** A refine / alignment pass harvesting a run-report finding
  shaped *"in Unity / in ComfyUI / on this GPU / on this device, do X"* writes it **here**. Adding it to
  `run-ticket/SKILL.md` is the regression the convention exists to prevent: that skill is served to **every**
  consumer, so every other project would pay the context on **every dispatch** and could never use it.
- **Split, don't discard.** A finding usually has a generic half and a rig half. The generic half (a rule any
  project could apply) may land in the skill; the rig half lands here. If it doesn't generalize, it is all
  rig half.
- **This doc is not served.** It is read by a runner/build agent working *this* repo — no other consumer
  pays for it. Grow it freely.
- The skill points at this doc as `[[rig-notes]]` at the fixed path `dynamic-scrum/docs/rig-notes.md`.

## The rig

- **Tooling inventory:** _stub — MCPs, bridges, CLIs a session can drive here (e.g. a Unity/Blender/browser MCP)._
- **Driving it:** _stub — how an agent puts the app/editor into a given state._
- **Capturing pixels:** _stub — the working screenshot/render recipe, and what it does NOT capture._
- **Tests:** _stub — suite invocations, which layers each covers, known flake smells._
- **Staging:** _stub — rig-specific commit-staging rules (paired sidecar/metadata files, generated artifacts)._

---

## Worked example — a Unity rig  *(delete this whole section unless this project is Unity)*

Kept verbatim from `run-ticket` (canonical DS-210 evicted it here, where only Unity consumers pay for it).
It shows the grain of a filled-in rig-notes: hard-won, specific, useless to anyone else.

**Capture.** With the Unity MCP bridge, in-editor *behavior* is machine-verifiable — `script-execute` +
reflection can drive real handlers against the running app, and `tests-run` covers headless ACs — but
camera-render captures (`screenshot-scene-view`, manual `Camera.Render()`) do **NOT** include `Handles`/Gizmo
GL overlays. The working pixel recipe: script-execute the editor into state (Play mode, window open,
selection set, `SceneView.LookAt`), then an **OS-level window capture** + image Read — that renders handles,
gizmos, and docked EditorWindows. Capture order: **`PrintWindow(hwnd, hdc, 2)`** (PW_RENDERFULLCONTENT)
first — it captures the Unity window even when fully occluded and never steals focus from a human using the
machine; fallback `Graphics.CopyFromScreen` of the window rect, which needs the window frontmost — plain
`SetForegroundWindow` silently fails under the Windows foreground lock, so send an Alt keypress first
(`SendKeys.SendWait('%')`) and verify with `GetForegroundWindow` before capturing. `Event.current` is
**unsynthesizable** outside a live GUI dispatch (NRE on read): verify editor event-path logic via a public
static helper probed with synthetic inputs (e.g. hand-computed rays), keep the event gate code-review-only,
and always hold interaction *feel* (real drags/clicks) over for the human.
(DynamicTables M5.1 + M5.2 runs, 2026-07-07.)

**PlayMode vs EditMode.** `tests-run` covering headless ACs is **not** sufficient by itself for a ticket that
changes **runtime / sim / gameplay code**: EditMode alone doesn't exercise the running game loop, so such a
ticket MUST run **PlayMode** tests at the verify gate before closing clean — green EditMode alone is
insufficient. Treat one green PlayMode run as necessary, not sufficient: **re-run new/modified PlayMode tests
once** before trusting them, since a single pass isn't proof of non-flaky; fixed-frame counts or a wall-clock
threshold baked into the test's pacing (`WaitForSeconds`-style assumptions) is a flake smell to **fix**, not
shrug off as environmental noise. (CMM 07-09, SKILL-M4.)

**Staging.** Stage the paired `.meta` alongside every changed asset (`Assets/Foo.cs` + `Assets/Foo.cs.meta`,
and a new folder's own `.meta`) — an explicit-path stage that grabs the asset but misses its `.meta`
half-tracks it. (DS-164: the DynamicTables dogfood run.)

---

## Worked example — a ComfyUI / GPU render rig  *(delete this whole section unless this project renders)*

Kept here (canonical DS-198 evicted it from `run-ticket`, where only rendering consumers pay for it). It
shows the grain of a filled-in rig-notes for a diffusion/ComfyUI-style pipeline: hard-won, specific, useless
to anyone else.

**Input-prep is a recurring failure class — eyeball every intermediate, not just the final render.** A
control map, mask, or reference image can look fine at thumbnail scale and still be wrong in a way that only
shows up on close inspection; a render built on a bad input inherits the defect silently (M6: 3 input-prep
defects missed at sonnet vs 0 across two opus builds — this is *why* `run-ticket` defaults an image-verdict
dispatch to opus). Named failure modes to check at every prep stage, before the artifact feeds a render:

- **Borders.** A control map or mask resized/padded to fit the pipeline can pick up a hairline border
  artifact at the seam — invisible at thumbnail scale, visible at 100%.
- **Padding boundaries.** A reference or mask image padded to a target aspect ratio needs the pad color and
  pad *placement* (centered vs corner-anchored) checked explicitly — a mismatched pad shifts the subject
  relative to the control map it's paired with.
- **Polarity.** Masks and depth/normal control maps carry a foreground/background (or near/far) convention
  that's easy to invert silently — an inverted mask still "looks like a mask" at a glance but drives the
  sampler to do the opposite of what was intended.

Vision-Read the prep artifact itself **before** it feeds a render, not only the rendered output — a defect
caught here is a re-crop, not a re-render. (DIG M6–M8.7, canonical DS-198.)

**Dispatch language for a generated-asset build** (the generic contracts the served `run-ticket` points
here for): the image-verdict dispatch defaults to **opus** (above); prime honesty — *"report per-render
artifacts; overstated claims get bounced"* (a 1:1 runner-vision match, zero bounces); and require curation
before install — *"you cannot see an image unless you Read it — vision-Read every candidate and curate
before installing."* (Canonical DS-198; the one-line pointer lives in `run-ticket` Step 2.)

**Staged-artifact pre-flight & GPU serialization** (the rig half of `run-sprint`'s Step-0.2 env pre-flight
and its serialize-on-shared-hardware rule; the generic halves — *one content-level invariant per staged
artifact* and *an exclusive shared resource serializes file-disjoint tickets* — stay in the served skill).
Before a render sprint dispatches ticket 1, verify **one content-level invariant per staged model or
node-pack**: a **safetensors-header** shape or an expected **byte size**, or cite a closed ticket that
already produced blessed output from *this exact* file — **filename presence is not verification** (DIG-018
L1: a mislabeled **ViT-H weights file** passed the name check, and only a header check caught it). And a
**single GPU serializes even file-disjoint tickets** — **VRAM-freeing calls** between lanes collide the
same way a file write would, so file overlap is not the only test for whether two cards can run in
parallel. (Canonical DS-221 routed this here from `run-sprint`.)

## Worked example — a headless-browser / web-UI rig  *(delete this whole section unless this project ships a local web UI)*

Kept here (canonical DS-199) as a specimen for a project with no browser MCP available, or verifying a
scratch fixture of its own board hub.

**Headless-Edge fallback.** No browser MCP on Windows → `msedge --headless --disable-gpu
--screenshot=<png> --window-size=<W>x<H> --virtual-time-budget=10000 <url>` + a vision Read crosses
`run-ticket`'s *Visual-verification boundary* for a rendered-page AC. **Omitting `--virtual-time-budget`
captures the pre-fetch initial paint** — an async-populated page then reads falsely blank, a false negative,
not a passing check (DIG-047).

**Scratch-hub fixture recipe.** To verify a board-hub UI change in isolation: scaffold a fixture board with
a non-project ticket-prefix under the scratchpad, seed it with one ticket by hand, **restart the scratch hub
after seeding** — prefix inference reads at server construction, not per-request, so a hub started before
the seed keeps inferring against the empty board and won't mint against the seeded prefix until restarted —
then launch it on a spare port and drive with browser MCP + vision/fill. **Cross-port rendering is a cheap
extra assertion class**: it exposed a hardcoded `ONLINE 4820/SSE` chip that only rendering against the
*wrong* port would surface (DS-189). Re-derived independently across four DS-run tickets before landing
here.

## Worked example — process launching on Windows  *(delete this section unless this project runs on Windows)*

`run-ticket` states the generic rule — *a detached background service may be reaped with the agent's own job
object the instant the tool call returns, so the agent verifies the service actually survived the call (poll
its port/PID) rather than trusting the launch command's exit code.* **Which launch form survives is platform
lore, and this is where it lives.**

On Windows: a service started with **`Start-Process` dies** with the agent's job object; one created via WMI
**`Win32_Process.Create` survives** it. Prefer the latter for anything that must outlive the tool call, and
poll the port to confirm — the launch command's exit code will report success either way (DIG-022).

## Related

[[Docs Index]] · `run-ticket` *Rig-notes extension point* + *Visual-verification boundary* — the generic
rules this doc extends.

#rig-notes #claude-orientation
