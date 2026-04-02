#!/usr/bin/env python3
"""
Dev server for the DOOR Ministry Map standalone demo.

Serves the door-map-documented/ directory on http://localhost:8080
and opens demo.html in the default browser automatically.

Usage:
    python serve.py            # default port 8080
    python serve.py 3000       # custom port
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

# Always serve from the folder that contains this script
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler with request logging suppressed."""

    def log_message(self, fmt, *args):
        # Uncomment the line below to see every request in the console:
        # print(f"  {self.address_string()}  {fmt % args}")
        pass


url = f"http://localhost:{PORT}/demo.html"
print(f"\n  DOOR Ministry Map demo")
print(f"  {url}")
print(f"\n  Press Ctrl+C to stop.\n")

try:
    with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
        # Allow quick restarts without 'address already in use' errors
        httpd.socket.setsockopt(__import__("socket").SOL_SOCKET,
                                __import__("socket").SO_REUSEADDR, 1)
        webbrowser.open(url, new=2)
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n  Server stopped.")
except OSError as e:
    print(f"\n  Error: {e}")
    print(f"  Port {PORT} may already be in use.")
    print(f"  Try:  python serve.py 3000")
    sys.exit(1)