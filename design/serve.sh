#!/usr/bin/env bash
# Serve the design preview on localhost:8888 and open in browser
cd "$(dirname "$0")"
echo "Serving design preview at http://localhost:8888/preview-all.html"
open "http://localhost:8888/preview-all.html"
python3 -m http.server 8888
