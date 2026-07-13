// Live accent-palette picker - the exact ACCENT_PRESETS from
// app/src/theme/colors.ts. Clicking a swatch previews that palette on this
// page only, demonstrating the same system the app's Settings > Appearance
// screen offers. This is a preview sandbox, not a persisted site setting -
// the site-wide look (dark+Greyscale / light+Sunset, set by the nav's
// theme toggle in main.js) is the single source of truth for every other
// page, so this demo never writes to localStorage; it just starts matched
// to whichever look is currently active and resets to it if the page's
// dark/light toggle changes.
(function () {
  var PRESETS = [
    { name: "Ocean", primary: { dark: "#3D7CFF", light: "#2F63D6" }, secondary: { dark: "#22D3EE", light: "#0E7490" }, tertiary: { dark: "#818CF8", light: "#4F46E5" } },
    { name: "Mint", primary: { dark: "#2DD4BF", light: "#0D9488" }, secondary: { dark: "#22C55E", light: "#16A34A" }, tertiary: { dark: "#A3E635", light: "#65A30D" } },
    { name: "Forest", primary: { dark: "#22C55E", light: "#16A34A" }, secondary: { dark: "#A3E635", light: "#65A30D" }, tertiary: { dark: "#EAB308", light: "#A16207" } },
    { name: "Violet", primary: { dark: "#A855F7", light: "#9333EA" }, secondary: { dark: "#EC4899", light: "#DB2777" }, tertiary: { dark: "#818CF8", light: "#4F46E5" } },
    { name: "Sunset", primary: { dark: "#F97316", light: "#EA670C" }, secondary: { dark: "#EF4444", light: "#DC2626" }, tertiary: { dark: "#EAB308", light: "#A16207" } },
    { name: "Blossom", primary: { dark: "#EC4899", light: "#DB2777" }, secondary: { dark: "#C084FC", light: "#A855F7" }, tertiary: { dark: "#818CF8", light: "#4F46E5" } },
    { name: "Greyscale", primary: { dark: "#E5E5E5", light: "#262626" }, secondary: { dark: "#A3A3A3", light: "#525252" }, tertiary: { dark: "#737373", light: "#8C8C8C" } },
  ];

  var row = document.getElementById("swatch-row");
  if (!row) return;

  function scheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  // The site-wide look pairs dark with Greyscale and light with Sunset
  // (see LOOKS in main.js) - this is what the demo resets to, never a
  // remembered custom pick.
  function lookDefaultPresetName() {
    return scheme() === "light" ? "Sunset" : "Greyscale";
  }

  function applyPreset(preset) {
    var root = document.documentElement.style;
    var s = scheme();
    root.setProperty("--accent", preset.primary[s]);
    root.setProperty("--accent-secondary", preset.secondary[s]);
    root.setProperty("--accent-tertiary", preset.tertiary[s]);
    document.querySelectorAll(".swatch").forEach(function (el) {
      el.classList.toggle("active", el.dataset.name === preset.name);
    });
  }

  PRESETS.forEach(function (preset) {
    var btn = document.createElement("button");
    btn.className = "swatch";
    btn.dataset.name = preset.name;
    btn.innerHTML =
      '<span class="swatch-balls">' +
      '<span class="swatch-ball" style="background:' + preset.tertiary[scheme()] + '"></span>' +
      '<span class="swatch-ball" style="background:' + preset.secondary[scheme()] + '"></span>' +
      '<span class="swatch-ball" style="background:' + preset.primary[scheme()] + '"></span>' +
      '<span class="swatch-check">✓</span>' +
      "</span>" +
      '<span class="swatch-name">' + preset.name + "</span>";
    btn.addEventListener("click", function () {
      applyPreset(preset);
    });
    row.appendChild(btn);
  });

  applyPreset(PRESETS.find(function (p) { return p.name === lookDefaultPresetName(); }));

  // Re-render ball colors and reset the preview back to the new look's
  // default preset whenever the site-wide dark/light toggle fires - the
  // toggle is the source of truth, this demo shouldn't fight it.
  var themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      setTimeout(function () {
        var s = scheme();
        PRESETS.forEach(function (preset, i) {
          var balls = row.children[i].querySelectorAll(".swatch-ball");
          balls[0].style.background = preset.tertiary[s];
          balls[1].style.background = preset.secondary[s];
          balls[2].style.background = preset.primary[s];
        });
        applyPreset(PRESETS.find(function (p) { return p.name === lookDefaultPresetName(); }));
      }, 0);
    });
  }
})();
