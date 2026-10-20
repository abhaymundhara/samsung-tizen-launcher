/*
 * Local, user-owned extension point. This file is packaged with the launcher;
 * it never downloads or evaluates remote JavaScript.
 *
 * Replace this example with your own small dashboard widgets. The API exposes
 * the current greeting, focused app name, wallpaper name and current time.
 * Keep widgets lightweight for the TV's web runtime.
 */
(function () {
  "use strict";
  if (!window.LauncherWidgets) return;

  window.LauncherWidgets.register({
    id: "personal-space",
    title: "PERSONAL SPACE",
    render: function (root, context) {
      var line = document.createElement("div");
      line.textContent = context.selectedApp
        ? "Ready for " + context.selectedApp
        : "Edit app/custom.js to add your own widget.";
      root.appendChild(line);
    }
  });
})();
