# Four-model joint release: working brief

Updated 2026-10-17. Planned angle: **Who builds the best physical world?**

This is a working publication plan. The joint Blog remains in preparation; updating the local website or importing results does not authorize publishing it.

## Current evidence

Three flagship models now have owner-published results; Gemini is the only model still Testing / Coming soon.

| Model | Formal V2WScore | Task success | Stage progress | Build rate |
| --- | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 52.41 | 33.6% | 0.61 | 92.3% |
| GPT-6.1 Sol | 41.19 | 10.9% | 0.30 | 91.0% |
| Meta Muse Wonder | 27.90 | 2.8% | 0.08 | 86.7% |
| Gemini 4 Argon | Testing | — | — | — |

These belong to `v2-published-2026-10-17`: 222 instances / 39 task families. Formal scores are copied from the final owner-published table. Component metrics follow the dashboard's scoped family-macro aggregation and retain per-metric coverage. This reads saved records; it is not a fresh full runtime reevaluation. See [the snapshot and aggregation guide](../RESULT_SNAPSHOT_2026-10-17.md).

The 9 October screenshot snapshot is archived separately, and the paper results remain another historical set. Current Opus 5.5 task success is about 2.61× Opus 5's current 12.9%, calculated before rounding; older promotional ratios must not be reused.

## Website and report structure

The homepage prioritizes overall ranking and per-model metric dialogs, retains Yangjing's palette, and has no tier groupings or interactive two-model difference section. News retains every published report as new results arrive, plus the pending Gemini entry.

Each model has an independent report. Findings can discuss build rate, task completion, geometry and dynamics with coverage and matching cases. Feedback use, recovery and iterative repair require process logs; final scores and rollouts alone do not establish them. Agent harnesses differ, so results describe tested configurations rather than a controlled intervention on model identity alone.

The homepage has five same-input cases with four model positions. Opus, GPT and Muse have actual rollouts and formal judgments; Gemini remains Coming soon. The measured models use byte-identical source inputs on each case, checked by source hashes. The cases originally favored the Opus-success / Fable-failure contrast: they illustrate outcomes and do not estimate aggregate four-model performance or a complete failure profile.

## Materials to finish

1. Gemini's verified score, components, scope, configuration and independent report.
2. One four-model score card from a compatible frozen snapshot, naming exact model and agent settings actually supplied.
3. A same-video execution difference, plus a failure or diagnostic counterexample.
4. A reviewed joint article linked to all four reports and the full leaderboard.

Jinzhou's comparison article is a separate editorial workstream. The original reference is [the supplied Claude artifact](https://claude.ai/artifact/Fe1L5uHRhZPDtipym5sZF1); this brief does not claim the article has been completed, updated or published.

## Joint opening draft — finish only after Gemini is verified

> Who builds the best physical world?
>
> We evaluated Opus 5.5, Gemini 4 Argon, Meta Muse Wonder and GPT-6.1 Sol with Video2World: given an embodied video, a coding agent recreates the interaction in simulation.
>
> [VERIFIED_FOUR_MODEL_FINDING_FROM_THE_FINAL_COMPATIBLE_SNAPSHOT]
>
> Inspect the scores, coverage and actual executions: [PUBLIC_ROUNDUP_URL]

Do not publish this placeholder draft. A model may lead a component without leading the total score. Cost or feedback advantages require their own evidence; keep the story tied to measured findings.

## Publication gate and handoff

After all four results, scope, configurations and evidence have been reviewed, finish the article and obtain publication approval. Then add a reviewed `kind: roundup`, `status: published` entry with a real date and existing target to `site/data/news.json`; set `campaign.roundup_href` to that target and `campaign.publication_status` to `published`.

Until then, retain `publication_status: in_preparation` and no roundup link. Four score rows alone do not publish the article. Model reports can be reviewed independently; a model result is not approval to send social posts or deploy the website.

Findings and evidence priorities live in `site/data/model-analysis.json`. The importer accepts reviewed `analysis` only with `analysis_verified: true`; a numerical result can otherwise use neutral copy while analysis is prepared.
