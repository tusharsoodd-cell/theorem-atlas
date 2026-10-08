/* Theorem Atlas — Calculus AB alpha.
   Static site: loads data/atlas.json, renders the dependency graph,
   tracks per-node status in localStorage. */
(function () {
  "use strict";

  var STORE_KEY = "theorem-atlas-progress-v1";
  var STATUS = ["unseen", "learning", "known", "shaky"];
  var COLORS = {
    unseen:   { bg: "#3a3f4a", border: "#6b7280" },
    learning: { bg: "#4a3a17", border: "#fbbf24" },
    known:    { bg: "#14331f", border: "#4ade80" },
    shaky:    { bg: "#3d1a1a", border: "#f87171" }
  };

  var data, nodes, edges, byId, children, progress, network, activeChapter;

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress() {
    localStorage.setItem(STORE_KEY, JSON.stringify(progress));
  }
  function statusOf(id) { return progress[id] || "unseen"; }

  function depsKnown(n) {
    return (n.depends_on || []).every(function (d) { return statusOf(d) === "known"; });
  }

  function renderMath(el) {
    if (window.renderMathInElement) {
      renderMathInElement(el, {
        delimiters: [
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    }
  }

  function nodeColor(n) { return COLORS[statusOf(n.id)]; }

  function buildGraph() {
    var list = activeChapter
      ? nodes.filter(function (n) { return n.chapter === activeChapter; })
      : nodes.slice();
    var inView = {};
    list.forEach(function (n) { inView[n.id] = true; });

    var dsNodes = list.map(function (n) {
      var c = nodeColor(n);
      return {
        id: n.id,
        label: n.title.replace(/\\\(.*?\\\)/g, "").trim(),
        title: n.title,
        color: { background: c.bg, border: c.border, highlight: { background: c.bg, border: "#fff" } },
        font: { color: "#e8eaf0", size: 13 },
        shape: n.kind === "definition" ? "box" : n.kind === "technique" ? "diamond" : "ellipse",
        margin: 8
      };
    });
    // show cross-chapter deps as dimmed stubs so edges stay meaningful
    var stubs = {};
    list.forEach(function (n) {
      (n.depends_on || []).forEach(function (d) {
        if (!inView[d] && !stubs[d]) {
          stubs[d] = true;
          var src = byId[d];
          dsNodes.push({
            id: d, label: src ? src.title.replace(/\\\(.*?\\\)/g, "").trim() : d,
            color: { background: "#1a1d24", border: "#3a3f4a" },
            font: { color: "#6b7280", size: 11 }, shape: "ellipse", margin: 6
          });
        }
      });
    });

    var dsEdges = [];
    list.forEach(function (n) {
      (n.depends_on || []).forEach(function (d) {
        dsEdges.push({ from: d, to: n.id, arrows: "to", color: { color: "#3a4150" } });
      });
    });

    var container = document.getElementById("graph");
    network = new vis.Network(container,
      { nodes: new vis.DataSet(dsNodes), edges: new vis.DataSet(dsEdges) },
      {
        layout: { hierarchical: { enabled: true, direction: "UD", sortMethod: "directed", levelSeparation: 90, nodeSpacing: 140 } },
        physics: false,
        interaction: { hover: true, navigationButtons: true },
        nodes: { borderWidth: 2 }
      });
    network.on("click", function (p) {
      if (p.nodes.length) inspect(p.nodes[0]); else hideInspect();
    });
  }

  function chapterProgress(cid) {
    var list = nodes.filter(function (n) { return n.chapter === cid; });
    var known = list.filter(function (n) { return statusOf(n.id) === "known"; }).length;
    return { known: known, total: list.length };
  }

  function refreshChrome() {
    var total = nodes.length;
    var known = nodes.filter(function (n) { return statusOf(n.id) === "known"; }).length;
    document.getElementById("known-count").textContent = known;
    document.getElementById("total-count").textContent = total;
    document.getElementById("overall-bar").style.width = (total ? (100 * known / total) : 0) + "%";

    var nav = document.getElementById("chapters");
    nav.innerHTML = "";
    var all = document.createElement("button");
    all.className = "chip-btn" + (!activeChapter ? " active" : "");
    all.textContent = "All chapters";
    all.onclick = function () { activeChapter = null; refreshAll(); };
    nav.appendChild(all);
    data.chapters.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (c) {
      var p = chapterProgress(c.id);
      var b = document.createElement("button");
      b.className = "chip-btn" + (activeChapter === c.id ? " active" : "");
      b.innerHTML = c.title + '<span class="n">' + p.known + "/" + p.total + "</span>";
      b.onclick = function () { activeChapter = c.id; refreshAll(); };
      nav.appendChild(b);
    });

    // up next
    var ul = document.getElementById("upnext-list");
    ul.innerHTML = "";
    var next = nodes.filter(function (n) {
      return statusOf(n.id) !== "known" && depsKnown(n);
    });
    if (!next.length) {
      var li = document.createElement("li");
      li.textContent = "Nothing unblocked — mark dependencies known, or everything's done.";
      ul.appendChild(li);
    }
    next.slice(0, 12).forEach(function (n) {
      var li = document.createElement("li");
      var chap = data.chapters.find(function (c) { return c.id === n.chapter; });
      li.innerHTML = '<span class="k">' + n.kind + " · " + (chap ? chap.title : "") + "</span>" +
        escapeHtml(n.title.replace(/\\\(.*?\\\)/g, "").trim());
      li.onclick = function () { inspect(n.id); };
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function chip(label, target) {
    var b = document.createElement("button");
    b.textContent = label.replace(/\\\(.*?\\\)/g, "").trim();
    b.title = label;
    b.onclick = function () { inspect(target); };
    return b;
  }

  function inspect(id) {
    var n = byId[id];
    if (!n) return;
    var panel = document.getElementById("inspect");
    panel.classList.remove("hidden");

    var kind = document.getElementById("inspect-kind");
    kind.textContent = n.kind;
    kind.className = "kind " + n.kind;

    document.getElementById("inspect-title").textContent =
      n.title.replace(/\\\(/g, "").replace(/\\\)/g, "");

    var st = document.getElementById("inspect-statement");
    st.innerHTML = "<p>" + n.statement + "</p>";
    var pw = document.getElementById("inspect-proof-wrap");
    if (n.proof_sketch) {
      pw.classList.remove("hidden");
      document.getElementById("inspect-proof").innerHTML = "<p>" + n.proof_sketch + "</p>";
    } else { pw.classList.add("hidden"); }
    var nw = document.getElementById("inspect-notes-wrap");
    if (n.notes) {
      nw.classList.remove("hidden");
      document.getElementById("inspect-notes").innerHTML = "<p>" + n.notes + "</p>";
    } else { nw.classList.add("hidden"); }
    [st, pw, nw].forEach(renderMath);

    var deps = document.getElementById("inspect-deps");
    deps.innerHTML = "";
    if (!(n.depends_on || []).length) {
      deps.innerHTML = '<span class="empty">none — a root of the map</span>';
    }
    (n.depends_on || []).forEach(function (d) {
      deps.appendChild(chip(byId[d] ? byId[d].title : d, d));
    });

    var ch = document.getElementById("inspect-children");
    ch.innerHTML = "";
    var kids = children[id] || [];
    if (!kids.length) ch.innerHTML = '<span class="empty">nothing yet — a leaf</span>';
    kids.forEach(function (k) { ch.appendChild(chip(byId[k].title, k)); });

    var sb = document.getElementById("inspect-status");
    sb.innerHTML = "";
    STATUS.forEach(function (s) {
      var b = document.createElement("button");
      b.textContent = s;
      if (statusOf(id) === s) b.className = "on-" + s;
      b.onclick = function () {
        progress[id] = s; saveProgress();
        refreshAll(); inspect(id);
        if (network) {
          var c = nodeColor(n);
          network.body.data.nodes.update({ id: id, color: { background: c.bg, border: c.border } });
        }
      };
      sb.appendChild(b);
    });

    if (network) network.selectNodes([id]);
  }

  function hideInspect() {
    document.getElementById("inspect").classList.add("hidden");
  }

  function refreshAll() {
    buildGraph();
    refreshChrome();
    hideInspect();
  }

  function init(atlas) {
    data = atlas;
    nodes = data.nodes;
    byId = {};
    children = {};
    nodes.forEach(function (n) {
      byId[n.id] = n;
      (n.depends_on || []).forEach(function (d) {
        (children[d] = children[d] || []).push(n.id);
      });
    });
    progress = loadProgress();
    document.getElementById("inspect-close").onclick = hideInspect;
    document.getElementById("reset").onclick = function () {
      if (confirm("Reset all progress?")) {
        progress = {}; saveProgress(); refreshAll();
      }
    };
    refreshAll();
  }

  fetch("data/atlas.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(init)
    .catch(function (e) {
      document.getElementById("graph").innerHTML =
        '<p style="padding:40px;color:#9aa3b2">Could not load data/atlas.json (' +
        escapeHtml(e.message) +
        '). Serve this folder over HTTP (e.g. <code>python3 -m http.server</code>) rather than opening the file directly.</p>';
    });
})();
