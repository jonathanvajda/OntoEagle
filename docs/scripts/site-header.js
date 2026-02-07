// ./scripts/site-header.js
(() => {
  "use strict";

  // --- Your config (as you provided) ---
  const HEADER_CONFIG = {
    brand: {
      mainLogo: { href: "/", src: "./images/main-logo.png", alt: "Your org/site" },
      toolLogoByPageId: {
        "ontoeagle": { src: "./images/Eagle-VI_1753264913.svg", alt: "OntoEagle" },
        "iri-registry": { src: "./images/iri-registry.svg", alt: "IRI Registry" },
        // ...
      },
      defaultToolLogo: { src: "./images/default.svg", alt: "Tool" }
    },

    groups: [
      {
        title: "Ontology Exploration",
        items: [
          { label: "OntoEagle", href: "/search.html", pageId: "ontoeagle" },
          { label: "IRI Registry", href: "/iri-registry.html", pageId: "iri-registry" },
          { label: "Ontology Tabulator", href: "/ontology-tabulator.html", pageId: "ontology-tabulator" },
        ],
      },
      {
        title: "Requirements Gathering",
        items: [
          { label: "Competency Question Ferret", href: "/cq-ferret.html", pageId: "cq-ferret" },
          { label: "Business Process Weaver", href: "/bp-weaver.html", pageId: "bp-weaver" },
        ],
      },
      // ...
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

    // IMPORTANT: menu is INSIDE sitehdr-bar as the 3rd sibling => renders to the right
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
          </div>

          ${buildSectionsHtml(pageId)}
        </div>
      </div>
    `;
  }

  // script loaded at end of body => DOM is ready
  renderHeader();
})();
