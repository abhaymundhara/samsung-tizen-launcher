# X Article draft — not posted

> Before publishing: this working folder has no Git remote, so replace
> `[PUBLIC REPOSITORY LINK]` with the real public URL after the source is
> published and reviewed. This draft intentionally omits TV IPs, DUIDs,
> certificate paths/names, private logs, and credentials.

# I gave my Samsung TV a calmer home screen—and made it hackable

Samsung's TV interface is built to promote Samsung's services. I wanted
something simpler: a quiet screen, my own wallpaper, the apps I actually use,
and a Home button that takes me back to my own launcher.

I built a small Tizen web app for a Samsung QN90BA running Tizen 6.5. It is a
plain HTML/CSS/JavaScript launcher signed with my own Tizen certificate. It
doesn't root the TV, replace Tizen, or claim to disable Samsung telemetry. The
stock system remains there as a recovery path.

The design started with a reference from X and ideas from
[CleanFrame](https://github.com/nthnclrk/CleanFrame): make the photo and the
content feel intentional, keep the controls legible from the sofa, and let the
remote—not a mouse—drive the whole thing. In this version, app names form a
clean list and only the focused app's original TV icon appears in the large
right-side preview. The wallpaper rotates, recent apps move forward, and the
greeting is editable instead of being welded into the source.

## What I learned the hard way

Tizen is not Android with a different skin. A signed web app can launch apps,
but installing a launcher does not automatically make the physical Home key
open it. App installation, Home-button routing, and boot behavior are separate
problems; test each separately and keep a way back to Samsung Home.

The IDs shown in a store and the IDs returned by the TV's app registry do not
always look alike. Display names can vary by region, and a plausible icon can
still be the wrong icon. I ended up using the installed app metadata and the
TV's own icon files, with a fallback path, instead of inventing logos from
text. Firmware or region changes may still move those files.

There is another TV-specific trap: when a streaming app takes over the screen,
the launcher's JavaScript may be paused. A timer that works perfectly in a
browser is not a reliable way to force the launcher back after every app
closes. Treat automatic return as experimental; don't turn it into an
unbounded relaunch loop.

Finally, the first UI build is not the last UI build. I had to make the
installed package version advance before the TV accepted an update, and
confirm that the signed package—not just my edited source—was what the TV was
running. The exact firmware on this TV was not recorded, so compatibility
claims beyond the tested setup would be premature.

## Try it and make it yours

The project is intended as a starting point, not a universal TV image. Once
the source is published, clone **[PUBLIC REPOSITORY LINK]**, read the README
and `CONTRIBUTING.md`, and inspect the app IDs and certificate instructions
before installing anything. Start with the browser preview or source changes;
only move to a real TV when you understand the target model, firmware,
developer-mode setup, and recovery path.

You can pin apps already installed on the TV, add HTTPS website shortcuts,
choose personal wallpapers, edit the greeting, and write small local widgets
in `app/custom.js`. The widget hook is deliberately local: it does not fetch
and execute JavaScript from a remote server. If you add a network-backed
widget, request only the specific origin it needs and never store an API token
on the TV.

The Home-button setting is device-specific. Do not paste another person's
certificate, device identifier, IP address, or private setup values into your
build. Use your own Tizen Studio certificate and test the app on your own
hardware. Keep the stock Home app available until you've verified the new
route and know how to restore it.

## A prompt for a coding agent

If you want an AI coding partner to help adapt the project, start with a
bounded request like this:

> Read `README.md` and `CONTRIBUTING.md`, then map the current app structure
> before editing. I am adapting this plain HTML/CSS/JavaScript launcher for
> my Samsung Tizen TV. My first change is: **[describe one small change]**.
> Preserve remote arrow/Enter/Back navigation, local preferences, the
> selected-app preview, and compatibility with the TV's web runtime. Keep
> custom scripts local; do not add telemetry, remote code loading, credentials,
> or guessed app IDs. Start with a browser-only preview and run the source
> checks. Do not connect to a TV, sign/install a package, uninstall apps, or
> change Home/startup settings unless I explicitly ask for that separate
> device task. Report what passed, what is unverified, and any model/firmware
> assumptions.

## Contribute

Fork the project, make a focused branch, and open a PR with the TV model and
firmware only if you know them. Say whether the result was checked in a browser
or on hardware. Device reports are especially useful here—but redact DUIDs,
local addresses, certificate details, logs with personal data, and secrets.

If you find a Tizen quirk, an app-ID mismatch, or a better remote interaction,
please contribute it back. The point is not to make one TV look exactly like
mine; it is to make the launcher easier for the next person to adapt safely.
