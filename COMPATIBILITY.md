# Droid compatibility

This repository ports [pstack](https://github.com/cursor/plugins/tree/main/pstack) from the Cursor plugin format to a Droid plugin. This note lists every change the Cursor plugin needs to run fully on Droid, and the rules that keep it that way. Read it before you port an upstream release or edit any skill, playbook, droid, or script.

`node scripts/validate-plugin.mjs` enforces the rules that a script can check. CI runs it on every pull request. The rest need a reviewer, and the [invariants](#invariants-for-every-change) section lists them.

## Droid facts the port depends on

These are the platform behaviors that drive every rule below. Recheck them when a new Droid release changes subagents, skills, or plugins.

- **Task has no per-spawn model field.** A spawn picks a model only through the droid it names. `complexity` (`light`, `medium`, `heavy`) only routes droids whose `model` is `inherit`, such as `worker` and `explorer`.
- **Every Task call runs in the background.** The report arrives when the subagent ends. Task has no `run_in_background` field.
- **A subagent has no Task tool.** A subagent cannot spawn subagents, so a nested spawn fails. Writable subagents (`worker`, a droid without `tools`) get `Loop`, `Edit`, `Create`, and `Execute`. Read-only subagents get neither `Loop` nor edit tools.
- **Droid strips unknown skill frontmatter.** Droid reads only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`, `version`, `tools`, `enabled`, `user-invocable`, and `disable-model-invocation`. Any other key does nothing.
- **`disable-model-invocation: true` hides a skill from the model.** The user can still run it as `/name`. The model cannot load it with the Skill tool, so pstack reads bundled skills by path.
- **Droid droid frontmatter** is `name`, `description`, `model`, `reasoningEffort`, `tools`, and `mcpServers`. `tools: read-only` removes every edit tool.
- **A personal droid overrides a plugin droid with the same name.** `/setup-pstack` relies on this to pin seat models.
- **`${DROID_PLUGIN_ROOT}`** expands in hooks, MCP config, and a `SKILL.md` that Droid loads as a skill. It does not expand in a file an agent reads with the Read tool, such as a playbook or a `SKILL.md` read by path.

## Changes from the Cursor plugin

### Plugin layout

| Cursor | Droid |
| :-- | :-- |
| `.cursor-plugin/plugin.json` | `.factory-plugin/plugin.json`, with only `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, and `keywords` |
| No marketplace | `.factory-plugin/marketplace.json` that lists `pstack` with `"source": "./"`, so the repository is its own marketplace |
| `plugin.json` | Kept, with the Agent Plugins `$schema`. `name`, `version`, and `description` match `.factory-plugin/plugin.json` |
| `agents/` | `droids/` |
| Upstream monorepo paths (`pstack/skills/...`) | `skills/...`, because the plugin is the repository root |
| `harness/pstack/claude-code/`, the Claude Code README section | Not carried |

### Droids and the model panel

| Cursor | Droid |
| :-- | :-- |
| Per-spawn model and reasoning level on Task | Seat droids. `poteto-agent` is the code seat (`grok-4.7`, `xhigh`). `poteto-judgment` is the judgment seat (`claude-opus-5-5`, `xhigh`). Each has a read-only twin with `tools: read-only` |
| `readonly: true` | `tools: read-only`, only on a droid that never writes |
| `readonly: false` | Omit `tools`. A droid that edits files, such as `comment-sicko`, must not be read-only |
| `is_background: true` | Drop it. Every Task runs in the background |
| `generalPurpose` subagent | Built-in `worker` droid. A role set to `auto` or `inherit-parent` spawns `worker` |
| `.cursor/rules/pstack-models` | The pstack-models section of `~/.factory/AGENTS.md` |
| Per-spawn effort | The seat droid's `reasoningEffort`. `/setup-pstack` writes a personal droid at `~/.factory/droids/<seat>.md`, and its read-only twin, to change a seat's model or effort |

### Subagent flow

| Cursor | Droid |
| :-- | :-- |
| `run_in_background: true` on a spawn | Drop the field. Spawn parallel work in one message |
| A subagent that spawns its own subagents (sub-coordinators, a subagent that runs `/how` or `/no-comments`) | Every spawn stays in the chat that runs the playbook. A skill that a delegate may run needs an in-subagent path that does the work inline. `no-comments` reads `droids/comment-sicko.md` and runs the pass itself. `show-me-your-work` leaves its cross-model review to the parent. `comment-sicko` traces a claim itself instead of running `/how` or `/why`. The orchestrate sub-coordinator is dropped |
| Cloud agents | Background subagents, each in its own git worktree |

Skills that spawn subagents, and so must run in the main chat: `how`, `why`, `teach`, `recall`, `arena`, `architect`, `swarm`, `interrogate`, `reflect`. `no-comments` and `show-me-your-work` also spawn, and each has an in-subagent path.

### Skills

| Cursor | Droid |
| :-- | :-- |
| `name: Poteto Mode` | `name` is lowercase, hyphenated, and equal to the directory name |
| `paths: [...]` glob activation | Drop `paths`. Remove `disable-model-invocation` and let the description route the skill (`typescript-best-practices`) |
| `icon`, `color` | Kept for parity with upstream. Droid ignores them |
| A skill loaded by the model by name | Skills with `disable-model-invocation: true` are read by path. `poteto-mode` reads `../<name>/SKILL.md`. Seat droids find `poteto-mode` in `~/.factory/plugins/` |
| cursor-team-kit `deslop`, `control-cli`, `control-ui` | Bundled in `skills/` |
| Cursor `create-skill` skill | The `authoring-a-skill` playbook. Droid's `/create-skill` is a user pane, not a skill an agent can call |

### Paths

| Cursor | Droid |
| :-- | :-- |
| `~/.cursor/plugins/` | `~/.factory/plugins/` (plugin cache) |
| `.cursor/skills/`, `~/.cursor/skills/` | `.factory/skills/`, `~/.factory/skills/` |
| `~/.cursor/projects/` transcripts | `~/.factory/sessions/<slug>/<uuid>.jsonl`. The slug is the workspace path with every `/` replaced by `-` |
| `~/.cursor/worktrees/` | `~/.factory/worktrees/<group>/<repo>/` |
| `.cursor/automations/benny/` | `.factory/automations/benny/` |
| Script paths relative to the pstack repository (`node skills/poteto-mode/scripts/...`) | Relative to the skill directory (`scripts/...` from the `poteto-mode` directory). The agent runs in the user's repository, not in this one |

### Tools, names, and services

| Cursor | Droid |
| :-- | :-- |
| `AskQuestion` | `AskUser` |
| Custom Mode keybinding | Start each task with `/poteto-mode` |
| Plan mode | Spec mode |
| `/loop` | `/loop` (Droid built-in) |
| Bugbot | The automated reviewer, `factory-droid[bot]`. `watch-pr` matches that login exactly. Automation tokens are `droid auto review`, `droid-review`, and `security review`. `bugbot-triage.md` is `references/review-bot-triage.md` |
| `CURSOR_AUTOMATION_ID` | Dropped. Pass keys use `RUN_ID` only |
| `@cursor-skill/*` npm scope | `@droid-skill/*` |
| Cursor routine webhook wake in `make-bot-ui` | A Factory Webhook-trigger automation. The server sends `X-Webhook-Secret` |

## Invariants for every change

Keep these true in every pull request, including upstream ports.

1. `node scripts/validate-plugin.mjs` passes. It checks the manifests, skill and droid names, the frontmatter key allowlists, and a list of Cursor-only tokens (`run_in_background`, `AskQuestion`, `generalPurpose`, `.cursor/` paths, `.cursor-plugin`, `is_background`, `node skills/`, `sub-coordinator`).
2. No subagent is told to spawn a subagent. A brief to a delegate never asks it to run a skill from the spawning list above. A new spawn in a skill a delegate can reach, such as one used by an Autopilot owner, comes with an inline path for a subagent.
3. A droid that edits files has no `tools` field, or lists `Edit`. Only a droid that never writes is `tools: read-only`.
4. Model choice goes through a seat droid. Never add a per-spawn `model` field to a Task call. `complexity` is only for `worker` and `explorer`.
5. A new script reference is relative to its skill directory. Never assume the user's working directory is this repository.
6. A new skill frontmatter key is one Droid reads. If upstream adds a Cursor-only key, translate it to a Droid behavior or drop it, and say which in the PR.
7. A skill that the model must load by itself does not set `disable-model-invocation: true`. A bundled skill that does set it is reached by path from `poteto-mode`.
8. User-facing paths name `~/.factory/...` locations, never `~/.cursor/...`.

## Porting an upstream release

1. Diff upstream `pstack/` between the last ported commit and the new one. Port each upstream PR on its own.
2. Apply the tables above to every new or changed line. Keep poteto's wording everywhere else.
3. Bump `version` in `plugin.json`, `.factory-plugin/plugin.json`, and the README header.
4. Run `node scripts/validate-plugin.mjs`, then `bun run typecheck` and `bun run test` in `skills/poteto-mode/scripts`.
5. In the PR body, list each upstream PR as ported or skipped, and list every Droid deviation in the range.
6. When a Droid release changes a fact at the top of this note, update this note and the validator in the same PR.
