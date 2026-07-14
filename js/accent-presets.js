// Shared accent-palette data + persistence, loaded before main.js on every
// page. A chosen palette is a real site-wide preference now, like the
// dark/light toggle - it applies on every page and survives a light/dark
// toggle too, only changing when a swatch is actually tapped again. The
// exact ACCENT_PRESETS values from app/src/theme/colors.ts.
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

  var STORAGE_KEY = "tuskerlabs-accent-preset";

  function resolvePresetName(lookDefaultName) {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    if (stored && PRESETS.some(function (p) { return p.name === stored; })) return stored;
    return lookDefaultName;
  }

  function applyPreset(name, scheme) {
    var preset = PRESETS.find(function (p) { return p.name === name; });
    if (!preset) return null;
    var root = document.documentElement.style;
    root.setProperty("--accent", preset.primary[scheme]);
    root.setProperty("--accent-secondary", preset.secondary[scheme]);
    root.setProperty("--accent-tertiary", preset.tertiary[scheme]);
    return preset;
  }

  function persistPreset(name) {
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch (e) {}
  }

  window.TuskerAccent = {
    PRESETS: PRESETS,
    resolvePresetName: resolvePresetName,
    applyPreset: applyPreset,
    persistPreset: persistPreset,
  };
})();
