// "How it works" phone mockup. Starts on a splash screen (matches the app's
// real BootSplash: black background, logo, wordmark), then once the section
// scrolls into view, autoplays through every real screen every 3s - so it
// reads correctly for someone just scrolling past, not only for a mouse
// hovering the steps. The matching step's text is highlighted in sync with
// whichever screen is showing, whether that's from autoplay or a hover.
// Hovering (or focusing) a step jumps straight to that step's screen and
// pauses the autoplay; leaving resumes the cycle from the NEXT screen after
// the one you were just looking at, not wherever autoplay had been before.
(function () {
  var section = document.getElementById("howitworks");
  var steps = document.getElementById("howitworks-steps");
  var stack = document.getElementById("phone-content-stack");
  var tabbar = document.getElementById("phone-tabbar");
  if (!section || !steps || !stack || !tabbar) return;

  var variants = stack.querySelectorAll(".phone-screen-variant");
  var tabs = tabbar.querySelectorAll(".phone-tab");
  var stepEls = steps.querySelectorAll(".step[data-screen]");
  var CYCLE = ["onboard", "home", "models", "projects", "playground", "inference"];
  var AUTOPLAY_MS = 3000;

  var autoplayTimer = null;
  var cycleIndex = 0;
  var hovering = false;
  var visible = false;

  function setActiveStep(screen) {
    stepEls.forEach(function (s) {
      s.classList.toggle("active", s.getAttribute("data-screen") === screen);
    });
  }

  function showScreen(screen) {
    variants.forEach(function (v) {
      v.classList.toggle("active", v.getAttribute("data-screen") === screen);
    });
    setActiveStep(screen);
    if (screen === "onboard" || screen === "loading") {
      tabbar.classList.add("hidden");
      return;
    }
    tabbar.classList.remove("hidden");
    tabs.forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-tab") === screen);
    });
  }

  function advanceAutoplay() {
    showScreen(CYCLE[cycleIndex]);
    cycleIndex = (cycleIndex + 1) % CYCLE.length;
  }

  function startAutoplay() {
    if (autoplayTimer) return;
    advanceAutoplay();
    autoplayTimer = setInterval(advanceAutoplay, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function resumeIfIdle() {
    if (visible && !hovering) startAutoplay();
  }

  stepEls.forEach(function (step) {
    var screen = step.getAttribute("data-screen");
    var idx = CYCLE.indexOf(screen);
    function activate() {
      hovering = true;
      stopAutoplay();
      // Resume from the screen AFTER the one just looked at, not wherever
      // autoplay happened to be before this hover interrupted it.
      if (idx !== -1) cycleIndex = (idx + 1) % CYCLE.length;
      showScreen(screen);
    }
    step.addEventListener("mouseenter", activate);
    step.addEventListener("focus", activate);
  });

  steps.addEventListener("mouseleave", function () {
    hovering = false;
    resumeIfIdle();
  });
  steps.addEventListener("focusout", function (e) {
    if (steps.contains(e.relatedTarget)) return;
    hovering = false;
    resumeIfIdle();
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          if (visible) resumeIfIdle();
          else stopAutoplay();
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(section);
  } else {
    visible = true;
    startAutoplay();
  }
})();
