"""Local preview of the leaderboard site (site/), with UTF-8 text responses and no caching.

    python scripts/preview-server.py --port 8765   ->   http://localhost:8765/
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "site"


class PreviewHandler(SimpleHTTPRequestHandler):
    def guess_type(self, path):
        mime = super().guess_type(path)
        if mime.startswith("text/") or mime in ("application/javascript", "application/json"):
            return mime + "; charset=utf-8"
        return mime

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("0.0.0.0", args.port), partial(PreviewHandler, directory=str(ROOT)))
    print(f"Preview: http://localhost:{args.port}/", flush=True)
    server.serve_forever()
