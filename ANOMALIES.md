# Anomalies

Behavior of a harness or a model that broke what the kit asks of it, with no cause found. Each kind has a section
with the number of times it occurred and one row per occurrence. A kind is investigated once its occurrences point
at a cause, such as one model or one harness.

## Malformed outcome block of an orchestrator step

In a run of the orchestrator, the final response of a step held a block marked `json` that was not valid JSON, and
the run stopped.

Count: 1

| Date       | Project            | Unit                  | Role     | Harness  | Model              | Description                                                                                                                         |
|------------|--------------------|-----------------------|----------|----------|--------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| 2026-11-20 | aloudrite-intellij | 0029-choose-the-voice | reviewer | opencode | openai/gpt-6.1-sol | Run 2026-11-20T15:22:52Z, step 2: a stray token `enton` stood before `"blocking"` in the first finding. The run stopped with status 3 |
