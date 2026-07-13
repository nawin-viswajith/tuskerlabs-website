// Animates the static 3-node example in "How a Flow runs": each node glows
// while "processing" and a caption tracks what's happening - a worked
// example of the exact chain described in the section text above it. Also
// wires up click-to-reveal: tapping a node shows its full system prompt in
// the app's own dialog style (dimmed backdrop, flat card, accent top-border).
(function () {
  var caption = document.getElementById("flow-diagram-caption");
  var node1 = document.getElementById("fd-node-1");
  var node2 = document.getElementById("fd-node-2");
  var node3 = document.getElementById("fd-node-3");
  if (!caption || !node1 || !node2 || !node3) return;

  var PHASES = [
    { active: null, caption: 'Input: "Explain quicksort, with working code"' },
    { active: node1, caption: "Brainstorm: sketching 3 rough approaches..." },
    { active: null, caption: "Passing the strongest approach to Code writer" },
    { active: node2, caption: "Code writer: implementing it..." },
    { active: null, caption: "Passing the draft to Formatter" },
    { active: node3, caption: "Formatter: cleaning up and explaining..." },
    { active: null, caption: "Final response ready.", allDone: true },
  ];

  var phaseIndex = 0;
  var timer = null;

  function applyPhase(phase) {
    [node1, node2, node3].forEach(function (n) { n.classList.remove("active"); });
    if (phase.active) phase.active.classList.add("active");
    caption.textContent = phase.caption;
    caption.classList.toggle("done", !!phase.allDone);
  }

  function tick() {
    applyPhase(PHASES[phaseIndex]);
    phaseIndex = (phaseIndex + 1) % PHASES.length;
    var holdMs = PHASES[(phaseIndex - 1 + PHASES.length) % PHASES.length].allDone ? 2600 : 1700;
    timer = setTimeout(tick, holdMs);
  }

  tick();

  var backdrop = document.getElementById("node-modal-backdrop");
  var titleEl = document.getElementById("node-modal-title");
  var messageEl = document.getElementById("node-modal-message");
  if (!backdrop || !titleEl || !messageEl) return;

  function openPrompt(node) {
    titleEl.textContent = node.querySelector(".flow-node-label").textContent;
    messageEl.textContent = node.getAttribute("data-prompt");
    backdrop.classList.add("open");
  }

  function closePrompt() {
    backdrop.classList.remove("open");
  }

  [node1, node2, node3].forEach(function (node) {
    node.addEventListener("click", function () { openPrompt(node); });
    node.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPrompt(node);
      }
    });
  });

  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) closePrompt();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePrompt();
  });
})();
