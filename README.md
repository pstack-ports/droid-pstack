# droid-pstack

Droid port of [pstack](https://github.com/cursor/plugins/tree/main/pstack) (`0.15.28`) by [Lauren Tan (poteto)](https://x.com/poteto), bundling `deslop`, `control-cli`, and `control-ui` from [cursor-team-kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit) (`1.2.0`) by Eric Zakariasson.

See the [upstream pstack README](https://github.com/cursor/plugins/blob/main/pstack/README.md), [upstream cursor-team-kit README](https://github.com/cursor/plugins/blob/main/cursor-team-kit/README.md), and the [guide](./docs/guide/README.md) for usage and documentation.

## Install

Register this repository as a plugin marketplace, then install the plugin:

```bash
droid plugin marketplace add https://github.com/pstack-ports/droid-pstack
droid plugin install pstack@droid-pstack --scope user
```

Run `droid plugin marketplace list` to read the registered marketplace name if your CLI reports a different one.

Verify the installation:

```bash
droid plugin list
```

Skills load as `/poteto-mode`, `/how`, `/why`, and the rest of the [pstack skill set](https://github.com/cursor/plugins/blob/main/pstack/README.md#skills). The `poteto-agent`, `poteto-judgment`, and `comment-sicko` subagents are available as Task `subagent_type` values.
