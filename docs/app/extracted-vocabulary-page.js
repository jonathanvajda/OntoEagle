/* extracted-vocabulary-page.js
 * DOM-only: builds editable table, filters, sorts, CSV export.
 * Depends on: window.VOCAB_EXTRACT (from vocab-extract-core.js)
 */
(() => {
  "use strict";

  const OWL_TYPES = [
    { label: "", iri: "" },
    { label: "owl:Class", iri: "http://www.w3.org/2002/07/owl#Class" },
    { label: "owl:NamedIndividual", iri: "http://www.w3.org/2002/07/owl#NamedIndividual" },
    { label: "owl:ObjectProperty", iri: "http://www.w3.org/2002/07/owl#ObjectProperty" },
    { label: "owl:DatatypeProperty", iri: "http://www.w3.org/2002/07/owl#DatatypeProperty" },
    { label: "owl:AnnotationProperty", iri: "http://www.w3.org/2002/07/owl#AnnotationProperty" },
  ];

  let state = {
    rows: [],
    nodesById: new Map(),
    dbName: "CQDatabase",
    storeName: "CQStore",
    sort: { col: "label", dir: "asc" },
    filters: { iri: "", label: "", elementType: "", definition: "", isA: "", isDefinedBy: "" },
  };

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const debouncedSave = debounce(async (row) => {
    const status = document.getElementById("status");
    try {
      status.textContent = "Saving…";
      await window.VOCAB_EXTRACT.saveRow(row, {
        dbName: state.dbName,
        storeName: state.storeName,
        nodesById: state.nodesById,
      });
      status.textContent = `Saved (${new Date().toLocaleTimeString()})`;
    } catch (e) {
      console.error(e);
      status.textContent = `Save failed: ${e.message || e}`;
    }
  }, 600);

  function applyFilters(rows) {
    const f = state.filters;
    const contains = (hay, needle) => String(hay ?? "").toLowerCase().includes(String(needle ?? "").toLowerCase());

    return rows.filter((r) =>
      contains(r.iri, f.iri) &&
      contains(r.label, f.label) &&
      contains(r.elementType, f.elementType) &&
      contains(r.definition, f.definition) &&
      contains(r.isA, f.isA) &&
      contains(r.isDefinedBy, f.isDefinedBy)
    );
  }

  function applySort(rows) {
    const { col, dir } = state.sort;
    const sign = dir === "asc" ? 1 : -1;

    return rows.slice().sort((a, b) => {
      const av = String(a[col] ?? "");
      const bv = String(b[col] ?? "");
      return av.localeCompare(bv) * sign;
    });
  }

  function makeInput(value, onChange, { placeholder = "" } = {}) {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.value = value ?? "";
    inp.placeholder = placeholder;
    inp.addEventListener("input", () => onChange(inp.value));
    return inp;
  }

  function makeTextarea(value, onChange) {
    const ta = document.createElement("textarea");
    ta.rows = 2;
    ta.value = value ?? "";
    ta.addEventListener("input", () => onChange(ta.value));
    return ta;
  }

  function makeTypeSelect(value, onChange) {
    const sel = document.createElement("select");
    OWL_TYPES.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.iri;
      opt.textContent = t.label;
      if (t.iri === (value ?? "")) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => onChange(sel.value));
    return sel;
  }

  function render() {
    const table = document.getElementById("vocabTable");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    const cols = [
      { key: "iri", label: "iri" },
      { key: "label", label: "label" },
      { key: "elementType", label: "type" },
      { key: "definition", label: "definition" },
      { key: "isA", label: "is a" },
      { key: "isDefinedBy", label: "is defined by" },
    ];

    // Header row (sortable)
    const trHead = document.createElement("tr");
    cols.forEach((c) => {
      const th = document.createElement("th");
      th.style.cursor = "pointer";
      th.textContent = c.label + (state.sort.col === c.key ? (state.sort.dir === "asc" ? " ▲" : " ▼") : "");
      th.addEventListener("click", () => {
        if (state.sort.col === c.key) {
          state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
        } else {
          state.sort.col = c.key;
          state.sort.dir = "asc";
        }
        render();
      });
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    // Filter row
    const trFilters = document.createElement("tr");
    cols.forEach((c) => {
      const th = document.createElement("th");
      const key = c.key;
      const inp = makeInput(state.filters[key] ?? "", (v) => {
        state.filters[key] = v;
        render();
      }, { placeholder: "filter…" });
      inp.style.width = "100%";
      th.appendChild(inp);
      trFilters.appendChild(th);
    });
    thead.appendChild(trFilters);

    // Body rows
    const filtered = applySort(applyFilters(state.rows));
    filtered.forEach((row) => {
      const tr = document.createElement("tr");

      // iri (read-only)
      {
        const td = document.createElement("td");
        const inp = makeInput(row.iri, () => {}, {});
        inp.readOnly = true;
        inp.style.width = "100%";
        td.appendChild(inp);
        tr.appendChild(td);
      }

      // label (editable)
      {
        const td = document.createElement("td");
        const inp = makeInput(row.label, (v) => {
          row.label = v;
          debouncedSave(row);
        });
        inp.style.width = "100%";
        td.appendChild(inp);
        tr.appendChild(td);
      }

      // type (dropdown)
      {
        const td = document.createElement("td");
        const sel = makeTypeSelect(row.elementType, (v) => {
          row.elementType = v;
          debouncedSave(row);
        });
        sel.style.width = "100%";
        td.appendChild(sel);
        tr.appendChild(td);
      }

      // definition (textarea)
      {
        const td = document.createElement("td");
        const ta = makeTextarea(row.definition, (v) => {
          row.definition = v;
          debouncedSave(row);
        });
        ta.style.width = "100%";
        td.appendChild(ta);
        tr.appendChild(td);
      }

      // is a (text)
      {
        const td = document.createElement("td");
        const inp = makeInput(row.isA, (v) => {
          row.isA = v;
          debouncedSave(row);
        });
        inp.style.width = "100%";
        td.appendChild(inp);
        tr.appendChild(td);
      }

      // is defined by (IRI)
      {
        const td = document.createElement("td");
        const inp = makeInput(row.isDefinedBy, (v) => {
          row.isDefinedBy = v;
          debouncedSave(row);
        }, { placeholder: "https://example.org/ontology/…" });
        inp.style.width = "100%";
        td.appendChild(inp);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });

    document.getElementById("count").textContent = `${filtered.length} terms`;
  }

  function wireButtons() {
    document.getElementById("btnExportCsv").addEventListener("click", () => {
      const filtered = applySort(applyFilters(state.rows));
      const csv = window.VOCAB_EXTRACT.exportRowsToCsv(filtered);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Extracted_Vocabulary_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    document.getElementById("btnRebuild").addEventListener("click", async () => {
      const status = document.getElementById("status");
      try {
        status.textContent = "Rebuilding vocabulary…";
        const tagger = new POSTagger(window.POSTAGGER_LEXICON);
        const res = await window.VOCAB_EXTRACT.rebuildVocabularyInDb({
          dbName: state.dbName,
          storeName: state.storeName,
          tagger,
        });
        status.textContent = `Rebuilt (${res.vocabCount} terms). Reloading…`;

        const loaded = await window.VOCAB_EXTRACT.loadVocabularyRows({
          dbName: state.dbName,
          storeName: state.storeName,
          autoRebuild: false,
        });
        state.rows = loaded.rows;
        state.nodesById = loaded.nodesById;
        render();
        status.textContent = `Ready (${new Date().toLocaleTimeString()})`;
      } catch (e) {
        console.error(e);
        status.textContent = `Rebuild failed: ${e.message || e}`;
      }
    });
  }

  async function init() {
    const status = document.getElementById("status");
    status.textContent = "Loading…";

    try {
      const loaded = await window.VOCAB_EXTRACT.loadVocabularyRows({
        dbName: state.dbName,
        storeName: state.storeName,
        // autoRebuild=true to guarantee “and/of” name phrases are handled
        autoRebuild: true,
      });

      state.dbName = loaded.dbName;
      state.storeName = loaded.storeName;
      state.rows = loaded.rows;
      state.nodesById = loaded.nodesById;

      wireButtons();
      render();
      status.textContent = `Ready (${new Date().toLocaleTimeString()})`;
    } catch (e) {
      console.error(e);
      status.textContent = `Load failed: ${e.message || e}`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();