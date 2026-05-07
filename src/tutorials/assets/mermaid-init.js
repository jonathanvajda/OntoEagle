(function () {
  function renderMermaidBlocks() {
    if (!window.mermaid) return;

    document.querySelectorAll("pre > code.language-mermaid").forEach(function (code, index) {
      var pre = code.parentElement;
      var diagram = document.createElement("div");
      diagram.className = "mermaid";
      diagram.id = "mermaid-diagram-" + index;
      diagram.textContent = code.textContent;
      pre.replaceWith(diagram);
    });

    window.mermaid.initialize({ startOnLoad: false });
    window.mermaid.run({ querySelector: ".mermaid" });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderMermaidBlocks);
  } else {
    renderMermaidBlocks();
  }
})();

