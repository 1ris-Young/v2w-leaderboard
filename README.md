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
| `scripts/` | Preview, checks, adding a model, copying into the main site |
| `templates/` | Page template used by `scripts/add-model.py` for a new model update |
| `examples/` | Receipt formats for adding a model's results and verified cases |
| `source-media/` | Original case videos with manifest and checksums (web copies live in `site/assets/`) |
| `main-site/` | The change to the main site that adds the Leaderboard link and the "NEW" pill |
| `docs/promotion/` | Launch and post drafts |

## Commands

```bash
python scripts/preview-server.py --port 8765          # preview at http://localhost:8765/
node scripts/check.mjs                                 # data, links and assets
node scripts/check-interactions.mjs                    # page behaviour
python scripts/sync-to-main-site.py --main-site PATH   # copy site/ into the main site's public/leaderboard/
```
