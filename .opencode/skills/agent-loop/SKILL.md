---
name: agent-loop
description: Execute a plan, task, or feature using the Agent Loop Framework. Use when the user says "run agent loop", "execute the plan", "run the loop on <plan>", or asks to plan or carry out a feature, bug, or task through the framework at /Users/chinchujose/build/agent-loop-framework.
---

# Agent Loop

Execute the plan, task, or feature through the Agent Loop Framework at `/Users/chinchujose/build/agent-loop-framework`. The framework is the single operating model for this project's work — do not plan, change, or add work outside of it.

## Start

1. Read the framework docs first: `docs/usage.md`, `docs/workflow.md`, and `README.md`.
2. Confirm the target repository (the current workspace) and the framework path.
3. Load the supervisor role: read `agents/supervisor.md`.
4. Bootstrap `.agent-loop/` in the target repository if it does not exist: `state/`, `reports/`, `logs/`, `memory/`.
5. Run the loop: supervisor → discovery → planning → development → review → QA → validation → documentation.

## Invocations

- **Run a new work package**: given a plan path (e.g. `plans/offline-mode.md`), say `Run Agent Loop on <plan-path>` and treat the target repository as the workspace.
- **Resume**: when `.agent-loop/state/project_state.json` exists, resume from state. Do not recompile the original plan; only re-run discovery if state is missing, stale, or materially invalidated.
- **Add work after bootstrap**: write a plan under `plans/`, then run the loop on it, reconciling with current `.agent-loop/state/`.

## Non-negotiable rules

- `project_state.json` is canonical; `progress.md` is the readable mirror.
- Only the supervisor changes global phase, chooses the next role, or closes a work package.
- Each worker performs one bounded task, writes a report, and returns control to the supervisor.
- QA reports failures; it never silently changes production code. The bug fixer owns corrective changes.
- Passing tests are evidence, not proof of completion — the validator must verify the plan's acceptance criteria.
- Preserve user changes and existing test failures; attribute baseline failures before treating them as regressions.
- Never reset, discard, or overwrite target project work to make state look clean.

## Completion

A work package is complete only when its tasks are terminal, required checks passed (or have an accepted exception), validation accepts each acceptance criterion, and a final report identifies residual risk. "Build passes" alone is not completion.

Ask before actions requiring new authority: publishing, deployments, destructive migrations, paid services, credential changes, or ambiguity that materially changes product behaviour.
