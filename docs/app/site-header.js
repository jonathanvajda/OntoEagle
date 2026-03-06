// ./app/site-header.js
(() => {
  "use strict";

  // --- Your config (as you provided) ---
  const HEADER_CONFIG = {
    brand: {
      mainLogo: { href: "https://jonathanvajda.github.io/OntoEagle/about.html", src: "./images/main-logo.png", alt: "Erhaben Semantic Solutions" },
      toolLogoByPageId: {
        "ontoeagle": { src: "./images/Eagle-VI_1753264913.svg", alt: "OntoEagle Semantic Lookup" },
        "ontology-tabulator": { src: "./images/ontology-tabulator.svg", alt: "Ontology Tabulator" },
        "cq-ferret": { src: "./images/cq-ferret.svg", alt: "CQ Ferret" },
        "bp-weaver": { src: "./images/bp-weaver.svg", alt: "BP Weaver" },
        "controlled-vocabulary-registry": { src: "./images/controlled-vocabulary-registry.svg", alt: "Controlled Vocabulary Registry" },
        "tom": { src: "./images/tom.svg", alt: "Tabular Ontology Maker" },
        "table-nova": { src: "./images/table-nova-logo.svg", alt: "Table Nova" },
        "axiolotl": { src: "./images/axiolotl.svg", alt: "Axiolotl SPARQL & Inference" },
        "myna-iri-swapper": { src: "./images/myna-iri-swapper.png", alt: "Myna RDF IRI Swapper" },
        "myna-sparql-iri-swapper": { src: "./images/myna-iri-swapper.png", alt: "Myna SPARQL IRI Swapper" },
        "visual-lynx": { src: "./images/visual-lynx.svg", alt: "Visual Lynx" },
      },
      defaultToolLogo: { src: "./images/default-logo.png", alt: "Semantic Tools" },
      titleByPageId: {
        "ontoeagle": { title: "OntoEagle Semantic Lookup" },
        "iri-registry": { title: "IRI Registry" },
        "ontology-tabulator": { title: "Ontology Tabulator" },
        "cq-ferret": { title: "Competency Question Ferret" },
        "bp-weaver": { title: "BP Weaver" },
        "controlled-vocabulary-registry": { title: "Controlled Vocabulary Registry" },
        "tom": { title: "Tabular Ontology Maker" },
        "table-nova": { title: "Table Nova" },
        "shacl-generator": { title: "SHACL Generator" },
        "axiolotl": { title: "Axiolotl SPARQL & Inference" },
        "sparql-pattern-visualizer": { title: "SPARQL Pattern Visualizer" },
        "ontology-curation-manager": { title: "Ontology Curation Manager" },
        "myna-iri-swapper": { title: "Myna RDF IRI Swapper" },
        "myna-sparql-iri-swapper": { title: "Myna SPARQL IRI Swapper" },
        "visual-lynx": { title: "Visual Lynx" },
        "linked-data-transformer": { title: "Linked-Data Transformer" },
        }
    },

    groups: [
      {
        title: "Data Exploration",
        items: [
          { label: "OntoEagle Semantic Lookup", href: "https://jonathanvajda.github.io/OntoEagle", pageId: "ontoeagle" },
        //  { label: "IRI Registry", href: "/iri-registry.html", pageId: "iri-registry" },
          { label: "Ontology Tabulator", href: "https://jonathanvajda.github.io/ontology-tabulator/", pageId: "ontology-tabulator" },
          { label: "Visual Lynx", href: "https://jonathanvajda.github.io/visual-lynx/", pageId: "visual-lynx" },
        ],
      },
      {
        title: "Domain Analysis",
        items: [
          { label: "Competency Question Ferret", href: "https://jonathanvajda.github.io/OntoEagle/cq-ferret.html", pageId: "cq-ferret" },
          /*{ label: "Business Process Weaver", href: "/bp-weaver.html", pageId: "bp-weaver" },*/
          { label: "Mermaid Diagram Builder 🔗", href: "https://skreen5hot.github.io/mermaid/", pageId: "mermaid-diagram-builder" },
        ],
      },
      {
        title: "Building Tools",
        items: [
        //  { label: "Controlled Vocabulary", href: "/controlled-vocabulary-registry.html", pageId: "controlled-vocabulary-registry" },
          { label: "Tabular Ontology Maker (TOM)", href: "https://jonathanvajda.github.io/tabular-ontology-maker/", pageId: "tom" },
          { label: "Table Nova", href: "https://jonathanvajda.github.io/table-nova/", pageId: "table-nova" },
          { label: "Knowledge Graph Modeler 🔗", href: "https://skreen5hot.github.io/kgModeler/", pageId: "kg-modeler" },
        //  { label: "SHACL Generator", href: "/shacl-generator.html", pageId: "shacl-generator" },
        ],
      },
      {
      title: "Data Manipulation",
        items: [
          { label: "Axiolotl SPARQL & Inference", href: "https://jonathanvajda.github.io/axiolotl/", pageId: "axiolotl" },
          { label: "SPARQL Pattern Visualizer", href: "https://jonathanvajda.github.io/sparql-pattern-visualizer/", pageId: "sparql-pattern-visualizer" },
          { label: "Linked-Data Transformer", href: "https://jonathanvajda.github.io/visual-lynx/linked-data-transformer.html", pageId: "linked-data-transformer" },
        ],
      },
      {
        title: "Maintenance",
            items: [
            { label: "Ontology Curation Manager", href: "https://jonathanvajda.github.io/ontology-curation-manager/", pageId: "ontology-curation-manager" },
            { label: "Myna RDF IRI Swapper", href: "https://jonathanvajda.github.io/iri-swapper/", pageId: "myna-iri-swapper" },
            { label: "Myna SPARQL IRI Swapper", href: "https://jonathanvajda.github.io/iri-swapper/sparql-iri-swapper.html", pageId: "myna-sparql-iri-swapper" }, 
            ],
        },
        ],
    };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getPageId() {
    const pid = document.body?.getAttribute("data-page-id");
    return pid && pid.trim() ? pid.trim() : null;
  }

  function pickToolLogo(pageId) {
    const map = HEADER_CONFIG.brand?.toolLogoByPageId || {};
    const fallback = HEADER_CONFIG.brand?.defaultToolLogo || { src: "", alt: "" };
    return (pageId && map[pageId]) ? map[pageId] : fallback;
  }

  function buildSectionsHtml(currentPageId) {
    const groups = Array.isArray(HEADER_CONFIG.groups) ? HEADER_CONFIG.groups : [];
    if (groups.length === 0) return "";

    const sections = groups.map((g) => {
      const title = escapeHtml(g.title || "");
      const items = Array.isArray(g.items) ? g.items : [];

      const links = items.map((it) => {
        const active = currentPageId && it.pageId === currentPageId;
        return `
          <li>
            <a class="sitehdr-link${active ? " is-active" : ""}"
               href="${escapeHtml(it.href || "#")}"
               ${active ? 'aria-current="page"' : ""}>
              ${escapeHtml(it.label || "")}
            </a>
          </li>
        `;
      }).join("");

      return `
        <section class="sitehdr-section" aria-label="${title}">
          <h2 class="sitehdr-section__title">${title}</h2>
          <ul class="sitehdr-section__list">
            ${links}
          </ul>
        </section>
      `;
    }).join("");

    return `<nav class="sitehdr-sections" aria-label="Tool sections">${sections}</nav>`;
  }

  function renderHeader() {
    const mount = document.getElementById("siteHeader");
    if (!mount) return;

    const pageId = getPageId();
    const toolLogo = pickToolLogo(pageId);

    const mainLogo = HEADER_CONFIG.brand?.mainLogo || { href: "/", src: "", alt: "" };
    const title = HEADER_CONFIG.brand?.titleByPageId?.[pageId]?.title || toolLogo.alt || "Semantic Tools";

    mount.innerHTML = `
      <div class="sitehdr">
        <div class="sitehdr-bar">
          <a class="sitehdr-brand" href="${escapeHtml(mainLogo.href)}">
            <img class="sitehdr-brand__main"
                 src="${escapeHtml(mainLogo.src)}"
                 alt="${escapeHtml(mainLogo.alt)}" />
          </a>

          <div class="sitehdr-tool">
            <img class="sitehdr-tool__img"
                 src="${escapeHtml(toolLogo.src)}"
                 alt="${escapeHtml(toolLogo.alt)}" />
                 <h1 class="sitehdr-tool__title" style="margin-left: 2rem;">${escapeHtml(title)}</h1>
          </div>

          ${buildSectionsHtml(pageId)}

          <div id="light-dark-toggle" style="margin-left: auto;">
            <button
              type="button"
              class="theme-toggle"
              id="themeToggle"
              aria-label="Toggle theme"
              aria-pressed="false"
              title="Toggle theme"
            >
            <span class="theme-toggle__track" aria-hidden="true">
              <span class="theme-toggle__icon theme-toggle__icon--sun">☀️</span>
              <span class="theme-toggle__icon theme-toggle__icon--moon">🌙</span>
              <span class="theme-toggle__thumb"></span>
            </span>
            <span class="theme-toggle__sr">Toggle theme</span>
          </button>
          </div>
        </div>
      </div>
    `;
  }

  // script loaded at end of body => DOM is ready
  renderHeader();
  
})();

// Theme toggle: sets <html data-theme="light|dark"> and persists choice.
  (() => {
    const STORAGE_KEY = 'ont-theme'; // 'light' | 'dark'
    const root = document.documentElement;
    const btn = document.getElementById('themeToggle');

    if (!btn) return;

    const getSystemTheme = () => {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    };

    const getSavedTheme = () => {
      const v = localStorage.getItem(STORAGE_KEY);
      return (v === 'light' || v === 'dark') ? v : null;
    };

    const applyTheme = (theme) => {
      root.setAttribute('data-theme', theme);
      // aria-pressed: true when "dark" (you can invert if you prefer)
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    };

    const initTheme = () => {
      const saved = getSavedTheme();
      const theme = saved || getSystemTheme();
      applyTheme(theme);
    };

    const toggleTheme = () => {
      const current = root.getAttribute('data-theme') || getSystemTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
    };

    // Initialize once on load
    initTheme();

    // Button click toggles
    btn.addEventListener('click', toggleTheme);

    // Optional: If no saved preference, follow system changes live
    const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (mql) {
      mql.addEventListener('change', () => {
        if (!getSavedTheme()) applyTheme(getSystemTheme());
      });
    }
  })();