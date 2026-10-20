#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
if [ -z "$PROFILE" ]; then
  echo "Set PROFILE to the certificate profile created in Tizen Studio." >&2
  exit 2
fi
rm -rf "$HERE/build" && mkdir -p "$HERE/build"
mkdir -p "$HERE/build/package"
cp -R "$HERE/app/." "$HERE/build/package/"
if [ ! -d "$HERE/wallpaper" ]; then
  echo "Missing wallpaper source folder: $HERE/wallpaper" >&2
  exit 1
fi
mkdir -p "$HERE/build/package/wallpaper"
for source in "$HERE"/wallpaper/*.jpg "$HERE"/wallpaper/*.jpeg "$HERE"/wallpaper/*.png; do
  [ -f "$source" ] || continue
  filename="$(basename "${source%.*}").jpg"
  sips -s format jpeg -s formatOptions 84 --resampleWidth 1920 \
    "$source" --out "$HERE/build/package/wallpaper/$filename" >/dev/null
done
tizen package -t wgt -s "$PROFILE" -o "$HERE/build" -- "$HERE/build/package"
ls -l "$HERE"/build/*.wgt
