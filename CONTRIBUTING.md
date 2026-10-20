# Contributing

Thanks for helping make this launcher more useful on real Samsung TVs.

## Before changing code

- Read `README.md` and inspect the Tizen version and app structure first.
- Keep changes scoped; this app is plain HTML, CSS and JavaScript for the
  Samsung TV web runtime. Do not add a framework or build dependency without
  discussing the effect on older TV runtimes.
- Preserve arrow/Enter/Back navigation, focus visibility, the 1920×1080 stage,
  and the single selected-app preview.
- Keep user settings local. Do not add analytics, telemetry, remote script
  loading, or secret/token storage.
- Use installed-app IDs and icon paths observed on a device; avoid guessing
  IDs from store URLs or matching only by display name.

## Test and report

- Run `node --check app/js/app.js`, `node --check app/config.js`,
  `node --check app/custom.js`, and `bash -n scripts/build.sh scripts/install.sh`.
- Build with a locally created Tizen certificate profile.
- For UI changes, test the browser preview at 1920×1080 and exercise remote
  focus, Enter, Back, empty/error states, and saved preferences.
- For device-dependent changes, report the TV model, firmware/Tizen version
  when known, what was tested on-device, and what remains unverified.
- Never include a TV DUID, local IP, certificate/profile name, private logs,
  passwords, keys, or personal wallpaper in an issue or pull request.

## Pull requests

Open a focused PR with the behavior change, test evidence, and any device or
firmware limitations. Separate UI-only changes from TV installation or
Home-button changes so reviewers can see where real hardware is required.
