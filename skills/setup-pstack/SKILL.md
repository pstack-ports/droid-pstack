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

The default role-to-model mapping is the section shape shown in step 5 below. If the pstack-models section already exists in `~/.factory/AGENTS.md`, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `how explorer` or `why investigators`, is from a retired role. Drop it.

A section without the `# defaults: 2` line comes from an older setup. That setup wrote a line for every role, so some of its values are old defaults, not choices. An old slug is one that matches `grok-*`. Before step 3, replace these values:

- An old slug in `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `reflect tooling`, or `swarm workers` takes the role's step 5 default.
- A `claude-opus-*` value in `hardest tasks` takes the role's step 5 default.
- In a panel role (`arena runners`, `arena cross-judge pool`, `architect runners`, `interrogate reviewers`), a list of exactly one `claude-opus-*` entry and one old slug, in either order, takes the role's step 5 list. In any other list, each old slug becomes `claude-opus-5-5`.

Every other value is the user's choice and stays, including an old slug in any other role and every `inherit-parent` or `auto` value. Tell the user which values you replaced.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer AskUser over free text. Offer these four options with these exact labels, and name the current budget when the section records one. With no section, say that `large` matches the skill defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit-parent`, `auto`). Families are the ones Phase A of the **arena** skill defines, so Fable is its own family. Each role has a target effort, which is its default's effort moved by the budget. `large` keeps it, `unlimited` raises it one step, `medium` lowers it one step, and `small` lowers it two steps, on the ladder `max` > `xhigh` > `high` > `medium` > `low`. A target at either end of the ladder stays there. Most defaults are at `xhigh`, and each budget label names where those land. `hardest tasks` starts at `max`. Droid stores one `reasoningEffort` per seat, not per role, so the code seat takes the target for `feature, refactoring` and the judgment seat takes the target for `hardest tasks`. Roles that share a seat share that effort. `inherit-parent` and `auto` do not change. So `unlimited` sets the code seat to `max` and keeps the judgment seat at `max`. `small` sets the code seat to `medium` and the judgment seat to `high`. If the result is not a detected model ID, use the same family's detected model with the highest effort at or below the target, else mark the role as needing a choice. Fable has no fast mode, and a Droid model ID never includes `-fast`.

**(c) Show the roles and confirm.** Show every role with its model, marking any real model ID not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models plus `inherit-parent` and `auto` (both mean: this role spawns the built-in `worker` droid and runs on the parent chat model) as the options. Prefer AskUser over free text. For panel roles (arena runners, architect runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values from a vendor other than the parent's, in list order, so order it by preference. Fable and the other Claude models are one vendor. An `inherit-parent` or `auto` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm. Droid has two seats. `claude-opus-5-5` spawns `poteto-agent` and `claude-fable-5-2` spawns `poteto-judgment`. A list entry that names any other model ID has no seat, so drop it and say so.

### 4. Validate

Every real model ID written must be in the detected set. `inherit-parent` and `auto` always pass. If a chosen model ID is not available, stop and ask again.

### 5. Write the section

Manage a marked block in `~/.factory/AGENTS.md` so re-runs stay idempotent and no other content is touched: replace everything between `<!-- pstack-models:start -->` and `<!-- pstack-models:end -->`, appending the block at the end of the file when absent. The block holds the `# defaults: 2` line, a `# budget` line with the chosen label and the effort that label names, and one line per role, using the same labels poteto-mode uses:

```
<!-- pstack-models:start -->
# pstack model configuration. One line per role. Delete a line to fall back to the plugin default.
# `inherit-parent` or `auto` as a value: the role spawns the built-in `worker` droid and runs on the parent chat model. Alias entries in a panel list still count toward its fan-out.
# defaults: 2
# budget: large (xhigh)
feature, refactoring: claude-opus-5-5
bug-fix: claude-opus-5-5
perf-issue: claude-opus-5-5
hillclimb: claude-opus-5-5
judgment and prose: claude-opus-5-5
hardest tasks: claude-fable-5-2
reflect tooling: claude-opus-5-5
reflect judgment, divergent, synthesizer: claude-opus-5-5
arena runners: claude-fable-5-2, claude-opus-5-5
arena cross-judge pool: claude-fable-5-2, claude-opus-5-5
swarm workers: claude-opus-5-5
architect runners: claude-fable-5-2, claude-opus-5-5
interrogate reviewers: claude-fable-5-2, claude-opus-5-5
<!-- pstack-models:end -->
```

### 6. Pin the seats

Droid's `Task` call has no per-spawn model field, so a role's model takes effect through the seat droids. The code seat's model is the `feature, refactoring` value. The judgment seat's model is the `hardest tasks` value. When a seat's chosen model or effort differs from the plugin default (`poteto-agent` at `claude-opus-5-5` xhigh, `poteto-judgment` at `claude-fable-5-2` max), write a personal droid at `~/.factory/droids/<seat>.md` pinning the chosen model and `reasoningEffort`, with the same name, description, and body as the plugin's droid. Do the same for its read-only twin (`poteto-agent-readonly`, `poteto-judgment-readonly`): same model and `reasoningEffort`, `tools: read-only`, and the plugin twin's description and body. Personal droids override plugin droids of the same name. When a seat matches the plugin default, delete any stale personal override for it and for its read-only twin so the plugin's droid applies. New sessions pick the changes up.

### 7. Confirm

Tell the user the section was written and that it applies to new sessions. Re-running this skill updates it.

### 8. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

### 9. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.
