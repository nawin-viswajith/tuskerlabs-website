// Live accent-palette picker - uses the shared TuskerAccent module
// (accent-presets.js, must load before this file) for the actual preset
// data and persistence. Tapping a swatch is now a real site-wide
// preference, applied on every page and surviving a light/dark toggle,
// same as the app's Settings > Appearance screen it demonstrates - not a
// same-page-only preview anymore.
(function () {
  if (!window.TuskerAccent) return;
  var PRESETS = window.TuskerAccent.PRESETS;

  var row = document.getElementById("swatch-row");
  if (!row) return;

  function scheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  // The site-wide look pairs dark with Greyscale and light with Sunset
  // (see LOOKS in main.js) - only relevant here as the fallback when
  // nothing's been persisted yet.
  function lookDefaultPresetName() {
    return scheme() === "light" ? "Sunset" : "Greyscale";
  }

  function currentPresetName() {
    return window.TuskerAccent.resolvePresetName(lookDefaultPresetName());
  }

  function applyPreset(preset) {
    var s = scheme();
    window.TuskerAccent.applyPreset(preset.name, s);
    window.TuskerAccent.persistPreset(preset.name);
    document.querySelectorAll(".swatch").forEach(function (el) {
      el.classList.toggle("active", el.dataset.name === preset.name);
    });
    // A blanket CSS-variable change alone barely shows, since most of the
    // page intentionally doesn't reference --accent - recolor a couple of
    // words in the paragraph right above the swatches too, so tapping one
    // visibly does something even if you're not looking at a link/number.
    var live1 = document.getElementById("palette-live-1");
    var live2 = document.getElementById("palette-live-2");
    if (live1) live1.style.color = preset.primary[s];
    if (live2) live2.style.color = preset.secondary[s];
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

  applyPreset(PRESETS.find(function (p) { return p.name === currentPresetName(); }));

  // Re-render ball colors for the new scheme and re-sync the checkmark
  // whenever the site-wide dark/light toggle fires - main.js's own
  // applyLook already re-applied whichever preset is active (a persisted
  // custom pick survives the toggle; only the look default changes if
  // nothing's been picked yet), this just keeps this page's swatch row in
  // sync with that.
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
        applyPreset(PRESETS.find(function (p) { return p.name === currentPresetName(); }));
      }, 0);
    });
  }
})();
