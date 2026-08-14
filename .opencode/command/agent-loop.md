---
description: Run the Agent Loop Framework on a plan, task, or feature.
agent: build
---

Run the Agent Loop Framework at `/Users/chinchujose/build/agent-loop-framework` to execute the plan, task, or feature specified in the arguments.

Load the `agent-loop` skill and follow its instructions exactly.

If `$ARGUMENTS` is a plan path (for example `plans/<name>.md`): `Run Agent Loop on $ARGUMENTS.` Treat the target repository (current workspace) as the workspace.

If `$ARGUMENTS` is empty or says resume: `Resume Agent Loop.` Read `.agent-loop/state/project_state.json`, select the next eligible task, and continue without recompiling the original plan.
