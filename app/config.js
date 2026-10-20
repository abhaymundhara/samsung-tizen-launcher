// Edit this file to change your home screen, then re-run scripts/install.sh.
// App IDs: open "All Apps" on the launcher to see every installed app's ID.
window.LAUNCHER_CONFIG = {
  name: "Abhay",              // greeting next to the clock; "" to hide
  greetingMode: "time",       // "time" or "custom"; editable on the TV
  customGreeting: "Welcome home",
  customJsEnabled: true,       // loads the local, user-editable app/custom.js extension
  clock24h: false,
  theme: "graphite",          // "graphite" | "dusk" | "midnight"
  // Backgrounds are selected in Home Settings and saved on this TV.
  wallpapers: [
    "wallpaper/image1.jpg",
    "wallpaper/image2.jpg",
    "wallpaper/image3.jpg",
    "wallpaper/image4.jpg"
  ],
  wallpaperNames: ["Coastal dusk", "City lights", "Night valley", "Earth at night"],
  wallpaperRotationSeconds: 60,
  layout: "list",             // "list" | "dock"
  material: "clear",           // "clear" | "glass" (static tint; no live blur)
  focusStyle: "type",          // "type" | "glass"
  typography: "light",         // "light" | "standard"

  // EXPERIMENTAL: come back to this launcher after you exit an app (Netflix etc.).
  // Set stayHome to false to turn the whole thing off. Quit always exits for real.
  stayHome: true,
  stayHomePollSeconds: 3,     // while hidden, how often to check whether the app you opened has closed
  stayHomeMaxPerMinute: 2,    // safety: never relaunch more than this many times per minute
  stayHomeMaxPerHour: 12,     // safety: hard cap; after it the feature pauses until the launcher is opened by hand

  // Hide packages removed from this TV even if Samsung's app catalogue cache is stale.
  hiddenApps: [
    "WcsAp4xyb3.tvapp", "com.samsung.tv.aria-video", "BlDC3WXVuw.sample",
    "J9fZJDMi1v.SecurityCenter", "rJeHak5zRg.Spotify", "Tv2TzjwBfW.TOD",
    "yvoS9TN5KY.YangoSpark", "h6D3hH79er.emanual", "yoJJUiOgq9.laCollection",
    "lac0AcD2Ae.sharqTV", "Di0N6xZMEA.disneyplus", "Ggl33q588H.MBC",
    "d5y9d1orz6.starz"
  ],

  // bg supplies a restrained monogram fallback if the TV does not return an app icon.
  apps: {
    netflix: {
      name: "Netflix", id: "3201907018807",
      iconFile: "file:///opt/share/webappservice/apps_icon/all/3201907018807/304x304.png",
      iconIds: ["org.tizen.netflix-app"], iconNames: ["Netflix"], bg: "#E50914"
    },
    youtube: {
      name: "YouTube", id: "9Ur5IzDKqV.TizenYouTube",
      iconFile: "file:///opt/share/webappservice/apps_icon/all/111299001912/304x304.png",
      iconIds: ["111299001912"], iconNames: ["YouTube"], bg: "#FF0000"
    },
    prime: {
      name: "Prime Video", id: "3201910019365",
      iconFile: "file:///opt/share/webappservice/apps_icon/all/3201910019365/304x304.png",
      iconIds: ["org.tizen.primevideo"], iconNames: ["Prime Video", "Amazon Prime Video"], bg: "#00A8E1"
    },
    browser: {
      name: "Browser", id: "org.tizen.browser",
      iconFile: "file:///opt/share/webappservice/apps_icon/all/3202010022079/304x304.png",
      iconIds: ["3202010022079"], iconNames: ["Browser", "Internet"], bg: "#F5F5F7"
    },
    apne: {
      name: "Apne TV", url: "https://apne.co/",
      browserId: "org.tizen.browser", monogram: "AP", bg: "#263d4d"
    }
  },

  // Sections on the home screen, top to bottom.
  // All apps, Settings, and Exit live in the utility row.
  rows: [
    { title: "Watch", apps: ["netflix", "youtube", "prime", "browser", "apne"] }
  ]
};
