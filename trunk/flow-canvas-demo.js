// A faithful recreation of the app's actual Playground canvas
// (app/src/components/flow/FlowCanvas.tsx + FlowNodeView.tsx): same node
// card dimensions, same handle styling, same routed step-line connectors
// with rounded corners and a remove badge, same START/END labeling, and
// the app's real interaction patterns for adding/removing nodes: a
// circular accent FAB opening a picker menu (FlowListScreen.tsx's FAB),
// and holding a node to delete it (the long-press action sheet in
// FlowEditorScreen, simplified here to its one relevant action since
// "Set as Start" is auto-derived and "Disconnect" already lives on the
// connection's own remove badge).
(function () {
  var canvas = document.getElementById("flow-canvas");
  var content = document.getElementById("flow-canvas-content");
  var svg = document.getElementById("flow-canvas-lines");
  var fab = document.getElementById("flow-fab");
  var fabMenu = document.getElementById("flow-fab-menu");
  var resetBtn = document.getElementById("flow-canvas-reset");
  if (!canvas || !content || !svg || !fab || !fabMenu || !resetBtn) return;

  var pan = { x: 0, y: 0 };

  var NODE_WIDTH = 150;
  var NODE_HEIGHT = 76;
  var BADGE_SIZE = 22;
  var CORNER_RADIUS = 12;
  var LONG_PRESS_MS = 550;
  var DRAG_CANCEL_THRESHOLD = 6;

  var AGENT_LIBRARY = [
    { id: "summarizer", label: "Summarizer" },
    { id: "explainer", label: "Explainer" },
    { id: "tone", label: "Tone Rewriter" },
    { id: "reviewer", label: "Code Reviewer" },
    { id: "translator", label: "Translator" },
  ];

  // Offsets keep this same 5-slot layout, just shifted so its bounding box
  // sits at the center of CONTENT_WIDTH/HEIGHT (below) instead of hugging
  // the content area's top-left corner - the whole point of centering is
  // so panning has real room to move in every direction, not just
  // down-and-right from an origin the nodes were already crammed against.
  var SLOT_OFFSET_X = 795;
  var SLOT_OFFSET_Y = 611;
  var SLOTS = [
    { x: 20 + SLOT_OFFSET_X, y: 16 + SLOT_OFFSET_Y },
    { x: 230 + SLOT_OFFSET_X, y: 16 + SLOT_OFFSET_Y },
    { x: 440 + SLOT_OFFSET_X, y: 16 + SLOT_OFFSET_Y },
    { x: 125 + SLOT_OFFSET_X, y: 186 + SLOT_OFFSET_Y },
    { x: 335 + SLOT_OFFSET_X, y: 186 + SLOT_OFFSET_Y },
  ];

  var nodes = {}; // id -> { x, y, slot }
  var connections = []; // { from, to }
  var pendingSource = null;
  var nodeEls = {};
  var fabOpen = false;

  function agentLabel(id) {
    var a = AGENT_LIBRARY.find(function (a) { return a.id === id; });
    return a ? a.label : id;
  }

  function freeSlotIndex() {
    var used = Object.keys(nodes).map(function (id) { return nodes[id].slot; });
    for (var i = 0; i < SLOTS.length; i++) {
      if (used.indexOf(i) === -1) return i;
    }
    return -1;
  }

  function addNode(id) {
    if (nodes[id]) return;
    var slot = freeSlotIndex();
    if (slot === -1) return;
    nodes[id] = { x: SLOTS[slot].x, y: SLOTS[slot].y, slot: slot };
    render();
  }

  function removeNode(id) {
    if (!nodes[id]) return;
    delete nodes[id];
    connections = connections.filter(function (c) { return c.from !== id && c.to !== id; });
    if (pendingSource === id) pendingSource = null;
    render();
  }

  // Content-space bounds a node can occupy - matches .flow-canvas-lines'
  // fixed size in style.css (generously larger than the visible viewport,
  // since the viewport now pans over this space instead of the space being
  // sized to fit the viewport).
  var CONTENT_WIDTH = 2200;
  var CONTENT_HEIGHT = 1500;

  function clampToCanvas(node) {
    var maxX = CONTENT_WIDTH - NODE_WIDTH - 4;
    var maxY = CONTENT_HEIGHT - NODE_HEIGHT - 4;
    node.x = Math.max(4, Math.min(maxX, node.x));
    node.y = Math.max(4, Math.min(maxY, node.y));
  }

  function createsCycle(fromId, toId) {
    var cur = toId;
    var guard = 0;
    while (cur && guard++ < AGENT_LIBRARY.length + 1) {
      if (cur === fromId) return true;
      var next = connections.find(function (c) { return c.from === cur; });
      cur = next ? next.to : null;
    }
    return false;
  }

  // The node with an outgoing connection but no incoming one is "start"
  // (if there's exactly one candidate); the terminal node reached by
  // walking forward from it is "end" - mirrors findEndNodeId in the app,
  // simplified here since the demo derives start from graph shape instead
  // of an explicit long-press "Set as Start" action.
  function findStartAndEnd() {
    var hasIncoming = {};
    connections.forEach(function (c) { hasIncoming[c.to] = true; });
    var candidates = connections
      .map(function (c) { return c.from; })
      .filter(function (id, i, arr) { return arr.indexOf(id) === i && !hasIncoming[id]; });
    if (candidates.length !== 1) return { start: null, end: null };
    var start = candidates[0];
    var cur = start;
    var guard = 0;
    while (guard++ < AGENT_LIBRARY.length + 1) {
      var next = connections.find(function (c) { return c.from === cur; });
      if (!next) break;
      cur = next.to;
    }
    return { start: start, end: cur === start ? null : cur };
  }

  function closeFabMenu() {
    fabOpen = false;
    fabMenu.classList.remove("open");
  }

  function renderFabMenu() {
    fabMenu.innerHTML = "";
    var available = AGENT_LIBRARY.filter(function (a) { return !nodes[a.id]; });
    if (available.length === 0) {
      var empty = document.createElement("div");
      empty.className = "flow-fab-menu-empty";
      empty.textContent = "All agents are on the canvas.";
      fabMenu.appendChild(empty);
      return;
    }
    available.forEach(function (agent, i) {
      var item = document.createElement("button");
      item.className = "flow-fab-menu-item";
      item.textContent = agent.label;
      item.addEventListener("click", function () {
        addNode(agent.id);
        closeFabMenu();
      });
      fabMenu.appendChild(item);
      if (i < available.length - 1) {
        var divider = document.createElement("div");
        divider.className = "flow-fab-menu-divider";
        fabMenu.appendChild(divider);
      }
    });
  }

  fab.addEventListener("click", function (e) {
    e.stopPropagation();
    fabOpen = !fabOpen;
    if (fabOpen) renderFabMenu();
    fabMenu.classList.toggle("open", fabOpen);
  });

  function render() {
    content.querySelectorAll(".flow-canvas-node").forEach(function (el) { el.remove(); });
    nodeEls = {};

    var startEnd = findStartAndEnd();

    Object.keys(nodes).forEach(function (id) {
      var node = nodes[id];
      var isStart = startEnd.start === id;
      var isEnd = startEnd.end === id;
      var el = document.createElement("div");
      el.className = "flow-canvas-node";
      el.style.left = node.x + "px";
      el.style.top = node.y + "px";
      el.innerHTML =
        '<span class="flow-canvas-handle flow-canvas-handle-in' + (isStart ? " hidden" : "") + '" data-handle="in" data-node="' + id + '"></span>' +
        '<div class="flow-canvas-card' + (isStart ? " is-start" : "") + (isEnd ? " is-end" : "") + '">' +
        '<div class="flow-canvas-node-label">' + agentLabel(id) + "</div>" +
        (isStart ? '<div class="flow-canvas-node-tag flow-canvas-node-tag-start">START</div>' : "") +
        (isEnd ? '<div class="flow-canvas-node-tag flow-canvas-node-tag-end">END</div>' : "") +
        "</div>" +
        '<span class="flow-canvas-handle flow-canvas-handle-out" data-handle="out" data-node="' + id + '"></span>';
      content.appendChild(el);
      nodeEls[id] = el;

      var card = el.querySelector(".flow-canvas-card");
      var longPressTimer = null;
      var startX, startY, origX, origY;

      function cancelLongPress() {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
          card.classList.remove("holding");
        }
      }

      // Drag continuation is handled on `window`, not just this card, once
      // a drag starts - relying solely on this small ~150x76px card's own
      // pointermove + setPointerCapture means a drag silently dies the
      // moment a touch drifts off the card's original bounds on any mobile
      // browser where pointer capture doesn't hold reliably. Listening on
      // window guarantees the drag keeps tracking the finger regardless.
      var activePointerId = null;

      function onWindowPointerMove(e) {
        if (e.pointerId !== activePointerId) return;
        var dx = e.clientX - startX, dy = e.clientY - startY;
        if (longPressTimer && Math.hypot(dx, dy) > DRAG_CANCEL_THRESHOLD) cancelLongPress();
        node.x = origX + dx;
        node.y = origY + dy;
        clampToCanvas(node);
        el.style.left = node.x + "px";
        el.style.top = node.y + "px";
        drawLines();
        updateResetButtonVisibility();
        e.preventDefault();
      }

      function endDrag(e) {
        if (e && e.pointerId !== activePointerId) return;
        activePointerId = null;
        cancelLongPress();
        window.removeEventListener("pointermove", onWindowPointerMove);
        window.removeEventListener("pointerup", endDrag);
        window.removeEventListener("pointercancel", endDrag);
      }

      card.addEventListener("pointerdown", function (e) {
        activePointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        origX = node.x;
        origY = node.y;
        try {
          card.setPointerCapture(e.pointerId);
        } catch (err) {}
        card.classList.add("holding");
        window.addEventListener("pointermove", onWindowPointerMove);
        window.addEventListener("pointerup", endDrag);
        window.addEventListener("pointercancel", endDrag);
        longPressTimer = setTimeout(function () {
          longPressTimer = null;
          // render() (inside removeNode) tears down this card's DOM node -
          // clean up the window-level drag listeners first, or they'd leak
          // and keep firing against a detached element.
          endDrag();
          removeNode(id);
        }, LONG_PRESS_MS);
        e.preventDefault();
      });

      el.querySelector('[data-handle="out"]').addEventListener("click", function () {
        pendingSource = pendingSource === id ? null : id;
        updateHandleHighlights();
      });

      if (!isStart) {
        el.querySelector('[data-handle="in"]').addEventListener("click", function () {
          if (pendingSource && pendingSource !== id && !createsCycle(pendingSource, id)) {
            connections = connections.filter(function (c) { return c.to !== id; });
            connections.push({ from: pendingSource, to: id });
            pendingSource = null;
            updateHandleHighlights();
            render();
          }
        });
      }
    });

    // Nodes render first (bottom), the connections SVG moves back on top of
    // them here - matches FlowCanvas.tsx exactly, so a "backward" connector
    // tucking under a card is never silently hidden behind it. svg stays
    // inside `content` so it pans together with the nodes it connects; the
    // FAB and its menu are direct children of `canvas` instead (fixed to
    // the viewport, not the panned content) so they're always reachable
    // regardless of how far the canvas has been panned.
    content.appendChild(svg);
    canvas.appendChild(fab);
    canvas.appendChild(fabMenu);
    updateHandleHighlights();
    drawLines();
    // Adding/removing a node shifts the cluster's bounding-box centroid,
    // which shifts what "centered" even means - re-check every render, not
    // just on drag/pan, or the button can end up stuck visible (or hidden)
    // after a node is added/removed with the view otherwise untouched.
    updateResetButtonVisibility();
  }

  function updateHandleHighlights() {
    Object.keys(nodeEls).forEach(function (id) {
      var out = nodeEls[id].querySelector('[data-handle="out"]');
      out.classList.toggle("pending", pendingSource === id);
    });
  }

  function handleCenter(id, which) {
    var node = nodes[id];
    return which === "out"
      ? { x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 }
      : { x: node.x, y: node.y + NODE_HEIGHT / 2 };
  }

  // Ported directly from FlowCanvas.tsx's roundedPolylinePath: one
  // continuous rounded-corner path through a sequence of axis-aligned
  // points, radius clamped per-corner to half the shorter adjoining leg.
  function roundedPolylinePath(points, radius) {
    if (points.length < 2) return "";
    var d = "M " + points[0].x + " " + points[0].y;
    for (var i = 1; i < points.length - 1; i++) {
      var prev = points[i - 1], curr = points[i], next = points[i + 1];
      var legPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      var legNext = Math.hypot(next.x - curr.x, next.y - curr.y);
      var r = Math.min(radius, legPrev / 2, legNext / 2);
      var towardPrevX = legPrev === 0 ? 0 : ((prev.x - curr.x) / legPrev) * r;
      var towardPrevY = legPrev === 0 ? 0 : ((prev.y - curr.y) / legPrev) * r;
      var towardNextX = legNext === 0 ? 0 : ((next.x - curr.x) / legNext) * r;
      var towardNextY = legNext === 0 ? 0 : ((next.y - curr.y) / legNext) * r;
      var a = { x: curr.x + towardPrevX, y: curr.y + towardPrevY };
      var b = { x: curr.x + towardNextX, y: curr.y + towardNextY };
      d += " L " + a.x + " " + a.y + " Q " + curr.x + " " + curr.y + " " + b.x + " " + b.y;
    }
    var last = points[points.length - 1];
    d += " L " + last.x + " " + last.y;
    return d;
  }

  // Ported from connectionPathAndBadge: output always exits right, input
  // always enters left, jogging at the vertical midpoint between rows so
  // the horizontal segment lands in the gap between cards rather than
  // crossing either one's text.
  function connectionPathAndBadge(from, to) {
    var dx = to.x - from.x, dy = to.y - from.y;
    var gap = Math.max(24, CORNER_RADIUS + 12);
    var vGap = Math.abs(dy);

    if (vGap < CORNER_RADIUS * 4) {
      return { d: "M " + from.x + " " + from.y + " L " + to.x + " " + to.y, badge: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } };
    }

    var midY = from.y + dy / 2;
    var x1 = from.x + gap;
    var x2 = to.x - gap;
    var points = [from, { x: x1, y: from.y }, { x: x1, y: midY }, { x: x2, y: midY }, { x: x2, y: to.y }, to];
    return { d: roundedPolylinePath(points, CORNER_RADIUS), badge: { x: (x1 + x2) / 2, y: midY } };
  }

  function drawLines() {
    svg.innerHTML = "";
    content.querySelectorAll(".flow-canvas-badge").forEach(function (el) { el.remove(); });

    connections.forEach(function (c) {
      if (!nodes[c.from] || !nodes[c.to]) return;
      var from = handleCenter(c.from, "out");
      var to = handleCenter(c.to, "in");
      var result = connectionPathAndBadge(from, to);

      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", result.d);
      path.setAttribute("class", "flow-canvas-line");
      svg.appendChild(path);

      var badge = document.createElement("button");
      badge.className = "flow-canvas-badge";
      badge.style.left = result.badge.x - BADGE_SIZE / 2 + "px";
      badge.style.top = result.badge.y - BADGE_SIZE / 2 + "px";
      badge.textContent = "×";
      badge.title = "Remove connection";
      badge.addEventListener("click", function () {
        connections = connections.filter(function (conn) { return conn !== c; });
        render();
      });
      content.appendChild(badge);
    });
  }

  canvas.addEventListener("click", function (e) {
    if (!e.target.closest(".flow-canvas-node")) {
      pendingSource = null;
      updateHandleHighlights();
    }
    if (!e.target.closest(".flow-fab") && !e.target.closest(".flow-fab-menu")) {
      closeFabMenu();
    }
  });

  function applyPan() {
    content.style.left = pan.x + "px";
    content.style.top = pan.y + "px";
  }

  // Keeps the panned content from being dragged so far that the whole
  // node area disappears past the viewport with no visible way back short
  // of Reset - still generous enough that reaching any node in CONTENT_
  // WIDTH/HEIGHT never requires panning right to this limit in practice.
  // pan.x/y is content's CSS left/top - i.e. where content's own (0,0)
  // sits relative to the viewport's top-left corner. pan.x = 0 means
  // content's left edge lines up with the viewport's left edge; panning
  // the view further right (revealing content to the left of what's
  // currently shown) makes pan.x positive; panning further left (revealing
  // content to the right) makes it negative. Content is CONTENT_WIDTH wide,
  // the viewport is only canvas.clientWidth wide, so valid range is
  // [clientWidth - CONTENT_WIDTH, 0] if content starts flush at the origin.
  // But nodes here are deliberately centered mid-content (SLOT_OFFSET_X/Y
  // above), not hugging that origin, so there's real content in every
  // direction from the initial view - the fix is exactly this range, which
  // already permits pan.x up to 0 (content flush left) and down to
  // clientWidth - CONTENT_WIDTH (content flush right, since that's negative
  // for any content wider than the viewport). Same for Y.
  function clampPan() {
    var minX = Math.min(0, canvas.clientWidth - CONTENT_WIDTH);
    var minY = Math.min(0, canvas.clientHeight - CONTENT_HEIGHT);
    pan.x = Math.max(minX, Math.min(0, pan.x));
    pan.y = Math.max(minY, Math.min(0, pan.y));
  }

  // Panning the empty background - separate from a node's own drag
  // handler (attached to `.flow-canvas-card`, which stops the pointerdown
  // from reaching here via normal DOM targeting: e.target is the card or
  // one of its children, never `canvas` itself, whenever a drag starts on
  // a node instead of the background).
  var panPointerId = null;
  var panStartX, panStartY, panOrigX, panOrigY;

  function onPanMove(e) {
    if (e.pointerId !== panPointerId) return;
    pan.x = panOrigX + (e.clientX - panStartX);
    pan.y = panOrigY + (e.clientY - panStartY);
    clampPan();
    applyPan();
    updateResetButtonVisibility();
    e.preventDefault();
  }

  function endPan(e) {
    if (e && e.pointerId !== panPointerId) return;
    panPointerId = null;
    canvas.classList.remove("panning");
    window.removeEventListener("pointermove", onPanMove);
    window.removeEventListener("pointerup", endPan);
    window.removeEventListener("pointercancel", endPan);
  }

  canvas.addEventListener("pointerdown", function (e) {
    if (
      e.target.closest(".flow-canvas-node") ||
      e.target.closest(".flow-canvas-badge") ||
      e.target.closest(".flow-fab") ||
      e.target.closest(".flow-fab-menu") ||
      e.target.closest(".flow-canvas-reset")
    ) {
      return;
    }
    panPointerId = e.pointerId;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panOrigX = pan.x;
    panOrigY = pan.y;
    canvas.classList.add("panning");
    window.addEventListener("pointermove", onPanMove);
    window.addEventListener("pointerup", endPan);
    window.addEventListener("pointercancel", endPan);
  });

  // Centers the whole node cluster's bounding-box middle in the viewport
  // (not just one anchor node) - the one fixed, predictable place the
  // recenter button can always return to regardless of how far the graph
  // has been dragged around or which single node happens to be "start".
  // Falls back to content's own center if the canvas is empty. Pure - just
  // computes the target, doesn't touch `pan` - so callers can compare it
  // against the live pan to decide whether recentering would even do
  // anything, without needing a separate "am I centered" flag to keep in
  // sync by hand.
  function computeCenteredPan() {
    var ids = Object.keys(nodes);
    var target;
    if (ids.length > 0) {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      ids.forEach(function (id) {
        var n = nodes[id];
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + NODE_WIDTH);
        maxY = Math.max(maxY, n.y + NODE_HEIGHT);
      });
      target = { x: canvas.clientWidth / 2 - (minX + maxX) / 2, y: canvas.clientHeight / 2 - (minY + maxY) / 2 };
    } else {
      target = { x: canvas.clientWidth / 2 - CONTENT_WIDTH / 2, y: canvas.clientHeight / 2 - CONTENT_HEIGHT / 2 };
    }
    var savedX = pan.x, savedY = pan.y;
    pan.x = target.x;
    pan.y = target.y;
    clampPan();
    var clamped = { x: pan.x, y: pan.y };
    pan.x = savedX;
    pan.y = savedY;
    return clamped;
  }

  // Sub-pixel drift (from repeated drag deltas) would otherwise keep the
  // button visible forever even after landing back essentially on-center.
  var CENTERED_TOLERANCE = 1;

  function isAlreadyCentered() {
    var target = computeCenteredPan();
    return Math.abs(pan.x - target.x) < CENTERED_TOLERANCE && Math.abs(pan.y - target.y) < CENTERED_TOLERANCE;
  }

  // Only ever a recentering shortcut, never a "clear the flow back to
  // default" action - nodes/connections are completely untouched here, on
  // purpose, so it can't be confused with resetting the flow's actual
  // contents. Shown only once the view has actually drifted from center
  // (see updateResetButtonVisibility), so it never sits there implying
  // there's a change to undo when there isn't one.
  function recenterView() {
    var target = computeCenteredPan();
    pan.x = target.x;
    pan.y = target.y;
    applyPan();
    updateResetButtonVisibility();
  }

  function updateResetButtonVisibility() {
    resetBtn.classList.toggle("visible", !isAlreadyCentered());
  }

  resetBtn.addEventListener("click", recenterView);

  window.addEventListener("resize", function () {
    clampPan();
    applyPan();
    drawLines();
    updateResetButtonVisibility();
  });

  // Start with a realistic 3-agent chain already wired up: condense a long
  // document, explain it plainly, then adjust the tone for the audience.
  addNode("summarizer");
  addNode("explainer");
  addNode("tone");
  connections.push({ from: "summarizer", to: "explainer" });
  connections.push({ from: "explainer", to: "tone" });
  render();
  recenterView();
})();
