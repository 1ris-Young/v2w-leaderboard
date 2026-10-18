# Result snapshot as of 17 October 2026

This documents the prepared website snapshot `v2-published-2026-10-17`. It does not state that local changes have been deployed or an article approved for publication. The public project page and arXiv are existing entry points; the project's reserved leaderboard connection remains pending.

## Sources and scope

- [Current leaderboard data](../site/data/leaderboard.json) supplies website rows and per-metric instance coverage.
- [Snapshot receipt](../site/data/result-snapshot-2026-10-17.json) preserves formal scores, component aggregates, instance and family coverage, run IDs, publication timestamps and record hashes.
- Formal V2WScore values come from the final owner-published table, updated at `2026-10-17T15:07:46Z`; they are not recomputed from the displayed aggregate components.
- Components follow the owner's dashboard `scopedMetricTable` behavior on a common 222-instance / 39-family scope, with no rows excluded under the current scope contract.
- These are saved published records. A fresh full runtime reevaluation was not performed for this refresh.

## Four-flagship facts

| Model | V2WScore | Task success | Stage progress | Build rate |
| --- | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 52.41 | 33.6% | 0.61 | 92.3% |
| GPT-6.1 Sol | 41.19 | 10.9% | 0.30 | 91.0% |
| Meta Muse Wonder | 27.90 | 2.8% | 0.08 | 86.7% |
| Gemini 4 Argon | Testing | — | — | — |

Gemini has no score or outcome in this snapshot. Other measured configurations remain on the full leaderboard.

Claude Opus 5 task success is `12.866214981599596%`; Opus 5.5 is `33.565814527352984%`. Their ratio is approximately **2.61×**, an increase of **20.7 percentage points**, calculated before rounding. These family-macro percentages cannot be multiplied by 222 to infer passed-instance counts.

## Exact component aggregation and missing values

1. Match rows by `(family, sample)` to the common manifest. A missing or duplicated included row makes that model's scoped table unavailable; a partial manifest is not silently treated as complete.
2. For each metric, initialize the 39 family groups and apply the status rules below before collecting finite numeric values.
3. Average finite values within each family. Multiply rate metrics by 100; progress stays a 0–1 ratio.
4. Average available family means equally. A family without a finite value for that metric is omitted from its macro average, rather than filled with zero.
5. Instance coverage `n` counts finite values after status treatment; family coverage counts families with a finite mean. Preserve both alongside the fixed total scope of 222 / 39.

For statuses `method_failed`, `blocked`, `method_failure`, `executor_error`, `cancelled`, `loop_detected` and `budget_stopped`, the dashboard sets `task_success` to zero. It retains recorded values for `progress`, `ref_task_success`, `ref_progress` and `build`, counting them only when finite. Other component values for those statuses are excluded. Missing or non-finite values elsewhere are also excluded, not universally converted to zero.

This differs from the **formal score** rule: all agent-side failures, including build failure, invalid package or no delivery, and evaluator-side blocked rows contribute `S = 0` while remaining in the common score denominator. The owner describes row scores as `S = build × (F + G + D) / 3`, followed by within-family averaging, equal family weighting and multiplication by 100. This website copies that formal score instead of reconstructing it from raw aggregate columns.

The score uses the owner's current rev5 snapshot and contract amendments. It is not interchangeable with historical paper scoring or its human-assisted reference. Special treatment of Fable 5.1 / GPT-6 Astra nesting-doll cases follows the owner's evaluator decision; this website adds no new scoring adjustment.

## Coverage for measured flagship models

Each cell is **finite instances / contributing families**. For formal V2WScore it is the common score denominator, rather than raw finite-value coverage.

| Metric | Opus 5.5 | GPT-6.1 Sol | Muse Wonder |
| --- | ---: | ---: | ---: |
| Formal V2WScore denominator | 222 / 39 | 222 / 39 | 222 / 39 |
| Task success | 222 / 39 | 222 / 39 | 222 / 39 |
| Stage progress | 213 / 36 | 212 / 36 | 211 / 36 |
| Scene CD | 211 / 35 | 209 / 35 | 206 / 33 |
| Object shape CD | 211 / 34 | 208 / 34 | 208 / 34 |
| Object size error | 211 / 34 | 208 / 34 | 208 / 34 |
| Terminal relative translation error | 160 / 23 | 158 / 23 | 157 / 23 |
| Terminal relative rotation error | 72 / 13 | 69 / 12 | 71 / 12 |
| Fixed-reference task success | 179 / 26 | 177 / 26 | 175 / 26 |
| Fixed-reference progress | 179 / 26 | 177 / 26 | 175 / 26 |
| Fixed-reference translation APE | 179 / 26 | 177 / 26 | 175 / 26 |
| Build rate | 221 / 39 | 221 / 39 | 222 / 39 |

Agent harnesses and supplied settings are part of each tested configuration. Retain model IDs, runs, evaluator / contract versions and manifest hashes; do not infer equal effort or budgets where settings were not reported.

## Historical isolation

The [9 October supplied screenshot](../site/data/archive/2026-10-09-leaderboard.json) is retained unchanged as history. Its 29.4% Opus 5.5 success, mixed coverage and 2.56× comparison are not current facts. The refreshed components use common-scope saved records; this is not evidence of new training or a fresh runtime improvement between the dates.

[Paper-era results](../site/data/paper-results.json) and the human-assisted reference are another separate set. Do not combine a current component with an archived score or use a paper model's video as a new model output.

## Same-input case evidence

[The homepage cases](../site/data/frontier-cases.json) retain five inputs with four comparison positions: GPT-6.1 Sol, Claude Fable 5.1, Meta Muse Wonder and Claude Opus 5.5. Each has an actual rollout and formal judgment on the same source video; the Fable clips reuse the five existing verified outputs, all formally judged failed. Gemini is outside this homepage comparison and remains Testing / Coming soon in News and the four-vendor campaign.

| Selected case | GPT-6.1 Sol | Fable 5.1 | Muse Wonder | Opus 5.5 |
| --- | --- | --- | --- | --- |
| Desk leg insertion | Success | Failed | Failed | Success |
| Pick-and-place | Success | Failed | Success | Success |
| Two-handed lift | Failed | Failed | Failed | Success |
| Two-handed pick-and-place | Failed | Failed | Failed | Success |
| Lamp bulb insertion | Failed | Failed | Failed | Success |

The collection originally chose five of 24 Opus-success / Fable-failure pairs across 222 shared cases. It is an illustrative, directed selection, not a random sample estimating four-model win rates. Use the full leaderboard for aggregate findings. Formal outcomes alone do not establish feedback use, recovery or a failure's cause.

Three model reports are available in the prepared website. Independent News retains those reports, and the leaderboard's compact top News feed links each update to its model page; the project page's upper-right floating News entry is intended to direct readers to independent News.

The four-model comparison article remains in preparation until Gemini, protocol review, article review and publication approval are complete. The company Blog / Jinzhou's method explanation and technical report follows a separate editorial workflow; its publication is not gated on the number of flagship results. No company Blog URL or live-publication status is asserted here.
