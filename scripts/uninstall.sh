#!/usr/bin/env bash
# Removes ONLY this launcher. Touches no system or Samsung package.
set -euo pipefail
source "$(dirname "$0")/env.sh"
"$TIZEN_HOME/tools/sdb" connect "$TV_IP"
tizen uninstall -s "$TV_SERIAL" -p "$PKG_ID"
echo "Launcher removed. The TV's normal home screen is untouched."
