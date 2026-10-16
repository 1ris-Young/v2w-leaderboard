# Video2World leaderboard

The live leaderboard of the Video2World benchmark, served by the main project site at
`https://aetherlabsai.github.io/Video2World/leaderboard/`.

It is a static site: plain HTML, CSS, JavaScript and JSON, with no build step.

## Folders

| Folder | Contents |
| --- | --- |
| `site/` | The website itself. Edit here. |
| `site/data/` | Results (`leaderboard.json`), News (`news.json`), published paper results, case lists |
| `site/updates/` | One page per model update (e.g. `opus-5-5.html`) |
| `scripts/` | Preview, checks, adding a model |
| `templates/` | Page template used by `scripts/add-model.py` for a new model update |
| `examples/` | Receipt formats for adding a model's results and verified cases |
| `source-media/` | Original case videos with manifest and checksums (web copies live in `site/assets/`) |
| `docs/promotion/` | Launch and post drafts |

## Commands

```bash
python scripts/preview-server.py --port 8765          # preview at http://localhost:8765/
node scripts/check.mjs                                 # data, links and assets
node scripts/check-interactions.mjs                    # page behaviour
```

How we work together: see `CONTRIBUTING.md`.


## Ranking and model reports

The homepage leads with the overall ranking. Select a model to inspect its full metric profile and coverage. News links to four flagship model reports; pending reports show Testing until verified results are imported.

Edit report findings and evidence priorities in `site/data/model-analysis.json`, and keep the related metrics and case IDs traceable. Feedback and recovery claims need iteration logs. The joint blog remains in preparation until the four-model protocol and evidence review is complete; adding four score rows does not publish it automatically.
