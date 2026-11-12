#!/bin/sh
# Project toolchain on the Jenkins agent (equivalent of .github/actions/project-setup).
# Project-owned file: created once, never overwritten by a plugin update.
# Install the language, the package manager and the dependencies of the chosen stack here,
# before "node .bootstrap/run-checks.mjs". Example: npm ci, pip install -r requirements.txt.
set -eu
