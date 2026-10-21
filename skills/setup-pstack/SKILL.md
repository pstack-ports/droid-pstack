---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Write the pstack-models section into `~/.factory/AGENTS.md`, the personal instructions Droid always loads, so every pstack skill sees the role-to-model mapping in every session. Pin the seats by writing personal droids at `~/.factory/droids/poteto-agent.md` and `~/.factory/droids/poteto-judgment.md` when their models differ from the plugin defaults.

## Steps

### 1. Detect available models

Enumerate the Droid model IDs the user can run: the model picker this session offers, or the models the user's plan includes. Ask the user to paste the model IDs they use if you cannot detect them. Never write a real model ID you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not model IDs.

### 2. Load current state

The default role-to-model mapping is the section shape shown in step 5 below. If the pstack-models section already exists in `~/.factory/AGENTS.md`, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `how critics`, is from a retired role. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer AskUser over free text. Offer these four options with these exact labels, and name the current budget when the section records one. With no section, say that `large` matches the plugin defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the plugin defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit-parent`, `auto`). `unlimited`, `large`, `medium`, and `small` set the reasoningEffort the seats pin to `max`, `xhigh`, `high`, or `medium`. A model family whose ladder tops out lower caps there: Grok tops out at `xhigh`, so under `unlimited` Grok stays at `xhigh`. If the result is not a detected model ID, use the same family's detected model with the highest effort at or below the target, else mark the role as needing a choice. `inherit-parent` and `auto` do not change.

**(c) Show the roles and confirm.** Show every role with its model, marking any real model ID not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role spawns the built-in `worker` droid and runs on the parent chat model) as the options. Prefer AskUser over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the parent's when possible. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real model ID written must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen model ID is not available, stop and ask again.

### 5. Write the section

Manage a marked block in `~/.factory/AGENTS.md` so re-runs stay idempotent and no other content is touched: replace everything between `<!-- pstack-models:start -->` and `<!-- pstack-models:end -->`, appending the block at the end of the file when absent. The block holds a `# budget` line with the chosen label and its target effort, and one line per role, using the same labels poteto-mode uses:

```
<!-- pstack-models:start -->
# pstack model configuration. One line per role. Delete a line to fall back to the plugin default.
# `inherit-parent` or `auto` as a value: the role spawns the built-in `worker` droid and runs on the parent chat model. Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: grok-4.7
bug-fix: grok-4.7
perf-issue: grok-4.7
hillclimb: grok-4.7
judgment and prose: claude-opus-5-5
hardest tasks: claude-opus-5-5
how explorer: grok-4.7
how explainer: claude-opus-5-5
why investigators: grok-4.7
why synthesizer: claude-opus-5-5
reflect tooling: grok-4.7
reflect judgment, divergent, synthesizer: claude-opus-5-5
arena runners: claude-opus-5-5, grok-4.7
arena cross-judge pool: claude-opus-5-5, grok-4.7
swarm workers: grok-4.7
architect runners: claude-opus-5-5, grok-4.7
interrogate reviewers: claude-opus-5-5, grok-4.7
<!-- pstack-models:end -->
```

### 6. Pin the seats

Droid's `Task` call has no per-spawn model field, so a role's model takes effect through the seat droids. When a seat's chosen model or effort differs from the plugin default (`poteto-agent` at `grok-4.7` xhigh, `poteto-judgment` at `claude-opus-5-5` xhigh), write a personal droid at `~/.factory/droids/<seat>.md` pinning the chosen model and `reasoningEffort`, with the same name, description, and body as the plugin's droid. Do the same for its read-only twin (`poteto-agent-readonly`, `poteto-judgment-readonly`): same model and `reasoningEffort`, `tools: read-only`, and the plugin twin's description and body. Personal droids override plugin droids of the same name. When a seat matches the plugin default, delete any stale personal override for it and for its read-only twin so the plugin's droid applies. New sessions pick the changes up.

### 7. Confirm

Tell the user the section was written and that it applies to new sessions. Re-running this skill updates it.

### 8. Offer a verification skill (optional)

The default section pins every role to one of two models, and the panel roles run two subagents each, so the panel loses diversity. The same effort budget on two different model families gives a more honest second opinion than two seats on one family. To restore diversity, offer to write a pstack verification skill under `~/.factory/skills/`: a directory whose name starts with `pstack-verify`, a `SKILL.md` inside with frontmatter `name` and `description`, and no model line. The skill runs a small real task against the working tree twice, once per seat droid, and diffs the outputs in place, writing all files under `~/.factory/skills/<skill-name>/`. If accepted, read `~/.factory/AGENTS.md` first so no rule contradicts the generated skill, and keep the generated skill under 30 lines. Keep the offer to one line. The user may decline.

### 9. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
