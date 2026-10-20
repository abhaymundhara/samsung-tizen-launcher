(function () {
  "use strict";
  var CFG = window.LAUNCHER_CONFIG || { apps: {}, rows: [] };
  var HAS_TIZEN = !!(window.tizen && window.tizen.application);
  var $ = function (id) { return document.getElementById(id); };
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27, BS: 8, RED: 403, GREEN: 404, BLUE: 406, IME_DONE: 65376, IME_CANCEL: 65385 };
  var ROW_H = 720, ICONS = {}, rows = [], dockItems = [];
  var pos = { r: 0, c: 0 }, dockPos = 0, utilPos = -1;
  var allOpen = false, allPos = 0, allItems = [], settingsOpen = false, settingsPos = 0, pendingDeleteKey = null;
  var editorOpen = false, editorMode = "";

  function $all(selector) { return document.querySelectorAll(selector); }
  function esc(s) {
    return String(s).replace(/[&<>\"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
    });
  }
  function faceBg(a) {
    if (!a || !a.bg) return "background:rgba(232,240,248,.13)";
    return a.bg instanceof Array
      ? "background:linear-gradient(145deg," + a.bg[0] + "," + a.bg[1] + ")"
      : "background:" + a.bg;
  }
  function initials(name) {
    var words = String(name || "TV").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/), out = "";
    for (var i = 0; i < words.length && out.length < 2; i++) if (words[i]) out += words[i].charAt(0);
    return out.toUpperCase() || "TV";
  }

  function readStored(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (e) { return fallback; }
  }
  var USER_WALLPAPERS_KEY = "launcher.userWallpapers";
  var userWallpapers = readStored(USER_WALLPAPERS_KEY, []);
  if (!(userWallpapers instanceof Array)) userWallpapers = [];

  /* ---------- appearance preferences ---------- */
  var WPS = (CFG.wallpapers || (CFG.wallpaper ? [CFG.wallpaper] : [])).slice(0);
  var WPN = (CFG.wallpaperNames || []).slice(0);
  var BASE_WPS = WPS.slice(0), BASE_WPN = WPN.slice(0);
  userWallpapers.forEach(function (wallpaper) {
    if (wallpaper && wallpaper.data && /^data:image\//.test(wallpaper.data)) {
      WPS.push(wallpaper.data);
      WPN.push(wallpaper.name || "My wallpaper");
    }
  });
  var forcedWp = null;
  var qwp = /[?&]wp=(\d+)/.exec(window.location.href);
  if (qwp) forcedWp = +qwp[1];

  function readAppearance() {
    var out = {
      layout: CFG.layout === "dock" ? "dock" : "list",
      material: CFG.material === "glass" ? "glass" : "clear",
      focus: CFG.focusStyle === "glass" ? "glass" : "type",
      typography: CFG.typography === "standard" ? "standard" : "light",
      name: CFG.name || "",
      greetingMode: CFG.greetingMode === "custom" ? "custom" : "time",
      customGreeting: CFG.customGreeting || "Welcome home",
      wallpaper: 0
    };
    try {
      var saved = JSON.parse(localStorage.getItem("launcher.appearance") || "{}");
      if (saved.layout === "list" || saved.layout === "dock") out.layout = saved.layout;
      if (saved.material === "clear" || saved.material === "glass") out.material = saved.material;
      if (saved.focus === "type" || saved.focus === "glass") out.focus = saved.focus;
      if (saved.typography === "light" || saved.typography === "standard") out.typography = saved.typography;
      if (typeof saved.name === "string") out.name = saved.name;
      if (saved.greetingMode === "time" || saved.greetingMode === "custom") out.greetingMode = saved.greetingMode;
      if (typeof saved.customGreeting === "string") out.customGreeting = saved.customGreeting;
      if (typeof saved.wallpaper === "number" && saved.wallpaper >= 0 && saved.wallpaper < WPS.length) out.wallpaper = saved.wallpaper;
    } catch (e) {}
    if (forcedWp != null && WPS[forcedWp]) out.wallpaper = forcedWp;
    return out;
  }
  var appearance = readAppearance();
  var wallIndex = -1, wallFlip = 0;

  function showWallpaper(index) {
    if (!WPS.length) return;
    index = (index + WPS.length) % WPS.length;
    var next = $("wall" + (wallFlip ? "B" : "A"));
    var prev = $("wall" + (wallFlip ? "A" : "B"));
    next.style.backgroundImage = "url('" + WPS[index] + "')";
    next.className = "wallp on";
    prev.className = "wallp";
    wallFlip = 1 - wallFlip;
    wallIndex = index;
  }

  function applyAppearance() {
    document.body.className = "t-" + (CFG.theme || "graphite") +
      " layout-" + appearance.layout +
      " material-" + appearance.material +
      " focus-" + appearance.focus +
      " type-" + appearance.typography;
    $("rows").className = appearance.layout === "list" ? "" : "hidden";
    $("dock").className = appearance.layout === "dock" ? "" : "hidden";
    if (appearance.wallpaper !== wallIndex) showWallpaper(appearance.wallpaper);
  }

  var WALLPAPER_CLOCK_KEY = "launcher.wallpaperChangedAt";
  var WALLPAPER_INTERVAL = Math.max(15, +CFG.wallpaperRotationSeconds || 60) * 1000;
  var wallpaperChangedAt = 0, wallpaperTimer = null;
  try { wallpaperChangedAt = parseInt(localStorage.getItem(WALLPAPER_CLOCK_KEY) || "0", 10) || 0; } catch (e) {}
  function saveAppearance() {
    try { localStorage.setItem("launcher.appearance", JSON.stringify(appearance)); } catch (e) {}
  }
  function storeWallpaperClock() {
    wallpaperChangedAt = Date.now();
    try { localStorage.setItem(WALLPAPER_CLOCK_KEY, String(wallpaperChangedAt)); } catch (e) {}
    scheduleWallpaperRotation();
  }
  function scheduleWallpaperRotation() {
    clearTimeout(wallpaperTimer);
    if (WPS.length < 2) return;
    var elapsed = Math.max(0, Date.now() - wallpaperChangedAt);
    wallpaperTimer = setTimeout(syncWallpaperRotation, Math.max(1000, WALLPAPER_INTERVAL - (elapsed % WALLPAPER_INTERVAL)));
  }
  function syncWallpaperRotation() {
    if (WPS.length < 2) return;
    var now = Date.now();
    if (!wallpaperChangedAt) wallpaperChangedAt = now;
    var steps = Math.floor((now - wallpaperChangedAt) / WALLPAPER_INTERVAL);
    if (steps > 0) {
      appearance.wallpaper = (appearance.wallpaper + steps) % WPS.length;
      wallpaperChangedAt += steps * WALLPAPER_INTERVAL;
      showWallpaper(appearance.wallpaper);
      saveAppearance();
      try { localStorage.setItem(WALLPAPER_CLOCK_KEY, String(wallpaperChangedAt)); } catch (e) {}
      if (settingsOpen) renderSettings();
    }
    scheduleWallpaperRotation();
  }
  function startWallpaperRotation() {
    if (WPS.length < 2) return;
    if (!wallpaperChangedAt) {
      wallpaperChangedAt = Date.now();
      try { localStorage.setItem(WALLPAPER_CLOCK_KEY, String(wallpaperChangedAt)); } catch (e) {}
    }
    syncWallpaperRotation();
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) syncWallpaperRotation();
    });
  }

  function fit() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var stage = $("stage"), transform = "scale(" + scale + ")";
    stage.style.webkitTransform = transform;
    stage.style.transform = transform;
    stage.style.left = Math.round((window.innerWidth - 1920 * scale) / 2) + "px";
    stage.style.top = Math.round((window.innerHeight - 1080 * scale) / 2) + "px";
  }
  window.addEventListener("resize", fit);
  fit();
  applyAppearance();
  startWallpaperRotation();
  try {
    if (window.tizen && tizen.tvinputdevice && tizen.tvinputdevice.registerKeyBatch) {
      tizen.tvinputdevice.registerKeyBatch(["ColorF0Red", "ColorF1Green", "ColorF3Blue"]);
    }
  } catch (e) {}

  /* ---------- app catalogue ---------- */
  var RECENCY_KEY = "launcher.openedApps", APP_STORAGE_KEY = "launcher.customApps";
  var PIN_STORAGE_KEY = "launcher.pinnedApps", appRecency = {};
  appRecency = readStored(RECENCY_KEY, {});
  if (!appRecency || typeof appRecency !== "object") appRecency = {};
  var appCatalog = {};
  Object.keys(CFG.apps || {}).forEach(function (key) { appCatalog[key] = CFG.apps[key]; });
  var customApps = readStored(APP_STORAGE_KEY, []);
  if (!(customApps instanceof Array)) customApps = [];
  customApps.forEach(function (entry) {
    if (entry && entry.key && entry.app && (entry.app.id || entry.app.url)) appCatalog[entry.key] = entry.app;
  });

  function recentTime(key) { return +appRecency[key] || 0; }
  function normalizedName(name) { return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
  function homeKeyFor(appId, appName) {
    var keys = Object.keys(appCatalog), targetName = normalizedName(appName);
    for (var i = 0; i < keys.length; i++) {
      var candidate = appCatalog[keys[i]], ids = [candidate.id].concat(candidate.iconIds || []);
      if (appId && ids.indexOf(appId) !== -1) return keys[i];
      var names = [candidate.name].concat(candidate.iconNames || []);
      for (var n = 0; targetName && n < names.length; n++) if (normalizedName(names[n]) === targetName) return keys[i];
    }
    return null;
  }

  function resolveApp(key) {
    if (key === "@all") return { key: key, app: { name: "All apps", id: null, bg: "rgba(233,241,249,.12)" } };
    if (key === "@quit") return { key: key, app: { name: "Exit", id: null, bg: "rgba(233,241,249,.12)" } };
    if (appCatalog[key]) return { key: key, app: appCatalog[key] };
    return null;
  }
  var initialPins = [];
  (CFG.rows || []).forEach(function (group) { (group.apps || []).forEach(function (key) { if (initialPins.indexOf(key) < 0) initialPins.push(key); }); });
  var pinnedKeys = readStored(PIN_STORAGE_KEY, null);
  if (!(pinnedKeys instanceof Array)) pinnedKeys = initialPins;
  var validPins = [];
  pinnedKeys.forEach(function (key) { if (appCatalog[key] && validPins.indexOf(key) < 0) validPins.push(key); });
  pinnedKeys = validPins;
  var baseOrder = 0;
  function rebuildPinnedRow() {
    baseOrder = 0;
    var items = [];
    pinnedKeys.forEach(function (key) {
      var item = resolveApp(key);
      if (item) { item.baseOrder = baseOrder++; items.push(item); }
    });
    rows.length = 0;
    rows.push({ title: (CFG.rows && CFG.rows[0] && CFG.rows[0].title) || "Pinned", items: items });
  }
  rebuildPinnedRow();

  function sortHomeItems() {
    rows.forEach(function (row) {
      row.items.sort(function (a, b) {
        var delta = recentTime(b.key) - recentTime(a.key);
        return delta || a.baseOrder - b.baseOrder;
      });
    });
    dockItems = [];
    rows.forEach(function (row, ri) {
      row.items.forEach(function (item, ci) {
        item.row = ri;
        item.col = ci;
        dockItems.push(item);
      });
    });
  }

  function tileHtml(item, id, dock) {
    var cls = dock ? "tile dock-tile" : "tile";
    return '<div class="' + cls + '" id="' + id + '">' +
      '<div class="tile-copy"><div class="lab">' + esc(item.app.name) + '</div></div>' +
      '<svg class="tile-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</div>';
  }

  var rowsInner = $("rowsInner");
  var dockTrack = $("dockTrack");
  function renderHome() {
    rowsInner.innerHTML = "";
    dockTrack.innerHTML = "";
    rows.forEach(function (row, ri) {
      var node = document.createElement("section"), html = "";
      node.className = "row";
      html += '<div class="rt">' + esc(row.title) + '</div><div class="track"><div class="trackIn" id="tr' + ri + '">';
      row.items.forEach(function (item, ci) { html += tileHtml(item, "t" + ri + "_" + ci, false); });
      html += "</div></div>";
      node.innerHTML = html;
      rowsInner.appendChild(node);
      row.items.forEach(function (item, ci) {
        var tile = $("t" + ri + "_" + ci);
        if (tile) tile.addEventListener("click", function () { activate(item); });
      });
    });
    dockItems.forEach(function (item, i) {
      dockTrack.insertAdjacentHTML("beforeend", tileHtml(item, "d" + i, true));
      var tile = $("d" + i);
      if (tile) tile.addEventListener("click", function () { activate(item); });
    });
    hydrateIcons();
  }

  var installedAppInfo = [];
  function appInfoMatches(info, app) {
    var ids = [app.id].concat(app.iconIds || []);
    if (ids.indexOf(info.id) !== -1) return true;
    var name = normalizedName(info.name), aliases = [app.name].concat(app.iconNames || []);
    for (var i = 0; name && i < aliases.length; i++) if (normalizedName(aliases[i]) === name) return true;
    return false;
  }
  function iconPathsFor(app, installedApps) {
    var paths = [];
    function add(path) { if (path && paths.indexOf(path) === -1) paths.push(path); }
    add(app.iconFile);
    add(ICONS[app.id]);
    for (var i = 0; i < installedApps.length; i++) {
      if (installedApps[i].iconPath && appInfoMatches(installedApps[i], app)) add(installedApps[i].iconPath);
    }
    return paths;
  }
  function fileUrl(path) { return /^file:\/\//i.test(path) ? path : "file://" + path; }
  function mountIconImage(target, paths, index) {
    if (index >= paths.length) return;
    var image = document.createElement("img");
    image.onerror = function () {
      if (image.parentNode) image.parentNode.removeChild(image);
      mountIconImage(target, paths, index + 1);
    };
    image.src = fileUrl(paths[index]);
    target.appendChild(image);
  }
  function paintPreview(item, title, meta) {
    var icon = $("previewIcon"), app = item && item.app;
    icon.innerHTML = "<span>" + esc(app ? (app.monogram || initials(app.name)) : "TV") + "</span>";
    icon.setAttribute("style", app ? faceBg(app) : "");
    $("previewName").textContent = app ? app.name : (title || "Your Home");
    $("previewMeta").textContent = app ? (app.url ? "Website shortcut" : "Installed TV app") : (meta || "Only the focused app icon appears here");
    if (app) mountIconImage(icon, iconPathsFor(app, installedAppInfo), 0);
  }
  function paintAllPreview(entry) {
    var app = entry && entry.app;
    var icon = $("allPreviewIcon");
    if (!app) {
      icon.innerHTML = "<span>TV</span>";
      $("allPreviewName").textContent = "No installed apps found";
      $("allPreviewId").textContent = "";
      $("pinButton").textContent = "Pin to Home";
      $("pinButton").disabled = true;
      $("removeUrlButton").className = "hidden";
      return;
    }
    icon.innerHTML = "<span>" + esc(app.monogram || initials(app.name)) + "</span>";
    icon.setAttribute("style", app.bg ? faceBg(app) : "");
    $("allPreviewName").textContent = app.name;
    $("allPreviewId").textContent = app.id || app.url || "";
    $("pinButton").disabled = false;
    $("pinButton").textContent = entry.key && pinnedKeys.indexOf(entry.key) >= 0 ? "Unpin from Home" : "Pin to Home";
    var userShortcut = false;
    for (var i = 0; i < customApps.length; i++) if (customApps[i].key === entry.key) userShortcut = true;
    $("removeUrlButton").className = userShortcut && app.url ? "" : "hidden";
    $("removeUrlButton").textContent = pendingDeleteKey === entry.key ? "Confirm removal" : "Remove website";
    mountIconImage(icon, iconPathsFor(app, installedAppInfo), 0);
  }
  function applyAppIcons(installedApps) {
    installedAppInfo = installedApps || [];
    paintPreview(currentItem());
    if (allOpen) paintAllPreview(allItems[allPos]);
  }

  function hydrateIcons() {
    if (!HAS_TIZEN || !tizen.application.getAppsInfo) return;
    try {
      tizen.application.getAppsInfo(function (apps) {
        for (var i = 0; i < apps.length; i++) if (apps[i].iconPath) ICONS[apps[i].id] = apps[i].iconPath;
        applyAppIcons(apps);
      }, function () {});
    } catch (e) {}
  }
  var widgets = [];
  function renderWidgets() {
    var root = $("widgetRoot");
    root.innerHTML = "";
    widgets.forEach(function (widget) {
      var card = document.createElement("section");
      card.className = "custom-widget";
      var title = document.createElement("div");
      title.className = "custom-widget-title";
      title.textContent = widget.title || widget.id;
      var body = document.createElement("div");
      body.className = "custom-widget-body";
      card.appendChild(title);
      card.appendChild(body);
      root.appendChild(card);
      try {
        widget.render(body, {
          name: appearance.name,
          selectedApp: currentItem() ? currentItem().app.name : "",
          wallpaper: wallpaperName(appearance.wallpaper),
          now: new Date()
        });
      } catch (e) {
        body.textContent = "This widget couldn't load.";
      }
    });
  }
  window.LauncherWidgets = {
    register: function (definition) {
      if (!definition || typeof definition.render !== "function" || !definition.id) return;
      for (var i = 0; i < widgets.length; i++) if (widgets[i].id === definition.id) { widgets[i] = definition; renderWidgets(); return; }
      if (widgets.length < 3) widgets.push(definition);
      renderWidgets();
    },
    refresh: renderWidgets
  };
  if (CFG.customJsEnabled !== false) {
    var customScript = document.createElement("script");
    customScript.src = "custom.js";
    customScript.async = false;
    customScript.onerror = function () { /* custom.js is optional */ };
    document.body.appendChild(customScript);
  }
  sortHomeItems();
  renderHome();

  function recordOpened(key) {
    if (!key || !appCatalog[key]) return;
    var newest = Date.now();
    Object.keys(appRecency).forEach(function (name) { newest = Math.max(newest, recentTime(name) + 1); });
    appRecency[key] = newest;
    try { localStorage.setItem(RECENCY_KEY, JSON.stringify(appRecency)); } catch (e) {}
    sortHomeItems();
    renderHome();
    if (appearance.layout === "dock") dockPos = findDockPosition(key);
    else pos = findPosition(key);
    focus();
  }

  /* ---------- home focus ---------- */
  var utilGrid = '<svg class="utility-glyph" viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="5" width="15" height="15" rx="4" fill="currentColor"/><rect x="28" y="5" width="15" height="15" rx="4" fill="currentColor"/><rect x="5" y="28" width="15" height="15" rx="4" fill="currentColor"/><rect x="28" y="28" width="15" height="15" rx="4" fill="currentColor"/></svg>';
  var utilGear = '<svg class="utility-glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><circle cx="24" cy="24" r="7"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.6 10.6l3.5 3.5M33.9 33.9l3.5 3.5M37.4 10.6l-3.5 3.5M14.1 33.9l-3.5 3.5" stroke-linecap="round"/><circle cx="24" cy="24" r="15"/></svg>';
  var utilPower = '<svg class="utility-glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M24 5v17"/><path d="M13 12a17 17 0 1 0 22 0"/></svg>';
  $("ub0").innerHTML = utilGrid + '<span class="utility-label">All apps</span>';
  $("ub1").innerHTML = utilGear + '<span class="utility-label">Settings</span>';
  $("ub2").innerHTML = utilPower + '<span class="utility-label">Exit</span>';

  function clearTileFocus() {
    var found = $all(".tile.f");
    for (var i = 0; i < found.length; i++) found[i].className = found[i].className.replace(/\bf\b/g, "").replace(/\s+/g, " ").replace(/^ | $/g, "");
  }
  function utilPaint() {
    for (var i = 0; i < 3; i++) $("ub" + i).className = utilPos === i ? "ub f" : "ub";
  }
  function currentItem() {
    return appearance.layout === "dock" ? dockItems[dockPos] : (rows[pos.r] && rows[pos.r].items[pos.c]);
  }
  function focus() {
    clearTileFocus();
    utilPos = -1;
    utilPaint();
    if (appearance.layout === "dock") {
      var dockNode = $("d" + dockPos);
      if (dockNode) dockNode.className += " f";
      var shift = Math.max(0, dockPos - 6) * 196;
      var trans = "translateX(" + (-shift) + "px)";
      dockTrack.style.webkitTransform = trans;
      dockTrack.style.transform = trans;
      try { localStorage.setItem("launcher.dockPos", String(dockPos)); } catch (e) {}
    } else {
      var node = $("t" + pos.r + "_" + pos.c);
      if (node) node.className += " f";
      var shiftY = Math.max(0, pos.r - 1) * ROW_H;
      var ty = "translateY(" + (-shiftY) + "px)";
      rowsInner.style.webkitTransform = ty;
      rowsInner.style.transform = ty;
      try { localStorage.setItem("launcher.pos", pos.r + "," + pos.c); } catch (e) {}
    }
    paintPreview(currentItem());
    if (window.LauncherWidgets) window.LauncherWidgets.refresh();
  }
  try {
    var savedPos = (localStorage.getItem("launcher.pos") || "").split(",");
    if (savedPos.length === 2 && rows[+savedPos[0]] && rows[+savedPos[0]].items[+savedPos[1]]) { pos.r = +savedPos[0]; pos.c = +savedPos[1]; }
    var savedDock = parseInt(localStorage.getItem("launcher.dockPos") || "0", 10);
    if (!isNaN(savedDock)) dockPos = Math.max(0, Math.min(dockItems.length - 1, savedDock));
  } catch (e) {}

  /* ---------- appearance settings ---------- */
  function settingsDefinitions() {
    var defs = [
      { key: "layout", label: "Layout", options: [{ value: "list", label: "List" }, { value: "dock", label: "Dock" }] },
      { key: "material", label: "Surface", options: [{ value: "clear", label: "Clear tint" }, { value: "glass", label: "Glass" }] },
      { key: "focus", label: "Focus", options: [{ value: "type", label: "Type" }, { value: "glass", label: "Glass" }] },
      { key: "typography", label: "Typography", options: [{ value: "light", label: "Light" }, { value: "standard", label: "Standard" }] },
      { key: "name", label: "Greeting name", action: "name" },
      { key: "greetingMode", label: "Greeting style", options: [{ value: "time", label: "Time of day" }, { value: "custom", label: "Custom message" }] },
      { key: "customGreeting", label: "Greeting message", action: "greeting" }
    ];
    if (WPS.length > 1) defs.push({ key: "wallpaper", label: "Background" });
    defs.push({ key: "addWallpaper", label: "Add wallpaper", action: "wallpaper" });
    if (userWallpapers.length) defs.push({ key: "removeWallpaper", label: "Remove selected wallpaper", action: "removeWallpaper" });
    return defs;
  }
  function wallpaperName(index) { return WPN[index] || ("Background " + (index + 1)); }
  function settingsValue(def) {
    if (def.key === "wallpaper") return wallpaperName(appearance.wallpaper);
    if (def.key === "name") return appearance.name || "Hidden";
    if (def.key === "customGreeting") return appearance.customGreeting || "Enter a message";
    if (def.key === "addWallpaper") return "Choose an image";
    if (def.key === "removeWallpaper") return "Personal wallpapers only";
    var options = def.options;
    if (!options) return "";
    for (var i = 0; i < options.length; i++) if (options[i].value === appearance[def.key]) return options[i].label;
    return "";
  }
  function buildSettings() {
    var defs = settingsDefinitions();
    var html = "";
    defs.forEach(function (def, i) {
      html += '<div class="setting-row" id="sr' + i + '"><div class="setting-label">' + esc(def.label) + '</div><div class="setting-value" id="sv' + i + '">' + esc(settingsValue(def)) + '</div><svg class="setting-arrows" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m8 6-4 7 4 7M18 6l4 7-4 7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
    });
    $("settingsRows").innerHTML = html;
    $("settingsRows").setAttribute("data-count", defs.length);
  }
  function renderSettings() {
    var defs = settingsDefinitions();
    for (var i = 0; i < defs.length; i++) {
      $("sr" + i).className = i === settingsPos ? "setting-row f" : "setting-row";
      $("sv" + i).textContent = settingsValue(defs[i]);
    }
  }
  function findPosition(key) {
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].items.length; c++) if (rows[r].items[c].key === key) return { r: r, c: c };
    return { r: 0, c: 0 };
  }
  function findDockPosition(key) {
    for (var i = 0; i < dockItems.length; i++) if (dockItems[i].key === key) return i;
    return 0;
  }
  function changeSetting(direction, activateAction) {
    var defs = settingsDefinitions();
    var def = defs[settingsPos];
    if (!def) return;
    if (def.action) {
      if (activateAction) {
        if (def.action === "name") openEditor("name");
        else if (def.action === "greeting") openEditor("greeting");
        else if (def.action === "wallpaper") $("wallpaperFile").click();
        else if (def.action === "removeWallpaper") removeWallpaperData();
      }
      return;
    }
    var selected = currentItem(), selectedKey = selected ? selected.key : null;
    if (def.key === "wallpaper") appearance.wallpaper = (appearance.wallpaper + WPS.length + direction) % WPS.length;
    else {
      var idx = 0;
      for (var i = 0; i < def.options.length; i++) if (def.options[i].value === appearance[def.key]) idx = i;
      idx = (idx + def.options.length + direction) % def.options.length;
      appearance[def.key] = def.options[idx].value;
    }
    if (def.key === "layout" && selectedKey != null) {
      if (appearance.layout === "dock") dockPos = findDockPosition(selectedKey);
      else pos = findPosition(selectedKey);
    }
    applyAppearance();
    saveAppearance();
    if (def.key === "greetingMode") tick();
    if (def.key === "wallpaper") storeWallpaperClock();
    renderSettings();
    focus();
  }
  function openSettings() {
    buildSettings();
    settingsPos = 0;
    settingsOpen = true;
    $("settings").className = "";
    renderSettings();
  }
  function closeSettings() {
    settingsOpen = false;
    $("settings").className = "hidden";
    focus();
  }

  function openEditor(mode) {
    editorMode = mode;
    editorOpen = true;
    var isUrl = mode === "url";
    var isName = mode === "name";
    $("editorTitle").textContent = isUrl ? "Add a website" : (isName ? "Greeting name" : "Greeting message");
    $("editorEyebrow").textContent = isUrl ? "HOME SHORTCUT" : "PERSONALIZE";
    $("editorNameLabel").textContent = isUrl ? "Shortcut name" : (isName ? "Name" : "Message");
    $("editorName").value = isUrl ? "" : (isName ? appearance.name : appearance.customGreeting);
    $("editorName").maxLength = isUrl ? 32 : 60;
    $("editorUrlLabel").className = isUrl ? "" : "hidden";
    $("editorUrl").className = isUrl ? "" : "hidden";
    $("editorUrl").value = "https://";
    $("editorForm").className = "";
    $("editor").className = "";
    setTimeout(function () { $("editorName").focus(); }, 0);
  }
  function closeEditor() {
    editorOpen = false;
    editorMode = "";
    $("editor").className = "hidden";
    if (allOpen) allFocus();
    else if (settingsOpen) renderSettings();
  }
  function saveCustomApps() {
    try { localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(customApps)); return true; }
    catch (e) { toast("Not enough TV storage to save that shortcut."); return false; }
  }
  function saveEditor(event) {
    if (event) event.preventDefault();
    var name = $("editorName").value.replace(/^\s+|\s+$/g, "");
    if (editorMode === "name") {
      appearance.name = name;
      saveAppearance();
      tick();
      closeEditor();
      return;
    }
    if (editorMode === "greeting") {
      appearance.customGreeting = name;
      appearance.greetingMode = "custom";
      saveAppearance();
      tick();
      closeEditor();
      return;
    }
    if (editorMode === "url") {
      var url = $("editorUrl").value.replace(/^\s+|\s+$/g, "");
      if (!name) { toast("Give this website a name first."); $("editorName").focus(); return; }
      if (!/^https:\/\//i.test(url) || !/^https:\/\/[^\s/]+/i.test(url)) {
        toast("Use a complete https:// website address."); $("editorUrl").focus(); return;
      }
      var key = "url_" + Date.now().toString(36);
      var app = { name: name, url: url, browserId: CFG.apps && CFG.apps.browser ? CFG.apps.browser.id : null, monogram: initials(name), bg: "#344554" };
      appCatalog[key] = app;
      customApps.push({ key: key, app: app });
      if (!saveCustomApps()) { delete appCatalog[key]; customApps.pop(); return; }
      closeEditor();
      togglePin({ key: key, name: name, id: null, app: app }, true);
      toast("Website shortcut added to Home.");
    }
  }
  $("editorForm").addEventListener("submit", saveEditor);
  $("editorCancel").addEventListener("click", closeEditor);

  function addWallpaperData(data, name) {
    var entry = { name: name || "My wallpaper", data: data };
    var next = userWallpapers.concat([entry]);
    if (next.length > 6 || JSON.stringify(next).length > 2800000) {
      toast("Wallpaper storage is full. Remove an older image or use a smaller one.");
      return;
    }
    try { localStorage.setItem(USER_WALLPAPERS_KEY, JSON.stringify(next)); }
    catch (e) { toast("Couldn't save that wallpaper on the TV."); return; }
    userWallpapers = next;
    WPS.push(data);
    WPN.push(entry.name);
    appearance.wallpaper = WPS.length - 1;
    applyAppearance();
    saveAppearance();
    storeWallpaperClock();
    if (settingsOpen) { buildSettings(); renderSettings(); }
    toast("Wallpaper added.");
  }
  function removeWallpaperData() {
    var customIndex = appearance.wallpaper - BASE_WPS.length;
    if (customIndex < 0 || customIndex >= userWallpapers.length) { toast("Choose one of your personal wallpapers first."); return; }
    var next = userWallpapers.slice(0);
    next.splice(customIndex, 1);
    try { localStorage.setItem(USER_WALLPAPERS_KEY, JSON.stringify(next)); }
    catch (e) { toast("Couldn't update saved wallpapers."); return; }
    userWallpapers = next;
    WPS = BASE_WPS.slice(0);
    WPN = BASE_WPN.slice(0);
    userWallpapers.forEach(function (wallpaper) { WPS.push(wallpaper.data); WPN.push(wallpaper.name || "My wallpaper"); });
    appearance.wallpaper = Math.min(customIndex + BASE_WPS.length, WPS.length - 1);
    applyAppearance();
    saveAppearance();
    storeWallpaperClock();
    buildSettings();
    settingsPos = Math.min(settingsPos, settingsDefinitions().length - 1);
    renderSettings();
    toast("Personal wallpaper removed.");
  }
  $("wallpaperFile").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () { toast("Couldn't read that image."); };
    reader.onload = function () {
      var image = new Image();
      image.onerror = function () { toast("Choose a JPEG, PNG or WebP image."); };
      image.onload = function () {
        var scale = Math.min(1, 1920 / image.width, 1080 / image.height);
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        var context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        var data = canvas.toDataURL("image/jpeg", 0.78);
        if (data.length > 850000) data = canvas.toDataURL("image/jpeg", 0.58);
        addWallpaperData(data, file.name.replace(/\.[^.]+$/, ""));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    this.value = "";
  });

  /* ---------- Stay-home relaunch ---------- */
  var SELF_ID = "AbhyLnchr0.Launcher";
  var SH = { on: CFG.stayHome !== false && HAS_TIZEN, target: null, timer: null, quitting: false };
  function shLoad(k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } }
  function stayArm(id) { if (SH.on) { SH.target = id; try { localStorage.setItem("launcher.target", id); localStorage.setItem("launcher.quit", ""); } catch (e) {} } }
  function stayDisarm() { SH.target = null; SH.quitting = true; clearInterval(SH.timer); SH.timer = null; try { localStorage.removeItem("launcher.target"); } catch (e) {} }
  function relaunchAllowed() {
    var now = Date.now(), times = shLoad("launcher.relaunches").filter(function (t) { return now - t < 3600000; });
    var lastMinute = times.filter(function (t) { return now - t < 60000; }).length;
    if (lastMinute >= (CFG.stayHomeMaxPerMinute || 2) || times.length >= (CFG.stayHomeMaxPerHour || 12)) return false;
    times.push(now);
    try { localStorage.setItem("launcher.relaunches", JSON.stringify(times)); } catch (e) {}
    return true;
  }
  function relaunchSelf() {
    if (SH.quitting || !relaunchAllowed()) return;
    try { tizen.application.launch(SELF_ID, function () {}, function () {}); } catch (e) {}
  }
  function stayCheck() {
    if (!SH.on || SH.quitting || !SH.target) return;
    try {
      tizen.application.getAppsContext(function (contexts) {
        for (var i = 0; i < contexts.length; i++) if (contexts[i].appId === SH.target) return;
        relaunchSelf();
      }, function () {});
    } catch (e) {}
  }
  if (SH.on) document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (SH.target && !SH.quitting && !SH.timer) SH.timer = setInterval(stayCheck, (CFG.stayHomePollSeconds || 3) * 1000);
    } else {
      clearInterval(SH.timer); SH.timer = null; SH.target = null;
      try { localStorage.removeItem("launcher.target"); } catch (e) {}
    }
  });

  /* ---------- launch, quit, feedback ---------- */
  var toastTimer;
  function toast(message) {
    var node = $("toast");
    node.textContent = message;
    node.className = "on";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.className = ""; }, 3000);
  }
  function launch(app, homeKey) {
    if (!app || (!app.id && !app.url)) return;
    if (!HAS_TIZEN) {
      recordOpened(homeKey || homeKeyFor(app.id, app.name));
      toast("Preview: would open " + app.name);
      return;
    }
    var targetId = app.url ? (app.browserId || null) : app.id;
    stayArm(targetId);
    var onSuccess = function () { recordOpened(homeKey || homeKeyFor(app.id, app.name)); };
    var onError = function () {
      SH.target = null;
      clearInterval(SH.timer);
      SH.timer = null;
      toast("Couldn't open " + app.name + ". Check the app or network connection.");
    };
    try {
      if (app.url) {
        var control = new tizen.ApplicationControl("http://tizen.org/appcontrol/operation/view", app.url, null, null);
        tizen.application.launchAppControl(control, targetId, onSuccess, onError);
      } else {
        tizen.application.launch(app.id, onSuccess, onError);
      }
    } catch (e) { onError(e); }
  }
  function quit() {
    if (!HAS_TIZEN) { toast("Preview: would exit the launcher"); return; }
    stayDisarm();
    try { sessionStorage.setItem("launcher.quit", "1"); localStorage.setItem("launcher.quit", String(Date.now())); } catch (e) {}
    try { tizen.application.getCurrentApplication().exit(); }
    catch (e) { toast("Couldn't exit the launcher."); }
  }
  function activate(item) {
    if (!item) return;
    if (item.key === "@all") openAll();
    else if (item.key === "@quit") quit();
    else launch(item.app, item.key);
  }

  /* ---------- All apps ---------- */
  function loadAll(callback) {
    var hiddenApps = CFG.hiddenApps || [];
    function isHidden(id) {
      return hiddenApps.indexOf(id) !== -1;
    }
    function done(list) {
      list.sort(function (a, b) {
        var an = a.name.toLowerCase(), bn = b.name.toLowerCase();
        return an < bn ? -1 : (an > bn ? 1 : 0);
      });
      callback(list);
    }
    if (HAS_TIZEN && tizen.application.getAppsInfo) {
      tizen.application.getAppsInfo(function (apps) {
        var list = [];
        installedAppInfo = apps || [];
        for (var j = 0; j < installedAppInfo.length; j++) if (installedAppInfo[j].iconPath) ICONS[installedAppInfo[j].id] = installedAppInfo[j].iconPath;
        for (var i = 0; i < (apps || []).length; i++) {
          var app = apps[i];
          if (app.show !== true || !app.iconPath || app.id === SELF_ID || isHidden(app.id)) continue;
          var key = homeKeyFor(app.id, app.name);
          var appDef = key ? appCatalog[key] : { name: app.name || app.id, id: app.id, iconFile: app.iconPath };
          list.push({ name: app.name || app.id, id: app.id, key: key, iconPath: app.iconPath, app: appDef });
        }
        Object.keys(appCatalog).forEach(function (key) {
          var shortcut = appCatalog[key];
          if (!shortcut.url) return;
          var exists = false;
          for (var n = 0; n < list.length; n++) if (list[n].key === key) exists = true;
          if (!exists) list.push({ name: shortcut.name, id: shortcut.url, key: key, app: shortcut });
        });
        done(list);
      }, function () { toast("Couldn't read the app list"); callback([]); });
    } else {
      var list = [];
      Object.keys(appCatalog).forEach(function (key) {
        var app = appCatalog[key];
        if (!app.id && !app.url) return;
        list.push({ name: app.name, id: app.id || app.url, key: key, app: app });
      });
      done(list);
    }
  }
  function savePins() {
    try { localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedKeys)); return true; }
    catch (e) { toast("Couldn't save your pinned apps on the TV."); return false; }
  }
  function togglePin(entry, forcePin) {
    if (!entry) return;
    var key = entry.key || homeKeyFor(entry.id, entry.name);
    if (!key) {
      key = "tv_" + String(entry.id || entry.name).replace(/[^a-z0-9]/gi, "").slice(0, 18).toLowerCase();
      if (!key || key === "tv_") key = "tv_" + Date.now().toString(36);
      while (appCatalog[key]) key += "x";
      var appDef = entry.app || { name: entry.name, id: entry.id, iconFile: entry.iconPath };
      appCatalog[key] = appDef;
      customApps.push({ key: key, app: appDef });
      if (!saveCustomApps()) { delete appCatalog[key]; customApps.pop(); return; }
      entry.key = key;
      entry.app = appDef;
    }
    var previousPins = pinnedKeys.slice(0), at = pinnedKeys.indexOf(key);
    if (at >= 0) {
      if (forcePin) return;
      if (pinnedKeys.length <= 1) { toast("Keep one app pinned so Home always has a shortcut."); return; }
      pinnedKeys.splice(at, 1);
    } else pinnedKeys.push(key);
    if (!savePins()) { pinnedKeys = previousPins; return; }
    rebuildPinnedRow();
    sortHomeItems();
    if (appearance.layout === "dock") dockPos = findDockPosition(key);
    else pos = findPosition(key);
    renderHome();
    focus();
    if (allOpen) allFocus();
  }
  function renderAllGrid() {
    var html = "";
    allItems.forEach(function (app, i) {
      html += '<div class="ac" id="ac' + i + '"><div class="n">' + esc(app.name) + '</div><div class="i">' + esc(app.id || "Website shortcut") + '</div></div>';
    });
    $("allGridIn").innerHTML = html;
  }
  function removeWebsiteShortcut(entry) {
    if (!entry || !entry.key || !entry.app || !entry.app.url) return;
    var custom = false;
    for (var i = 0; i < customApps.length; i++) if (customApps[i].key === entry.key) custom = true;
    if (!custom) return;
    if (pendingDeleteKey !== entry.key) {
      pendingDeleteKey = entry.key;
      paintAllPreview(entry);
      toast("Press Red again to remove " + entry.name + ".");
      return;
    }
    var oldApps = customApps.slice(0), oldPins = pinnedKeys.slice(0);
    if (pinnedKeys.indexOf(entry.key) >= 0 && pinnedKeys.length <= 1) {
      pendingDeleteKey = null;
      toast("Pin another app before removing this one.");
      return;
    }
    customApps = customApps.filter(function (app) { return app.key !== entry.key; });
    pinnedKeys = pinnedKeys.filter(function (key) { return key !== entry.key; });
    try {
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(customApps));
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedKeys));
    } catch (e) {
      customApps = oldApps;
      pinnedKeys = oldPins;
      toast("Couldn't remove the website from TV storage.");
      return;
    }
    delete appCatalog[entry.key];
    pendingDeleteKey = null;
    rebuildPinnedRow();
    sortHomeItems();
    renderHome();
    pos = { r: 0, c: 0 };
    dockPos = 0;
    focus();
    allItems.splice(allPos, 1);
    allPos = Math.min(allPos, Math.max(0, allItems.length - 1));
    renderAllGrid();
    allFocus();
    toast("Website shortcut removed.");
  }
  function openAll() {
    loadAll(function (list) {
      allItems = list;
      allPos = 0;
      allOpen = true;
      renderAllGrid();
      $("all").className = "";
      allFocus();
    });
  }
  function allFocus() {
    var current = $("ac" + allPos);
    var focused = $all(".ac.f");
    for (var i = 0; i < focused.length; i++) focused[i].className = "ac";
    if (!current) { paintAllPreview(null); return; }
    if (pendingDeleteKey !== allItems[allPos].key) pendingDeleteKey = null;
    current.className = "ac f";
    var perRow = 3, rowIndex = Math.floor(allPos / perRow);
    var trans = "translateY(" + (-Math.max(0, rowIndex - 3) * 150) + "px)";
    $("allGridIn").style.webkitTransform = trans;
    $("allGridIn").style.transform = trans;
    paintAllPreview(allItems[allPos]);
  }
  function closeAll() { allOpen = false; $("all").className = "hidden"; focus(); }
  $("pinButton").addEventListener("click", function () { togglePin(allItems[allPos]); });
  $("removeUrlButton").addEventListener("click", function () { removeWebsiteShortcut(allItems[allPos]); });
  $("urlButton").addEventListener("click", function () { openEditor("url"); });

  /* ---------- remote navigation ---------- */
  function focusUtilities() {
    clearTileFocus();
    utilPos = 0;
    utilPaint();
    paintPreview(null, "All apps", "Open your installed-app library or Home settings");
  }
  document.addEventListener("keydown", function (event) {
    var key = event.keyCode;
    if (editorOpen) {
      if (key === KEY.BACK || key === KEY.ESC || key === KEY.BS || key === KEY.IME_CANCEL) { event.preventDefault(); closeEditor(); return; }
      if (key === KEY.ENTER || key === KEY.IME_DONE) {
        if (editorMode === "url" && document.activeElement === $("editorName")) $("editorUrl").focus();
        else saveEditor(event);
        event.preventDefault();
      }
      return;
    }
    if (settingsOpen) {
      var settingsCount = settingsDefinitions().length;
      if (key === KEY.UP) settingsPos = Math.max(0, settingsPos - 1);
      else if (key === KEY.DOWN) settingsPos = Math.min(settingsCount - 1, settingsPos + 1);
      else if (key === KEY.LEFT || key === KEY.RIGHT) changeSetting(key === KEY.LEFT ? -1 : 1, false);
      else if (key === KEY.ENTER) changeSetting(1, true);
      else if (key === KEY.BACK || key === KEY.ESC || key === KEY.BS) closeSettings();
      else return;
      event.preventDefault();
      if (settingsOpen) renderSettings();
      return;
    }
    if (allOpen) {
      var total = allItems.length, perRow = 3;
      if (key === KEY.LEFT) allPos = Math.max(0, allPos - 1);
      else if (key === KEY.RIGHT) allPos = Math.min(Math.max(0, total - 1), allPos + 1);
      else if (key === KEY.UP) allPos = Math.max(0, allPos - perRow);
      else if (key === KEY.DOWN) allPos = Math.min(Math.max(0, total - 1), allPos + perRow);
      else if (key === KEY.ENTER) { if (allItems[allPos]) launch(allItems[allPos].app, allItems[allPos].key); }
      else if (key === KEY.GREEN) togglePin(allItems[allPos]);
      else if (key === KEY.RED) removeWebsiteShortcut(allItems[allPos]);
      else if (key === KEY.BLUE) openEditor("url");
      else if (key === 80 || key === 112) togglePin(allItems[allPos]);
      else if (key === 85 || key === 117) openEditor("url");
      else if (key === KEY.BACK || key === KEY.ESC || key === KEY.BS) closeAll();
      else return;
      event.preventDefault();
      if (allOpen) allFocus();
      return;
    }
    if (utilPos >= 0) {
      if (key === KEY.LEFT) utilPos = Math.max(0, utilPos - 1);
      else if (key === KEY.RIGHT) utilPos = Math.min(2, utilPos + 1);
      else if (key === KEY.DOWN) { focus(); return; }
      else if (key === KEY.ENTER) {
        var action = utilPos;
        utilPos = -1;
        utilPaint();
        if (action === 0) openAll();
        else if (action === 1) openSettings();
        else quit();
        return;
      } else if (key === KEY.BACK || key === KEY.ESC || key === KEY.BS) { event.preventDefault(); return; }
      else return;
      event.preventDefault();
      utilPaint();
      var utilityNames = ["All apps", "Home settings", "Exit launcher"];
      paintPreview(null, utilityNames[utilPos], "Select to continue");
      return;
    }
    if (appearance.layout === "dock") {
      if (key === KEY.LEFT) dockPos = Math.max(0, dockPos - 1);
      else if (key === KEY.RIGHT) dockPos = Math.min(dockItems.length - 1, dockPos + 1);
      else if (key === KEY.UP) { focusUtilities(); event.preventDefault(); return; }
      else if (key === KEY.ENTER) { activate(currentItem()); return; }
      else if (key === KEY.BACK || key === KEY.ESC || key === KEY.BS) { event.preventDefault(); return; }
      else return;
      event.preventDefault();
      focus();
      return;
    }
    if (key === KEY.UP) {
      if (pos.c > 0) pos.c--;
      else if (pos.r > 0) { pos.r--; pos.c = rows[pos.r].items.length - 1; }
      else { focusUtilities(); event.preventDefault(); return; }
    } else if (key === KEY.DOWN) {
      if (pos.c < rows[pos.r].items.length - 1) pos.c++;
      else if (pos.r < rows.length - 1) { pos.r++; pos.c = 0; }
    } else if (key === KEY.ENTER) { activate(currentItem()); return; }
    else if (key === KEY.BACK || key === KEY.ESC || key === KEY.BS) { event.preventDefault(); return; }
    else return;
    event.preventDefault();
    focus();
  });

  /* ---------- clock ---------- */
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function tick() {
    var d = new Date(), hour = d.getHours(), minute = d.getMinutes();
    var hh = CFG.clock24h ? (hour < 10 ? "0" + hour : hour) : (hour % 12 || 12);
    $("clock").textContent = hh + ":" + (minute < 10 ? "0" + minute : minute);
    $("date").textContent = DAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()];
    var greeting = appearance.greetingMode === "custom"
      ? appearance.customGreeting
      : (hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    $("greet").textContent = appearance.name ? greeting + ", " + appearance.name : greeting;
  }
  tick();
  setInterval(tick, 15000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });

  focus();
  if (window.location.hash === "#all") openAll();
})();
