"""Copy the leaderboard (site/) into the main project site, replacing the previous copy.

    python scripts/sync-to-main-site.py --main-site /path/to/web_v2

Result: <main-site>/public/leaderboard/ is an exact copy of site/. The main site then serves it
at /Video2World/leaderboard/ and its "NEW" pill reads leaderboard/data/news.json at build time.
"""
import argparse
import shutil
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / "site"

parser = argparse.ArgumentParser()
parser.add_argument("--main-site", required=True, help="main site project folder (contains public/ and src/)")
args = parser.parse_args()
main = Path(args.main_site).resolve()
if not (main / "public").is_dir() or not (main / "src").is_dir():
    raise SystemExit(f"{main} does not look like the main site project (expected public/ and src/)")
target = main / "public" / "leaderboard"
if target.exists():
    shutil.rmtree(target)
shutil.copytree(SITE, target, ignore=shutil.ignore_patterns(".DS_Store"))
files = sum(1 for p in target.rglob("*") if p.is_file())
print(f"Copied {files} files to {target}")
