"""Static server for the render pages; POST /save?name=X writes out/X.png (127.0.0.1 only)."""

import http.server
import os
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=HERE, **k)

    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(q.get("name", ["sheet"])[0])
        n = int(self.headers.get("Content-Length", 0))
        with open(os.path.join(HERE, "out", name + ".png"), "wb") as f:
            f.write(self.rfile.read(n))
        self.send_response(200)
        self.end_headers()


http.server.ThreadingHTTPServer(("127.0.0.1", 8765), H).serve_forever()
