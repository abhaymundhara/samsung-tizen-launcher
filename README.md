# Samsung Tizen launcher

A personal, remote-first home screen for Samsung Tizen TVs. It is a normal
signed Tizen web app: it does not root the TV, replace the operating system, or
disable Samsung services. The current setup was developed on a QN90BA running
Tizen 6.5; firmware and compatibility with other models are not yet verified.

The visual direction borrows the calm list/dock, photographic backgrounds,
and clear remote focus of [CleanFrame](https://github.com/nthnclrk/CleanFrame),
then adapts it for this launcher and TV. The focused app's icon is shown once
in the large right-side preview; list rows remain text-only.

## Preview and install

1. Install Tizen Studio and create your own TV certificate profile.
2. Update the app identity in `app/config.xml` and the matching `APP_ID` and
   `PKG_ID` in `scripts/env.sh` if you are making a separate build.
3. Enable Developer Mode on your TV and connect it to the same network as the
   development computer.
4. Add images to the top-level `wallpaper/` directory, then set your profile
   and TV address when building or installing:

   ```sh
   PROFILE=MyCertificate ./scripts/build.sh
   PROFILE=MyCertificate TV_IP=192.168.1.50 ./scripts/install.sh
   ```

`scripts/install.sh` signs, installs and starts the app. The TV's Home-button
assignment is a separate, device-specific setting; keep Samsung Home available
as a recovery path and verify the behavior on your own firmware. Increase the
`version` in `app/config.xml` for each update. To uninstall this app, run
`./scripts/uninstall.sh`.

The current `scripts/env.sh` intentionally has no default TV address or
certificate-profile name. Never commit certificate files, DUIDs, TV network
addresses, or credentials.

## Customize on the TV

Use the remote's All apps utility to choose an installed app. The app library
reads installed app IDs and icon paths from Tizen's application registry.
Select an app and press the green remote key to pin or unpin it; the large
preview uses that app's installed icon. The four configured streaming/browser
shortcuts prefer the TV's Smart Hub icon files and fall back to Tizen's icon
path. Pinned shortcuts reorder by most recently opened and stay saved on the TV.

In All apps, press the blue key (or select **Add a website**) to create an
HTTPS shortcut. Enter a label and URL with the TV keyboard. It opens in the
configured TV browser. A custom website can be unpinned with green; press red
twice to remove a user-added website. The built-in Apne TV shortcut can be
unpinned but is not deleted from source configuration.

Home settings let you change list/dock layout, surfaces, focus treatment,
typography, greeting name, automatic or custom greeting text, and background.
**Add wallpaper** opens the device's file chooser when supported. Images are
resized to fit 1920×1080 and stored locally on the TV; up to six personal
wallpapers are kept. Choose a personal background and use **Remove selected
wallpaper** to delete that saved image. If the TV does not expose a file
chooser, add JPEG/PNG images to the repository's `wallpaper/` folder and
rebuild/reinstall; the build script copies those images into the package.

The wallpaper advances at the configured interval (60 seconds by default),
and catches up when Home becomes visible again.

## Add a custom JavaScript widget

`app/custom.js` is a local, user-owned extension point. It is loaded from the
signed package (never fetched remotely) and can register up to three small
widgets in the right-side panel:

```js
window.LauncherWidgets.register({
  id: "my-widget",
  title: "MY WIDGET",
  render: function (root, context) {
    var line = document.createElement("div");
    line.textContent = "Focused app: " + context.selectedApp;
    root.appendChild(line);
  }
});
```

The context provides the current name, selected app, wallpaper label, and
current time. Edit `app/custom.js`, increment the app version, then build and
install again. Custom JavaScript is trusted code running inside the launcher:
review it before installing. Widgets should be small and avoid polling while
hidden. Network access is not enabled by default; if a widget needs a public
API, declare only that HTTPS origin and the required Tizen internet privilege
in `config.xml`. Do not put API tokens or other secrets on the TV. Never load
remote JavaScript.

## Source configuration

`app/config.js` defines the initial greeting, wallpaper rotation interval,
appearance defaults, hidden app IDs, exact app aliases/icons, and initial
shortcuts. User changes are stored in local storage on the TV. Use the TV UI
for normal pinning and website creation; edit `config.js` for the shipped
defaults or add support for another app's icon aliases.

The app list is not a package manager. It only launches installed apps or
HTTPS links in the configured browser. It does not uninstall apps or modify
telemetry/system services.

## Contributing

This is a TV-specific starting point, not a compatibility promise. Before
opening a PR, check `CONTRIBUTING.md`. Include the TV model and firmware only
if known; redact device IDs, local IPs, certificate names, logs containing
personal data, and secrets. Browser-only UI changes should preserve remote
navigation and be tested at 1920×1080. Installation and Home-button behavior
must be verified separately on real hardware.
