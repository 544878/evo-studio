# Evo Studio

Coordinate local agent work from the command line. Each ticket has an owner, a write scope and a revision. Submit an artifact, inspect its exact bytes, request a revision and export selected work after review. The same local ledger holds workflow improvements and a private growth journal.

**Developer preview.** Requires Node 24.12 or newer with built-in TypeScript and SQLite support. No service account or runtime package installation is required. [中文指南](docs/guide.zh.md) · [Report](REPORT.md) · [Architecture](docs/architecture.md) · [Verification status](docs/status.md)

## Try a four-role handoff

Run these commands from the checkout in a POSIX shell. Choose a fresh private state directory. Existing directories retain their permissions. The event numbers below apply to an empty ledger.

```sh
export EVO_HOME="$(mktemp -d)"
node apps/cli.ts ticket opener motion film "Render a title card"
node apps/cli.ts ticket catalog curator library "Catalog the approved title" opener
node apps/worker.ts opener node profiles/demo/render.ts
node apps/cli.ts attention
hash=$(node apps/cli.ts attention | node --input-type=module -e 'import {readFileSync} from "node:fs"; console.log(JSON.parse(readFileSync(0,"utf8"))[0].hash)')
node apps/cli.ts artifact "$hash" > "$EVO_HOME/opener.svg"
```

Inspect opener.svg in the private state directory. Use the version printed by attention for the review decision. With the sequence above it is 4.

```sh
node apps/cli.ts accept opener 4 reviewer "Opened the SVG and checked the title"
node apps/cli.ts start catalog 2 curator
node apps/cli.ts board
node apps/cli.ts graph
node apps/panel.ts
```

The desk opens at http://127.0.0.1:4173 when you visit it. This single-user loopback page displays ticket identifiers, dependencies, states and a review count. Local processes can read it. Use the owner's local events command to inspect journal text or workflow changes. Refresh to see new events. Stop the server with Ctrl-C. Use the manager role to return blocked tasks to the queue. Use the reviewer role to return submitted work. Both actions take the current version and a reason. The manager can produce work and return a blocked manager ticket. A separate reviewer role accepts submitted work. All CLI calls run under the local owner's authority.

## Connect a worker

Run `node apps/worker.ts TICKET PROGRAM [ARG ...]`. A trusted executable reads one JSON object from stdin containing the ticket, its work context, prior events and reviewed dependencies. A successful exit with nonempty stdout submits those bytes as the artifact. Send diagnostics to stderr. The default limit is 8 MiB and two minutes. An interrupted active ticket can be handed back using its displayed revision. Worker processes inherit local user privileges. Write scopes coordinate workers that use this ledger.

## Capture growth and improve a role

```sh
node apps/cli.ts remember motion "Learned how to check text contrast"
node apps/consolidate.ts
node apps/cli.ts events
node apps/cli.ts promote-memory motion REFLECTION_EVENT
node apps/consolidate.ts
node apps/cli.ts context motion companion
```

Consolidation produces a seven-day journal and Markdown knowledge pages under EVO_HOME. Schedule consolidation with `node apps/consolidate.ts --nightly` to run at 02:00 local time while the process is alive. Work context includes approved workflow rules. Companion context includes the last five entries for that role. An external model can consume either context.

After a handback or review return, propose one rule with `node apps/cli.ts propose ROLE EVENT "RULE"`. Inspect the recorded base and proposal. Run the affected regression and obtain independent review. Use `node apps/cli.ts adopt ROLE PROPOSAL_EVENT report.json` with an evidence document containing:

```json
{"role":"motion","proposal":10,"ruleDigest":"sha256-of-exact-rule-text","reviewer":"reviewer","checks":[{"name":"title remains visible","expected":"visible","actual":"visible"}]}
```

This is example data. Compute ruleDigest as lowercase SHA-256 over the exact UTF-8 rule text, including spaces and excluding any shell-added newline. The owner attests to the observations. The engine checks the target, current base, reviewer label and equality of expected and actual observations. Use `node apps/cli.ts rollback ROLE` to undo the latest promotion. Runtime permission rules live outside these editable role steps.

## Share selected text

For a portfolio draft use `node apps/cli.ts draft opener portfolio "Reviewed title card"`. Read the exact draft in the event ledger, then `node apps/cli.ts approve HASH DESTINATION`. Use `node apps/cli.ts export DESTINATION` to write approved content to stdout. Portfolio export encodes HTML text. Article and release exports contain plain text. An approval authorizes a local export for one destination. The filter checks common sensitive formats. Review the full text, identity and publication rights before distributing an export.

## Receive feedback and deliver a local release draft

Use `node apps/cli.ts intake issue EXTERNAL_ID TITLE` to record feedback once. The identifier can be an issue URL or an adapter event ID. Route its returned key with `node apps/cli.ts route KEY ID ROLE SCOPE POLICY_VERSION`. The mandate and ticket commit together. Use `node apps/cli.ts deliver APPROVED_HASH` to materialize a reviewed draft under the private outbox. Repeating delivery checks the existing bytes and records one receipt. After interruption, repeat the same command. Third-party posting remains a separate integration.

## Maintain

```sh
npm ci
npm run check
npm test
node apps/cli.ts --help
```

The end-to-end script creates a temporary database and invokes real CLI processes. See [scope and open engineering work](docs/status.md) before using this preview with private data.
