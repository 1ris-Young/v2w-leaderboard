# Video2World leaderboard

The prepared leaderboard and model-report site for the Video2World benchmark. Its target address is
`https://aetherlabsai.github.io/Video2World/leaderboard/`; the public project page has a reserved leaderboard entry that has not yet been connected to this site.

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

Four publication surfaces have distinct roles:

| Surface | Role and current status |
| --- | --- |
| Project page + arXiv | Existing public research entry points; the leaderboard connection is still pending. The project page's upper-right floating News entry is intended to lead to the independent News page. |
| Company Blog / Jinzhou's article | Method explanation and technical report, with its own author and editorial process. Its publication does not depend on the number of flagship result rows. No company Blog URL or publication state is asserted here. |
| Independent News page | A history of newly evaluated models, with one report page per model. Reports connect build, geometry, dynamics and functionality to metrics and actual executions. |
| Leaderboard | Overall ranking with metric dialogs. A compact, chronological News feed at the top links each update to its model report; the independent News page retains the complete report history. |

Pending model reports show Testing until verified results are imported. For a strong model, use a genuine same-input success-versus-failure contrast to explain its measured advantage, while retaining the case-selection caveat.

Edit report findings and evidence priorities in `site/data/model-analysis.json`, and keep the related metrics and case IDs traceable. Feedback and recovery claims need iteration logs. A separate four-flagship comparison article can wait for all four compatible results and editorial review; that gate does not apply to the company technical Blog. Adding score rows does not automatically publish either article.
