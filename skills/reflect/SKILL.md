---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this session's transcript. It lives under `~/.factory/sessions/` in the directory named for the workspace path (every "/" turned into "-"). Find this session's transcript there (the newest .jsonl), and never read another project's sessions without being asked.

```bash
ls -t ~/.factory/sessions/<workspace-slug>/*.jsonl | head -10
```

Droid stores one .jsonl per session at that level, and every line is one chat message. Take the newest file. If it is not this session's transcript, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three `Task` calls, each on the seat droid for its role. Droid's droids already have the tools they need, and the session's MCP servers provide the reviewers' MCP access to look up the tickets, chat threads, and observability traces the transcript references.

Each reviewer and the synthesizer name a role line in the pstack-models section of `~/.factory/AGENTS.md` and a default. Fall back to the default when the section or the line is missing. Spawn on the role's seat: a judgment line means the `poteto-judgment` droid, a tooling line means the `poteto-agent` droid, and `auto` or `inherit-parent` means the built-in `worker` droid, which runs on the parent chat model. `/setup-pstack` pins a seat to a different model by writing a personal droid at `~/.factory/droids/<seat>.md`. Pick each subagent per the Subagents section of the **poteto-mode** skill.

| Lens | Role line | Default seat | Prompt template |
|---|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | judgment seat (`poteto-judgment`) | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | code seat (`poteto-agent`) | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | judgment seat (`poteto-judgment`) | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the `Task` response body.

## 3. Synthesize

One `Task` call, on the `reflect judgment, divergent, synthesizer` line's seat (default judgment seat, `poteto-judgment`). It spot-verifies citations through MCP, and the session's MCP servers provide that access. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Never edit a skill under `plugins/cache/`. Before approval, show its destination, `.factory/skills/<skill>/` or `~/.factory/skills/<skill>/`. After approval, copy the skill folder there and edit the copy. Never open a PR or push.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the **authoring-a-skill** playbook (`../poteto-mode/playbooks/authoring-a-skill.md`).
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to the **authoring-a-skill** playbook.
- `new skill: <kebab-name>`: hand creation to the **authoring-a-skill** playbook. Do not invent the shape ad hoc.

Validate every touched skill with `/skills` before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
