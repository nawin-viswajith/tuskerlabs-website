// Site-wide theme toggle - dark/light pairs with a default accent
// (Greyscale/Sunset), but a chosen accent preset (see accent-presets.js,
// which must load before this file) is a real persisted preference that
// overrides the look's default and survives this toggle, not just a
// same-page preview - only tapping a different swatch changes it.
// The early inline script in <head> already set the initial data-theme
// before paint (avoiding a flash); this wires up the button and the
// matching accent override.
(function () {
  var btn = document.querySelector("[data-theme-toggle]");
  if (!btn) return;

  var LOOKS = {
    onyx: { theme: "dark", label: "☀", defaultPreset: "Greyscale" },
    daylight: { theme: "light", label: "☾", defaultPreset: "Sunset" },
  };

  function currentLook() {
    // Light + Sunset is the default look now: anything other than an
    // explicit "dark" attribute (set by the inline head script from a saved
    // preference) resolves to daylight, not the other way around.
    return document.documentElement.getAttribute("data-theme") === "dark" ? "onyx" : "daylight";
  }

  function applyLook(name) {
    var look = LOOKS[name];
    document.documentElement.setAttribute("data-theme", look.theme);
    if (window.TuskerAccent) {
      var presetName = window.TuskerAccent.resolvePresetName(look.defaultPreset);
      window.TuskerAccent.applyPreset(presetName, look.theme);
    }
    try {
      localStorage.setItem("tuskerlabs-theme", look.theme);
    } catch (e) {}
    btn.textContent = look.label;
  }

  applyLook(currentLook());
  btn.addEventListener("click", function () {
    applyLook(currentLook() === "onyx" ? "daylight" : "onyx");
  });
})();

// Sticky nav gets a border once the page has scrolled past the hero.
(function () {
  var nav = document.querySelector(".nav");
  if (!nav) return;
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
})();

// Scroll-reveal via IntersectionObserver - fades/slides .reveal and
// .reveal-group elements in once they enter the viewport, once each.
(function () {
  var targets = document.querySelectorAll(".reveal, .reveal-group");
  if (!targets.length) return;
  if (!("IntersectionObserver" in window)) {
    targets.forEach(function (t) {
      t.classList.add("is-visible");
    });
    return;
  }
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  targets.forEach(function (t) {
    observer.observe(t);
  });
})();
