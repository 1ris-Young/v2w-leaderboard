# Four-model joint release: working brief

Updated 2026-10-17. Planned angle: **Who builds the best physical world?**

This is a working plan for a four-flagship comparison article. That article remains in preparation; updating the local website or importing results does not publish it. The company Blog / Jinzhou's method explanation and technical report is a separate editorial workstream, whose publication is not gated on Gemini or four result rows.

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

The publication surfaces have four roles: the existing public project page and arXiv introduce the research; the company Blog / Jinzhou's technical report explains the method; independent News announces each newly tested model; and the leaderboard presents the overall ranking. The public project page's leaderboard entry is still reserved rather than connected. Its upper-right floating News entry is intended to direct readers to independent News. Do not describe the prepared leaderboard or company Blog as already public without checking its actual publication state.

The leaderboard retains Yangjing's palette, overall ranking and per-model metric dialogs, with no tier groupings or interactive difference section. A compact, chronological News feed at its top links individual update lines to model reports. Independent News retains the complete history of reports and the pending Gemini entry; it is a separate destination from this small feed.

Each newly tested model has an independent report. Organize its findings around build, geometry, dynamics and functionality, with coverage and matching cases. For a strong model, illustrate a measured advantage with its actual successful execution beside another model's formal failure on the same input. Feedback use, recovery and iterative repair require process logs; final scores and rollouts alone do not establish them. Agent harnesses differ, so results describe tested configurations rather than a controlled intervention on model identity alone.

The homepage has five same-input cases comparing GPT-6.1 Sol, Claude Fable 5.1, Muse Wonder and Opus 5.5, all with actual rollouts and formal judgments. Gemini remains Coming soon in News and the four-vendor campaign. The displayed models use byte-identical source inputs on each case, checked by source hashes. The cases originally favored the Opus-success / Fable-failure contrast: they illustrate outcomes and do not estimate aggregate four-model performance or a complete failure profile.

## Materials to finish

1. Gemini's verified score, components, scope, configuration and independent report.
2. One four-model score card from a compatible frozen snapshot, naming exact model and agent settings actually supplied.
3. A same-video execution difference, plus a failure or diagnostic counterexample.
4. A reviewed joint article linked to all four reports and the full leaderboard.

Jinzhou's company Blog is a method explanation / technical report, with its own author and editorial decisions. The original reference is [the supplied Claude artifact](https://claude.ai/artifact/Fe1L5uHRhZPDtipym5sZF1); this brief does not claim that article has been completed, updated or published, and does not assign it a new public URL. Its publication can proceed independently of the four-model comparison's result-completion gate.

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

For the four-model comparison article, review all four results, scope, configurations and evidence, then finish the article and obtain publication approval. Add a reviewed `kind: roundup`, `status: published` entry with a real date and existing target to `site/data/news.json`; set `campaign.roundup_href` to that target and `campaign.publication_status` to `published`. These campaign fields describe the four-model comparison, not the company technical Blog.

Until then, retain `publication_status: in_preparation` and no roundup link for the comparison. Four score rows alone do not publish the article. Model reports and the company technical Blog follow their own review workflows; a model result is not approval to send social posts or deploy the website.

Findings and evidence priorities live in `site/data/model-analysis.json`. The importer accepts reviewed `analysis` only with `analysis_verified: true`; a numerical result can otherwise use neutral copy while analysis is prepared.
