#!/usr/bin/env bash
# Build, sign, install and start the launcher on the TV. Safe to re-run (updates in place).
set -euo pipefail
source "$(dirname "$0")/env.sh"
if [ -z "$PROFILE" ] || [ -z "$TV_IP" ]; then
  echo "Set PROFILE and TV_IP for your own TV before installing." >&2
  echo "Example: PROFILE=MyTV TV_IP=192.168.1.50 ./scripts/install.sh" >&2
  exit 2
fi
SDB="$TIZEN_HOME/tools/sdb"
"$SDB" connect "$TV_IP" || true
if [ "$("$SDB" -s "$TV_SERIAL" get-state)" != "device" ]; then
  echo "TV is not ready for SDB installs: $TV_SERIAL" >&2
  exit 1
fi
"$SDB" devices
"$HERE/scripts/build.sh"
WGT="$(ls "$HERE"/build/*.wgt | head -1)"
tizen install -s "$TV_SERIAL" -n "$(basename "$WGT")" -- "$HERE/build"
tizen run -s "$TV_SERIAL" -p "$APP_ID"
echo "Installed and launched. If the Home resolver was reset, assign $APP_ID in the TV's Home app settings."
