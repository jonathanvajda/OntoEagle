import { inferElementType } from './rdf_extract.js'; 

// ============================================================
// Storage + JSON-LD structure
// - Bundles are skos:Collection nodes with skos:member [{@id: ...}]
// - Items are nodes keyed by @id with rdfs:label / skos:definition etc.
// - Bundle IDs should be opaque (urn:uuid:...) and hidden from users
// ============================================================

const LS_KEY = "onto.bundles.jsonld";

const CONTEXT = {
  rdf:  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  owl:  "http://www.w3.org/2002/07/owl#"
};

// Example item (matches your intent: the @id is the IRI)
const EX_ITEM_IRI = "http://purl.obolibrary.org/obo/ICO_0000120";
const EX_ITEM_NODE = {
  "@id": EX_ITEM_IRI,
  "@type": ["owl:Class"],
  "rdfs:label": "Stasis of Law",
  "skos:definition": "A Stasis of Regulation wherein the regulation is a legal directive.",
  "rdfs:isDefinedBy": { "@id": "The Informed Consent Ontology (ICO)" }
};

// ---------- core helpers ----------
function emptyDoc() {
  return { "@context": CONTEXT, "@graph": [] };
}

function safeParseJson(text, fallback) {
  try { return JSON.parse(text); } catch { return fallback; }
}

function loadDoc() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return emptyDoc();
  const doc = safeParseJson(raw, emptyDoc());
  if (!doc || typeof doc !== "object") return emptyDoc();
  if (!Array.isArray(doc["@graph"])) doc["@graph"] = [];
  if (!doc["@context"]) doc["@context"] = CONTEXT;
  return doc;
}

function saveDoc(doc) {
  localStorage.setItem(LS_KEY, JSON.stringify(doc, null, 2));
}

function graph(doc) { return doc["@graph"]; }

function nodeById(doc) {
  const map = new Map();
  for (const n of graph(doc)) {
    if (n && typeof n === "object" && typeof n["@id"] === "string") map.set(n["@id"], n);
  }
  return map;
}

function isSkosCollection(n) {
  if (!n) return false;
  const t = n["@type"];
  if (t === "skos:Collection") return true;
  if (Array.isArray(t) && t.includes("skos:Collection")) return true;
  return false;
}

function listBundles(doc) {
  return graph(doc).filter(isSkosCollection).map(n => n["@id"]);
}

function ensureArray(v) { return Array.isArray(v) ? v : []; }

function getMembers(doc, bundleId) {
  const idx = nodeById(doc);
  const b = idx.get(bundleId);
  if (!b) return [];
  const raw = ensureArray(b["skos:member"]);
  return raw
    .map(m => (m && typeof m === "object" && typeof m["@id"] === "string") ? m["@id"] : null)
    .filter(Boolean);
}

function setMembers(doc, bundleId, memberIds) {
  const idx = nodeById(doc);
  const b = idx.get(bundleId);
  if (!b) return;
  const uniq = Array.from(new Set(memberIds));
  b["skos:member"] = uniq.map(id => ({ "@id": id }));
}

function upsertNode(doc, node) {
  const g = graph(doc);
  const i = g.findIndex(n => n && n["@id"] === node["@id"]);
  if (i >= 0) g[i] = { ...g[i], ...node };
  else g.push(node);
}

function deleteNode(doc, id) {
  doc["@graph"] = graph(doc).filter(n => !(n && n["@id"] === id));
}

function mintBundleIri() {
  if (globalThis.crypto?.randomUUID) return `urn:uuid:${crypto.randomUUID()}`;
  return `urn:uuid:${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createBundle(doc) {
  const id = mintBundleIri();
  upsertNode(doc, { "@id": id, "@type": "skos:Collection", "skos:member": [] });
  return id;
}

function addMember(doc, bundleId, itemId) {
  const members = getMembers(doc, bundleId);
  if (!members.includes(itemId)) {
    members.push(itemId);
    setMembers(doc, bundleId, members);
  }
}

function removeMember(doc, bundleId, itemId) {
  setMembers(doc, bundleId, getMembers(doc, bundleId).filter(x => x !== itemId));
}

function copyMember(doc, fromBundleId, toBundleId, itemId) {
  // copy = ensure in target; leave in source
  addMember(doc, toBundleId, itemId);
}

function moveMember(doc, fromBundleId, toBundleId, itemId) {
  // move = copy + remove
  addMember(doc, toBundleId, itemId);
  removeMember(doc, fromBundleId, itemId);
}

function mergeBundles(doc, bundleIds) {
  const newId = createBundle(doc);
  const all = [];
  for (const bid of bundleIds) all.push(...getMembers(doc, bid));
  setMembers(doc, newId, all);

  // delete old bundle nodes (items remain)
  for (const bid of bundleIds) deleteNode(doc, bid);
  return newId;
}

function splitBundle(doc, bundleId, memberIdsToMove) {
  // Creates a new bundle and MOVES selected members into it.
  const newId = createBundle(doc);
  const fromMembers = getMembers(doc, bundleId);
  const moveSet = new Set(memberIdsToMove);

  setMembers(doc, bundleId, fromMembers.filter(id => !moveSet.has(id)));
  setMembers(doc, newId, memberIdsToMove);

  return newId;
}

// ---------- label extraction for export ----------
function pickLabelValue(v) {
  // Accept common JSON-LD forms:
  // - "Label"
  // - [{ "@value": "Label", "@language": "en" }, ...]
  // - { "en": ["Label"] } (language map)
  if (typeof v === "string") return v;

  if (Array.isArray(v)) {
    for (const x of v) {
      if (typeof x === "string") return x;
      if (x && typeof x === "object" && typeof x["@value"] === "string") return x["@value"];
    }
  }

  if (v && typeof v === "object") {
    if (typeof v["@value"] === "string") return v["@value"];
    if (v.en && Array.isArray(v.en) && typeof v.en[0] === "string") return v.en[0];
    const keys = Object.keys(v);
    if (keys.length > 0 && Array.isArray(v[keys[0]]) && typeof v[keys[0]][0] === "string") return v[keys[0]][0];
  }

  return "";
}

function getItemLabel(doc, itemId) {
  const idx = nodeById(doc);
  const n = idx.get(itemId);
  if (!n) return "";
  const rdfsLabel = pickLabelValue(n["rdfs:label"]);
  if (rdfsLabel) return rdfsLabel;
  const skosPref = pickLabelValue(n["skos:prefLabel"]);
  if (skosPref) return skosPref;
  return "";
}

function toRobotSeedText(doc, bundleId, includeLabels) {
  const members = getMembers(doc, bundleId);
  const lines = [];

  for (const iri of members) {
    const label = includeLabels ? getItemLabel(doc, iri).trim() : "";
    if (includeLabels && label) lines.push(`${iri} # ${label}`);
    else lines.push(`${iri}`);
  }

  return lines.join("\n") + (lines.length ? "\n" : "");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- UI rendering ----------
const app = document.getElementById("app");
const txtRaw = document.getElementById("txtRaw");

const btnCreateBundle = document.getElementById("btnCreateBundle");
const btnSeedExample = document.getElementById("btnSeedExample");
const btnExportSeed = document.getElementById("btnExportSeed");
const btnClear = document.getElementById("btnClear");
const btnMerge = document.getElementById("btnMerge");

const selExportBundle = document.getElementById("selExportBundle");
const chkIncludeLabels = document.getElementById("chkIncludeLabels");
const selMergeA = document.getElementById("selMergeA");
const selMergeB = document.getElementById("selMergeB");

function shortId(iri) {
  // purely UI: show last chunk of urn:uuid
  const m = iri.match(/urn:uuid:([0-9a-f-]{8,})/i);
  return m ? m[1].slice(0, 8) : iri.slice(-10);
}

function fillBundleSelect(select, bundleIds) {
  select.innerHTML = "";
  if (bundleIds.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(no bundles)";
    select.appendChild(opt);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  for (let i = 0; i < bundleIds.length; i++) {
    const id = bundleIds[i];
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `Bundle ${i + 1} (${shortId(id)})`;
    select.appendChild(opt);
  }
}

// --------- new helpers (UI extraction) ---------

const RDFS_IS_DEFINED_BY_KEYS = [
  "https://www.commoncoreontologies.org/ont00001760",
  "cco:ont00001760",
  "http://www.ontologyrepository.com/CommonCoreOntologies/is_curated_in_ontology",
  "cco:is_curated_in_ontology",
  "rdfs:isDefinedBy",
  "http://www.w3.org/2000/01/rdf-schema#isDefinedBy"
];

const RDF_TYPE_KEYS = [
  "@type",
  "rdf:type",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
];

/**
 * Safely get first matching property from node.
 * @param {any} node
 * @param {string[]} keys
 * @returns {any}
 */
function getAnyKey(node, keys) {
  if (!node || typeof node !== "object") return undefined;
  for (const k of keys) {
    if (k in node) return node[k];
  }
  return undefined;
}

/**
 * Convert JSON-LD values to a string[] including @id objects.
 * - "str"
 * - {"@id":"..."}
 * - {"@value":"..."}
 * - arrays of any of the above
 * @param {any} v
 * @returns {string[]}
 */
function valueToStringsLoose(v) {
  if (v == null) return [];
  if (typeof v === "string") return [v];

  if (Array.isArray(v)) {
    return v.flatMap(valueToStringsLoose).filter(Boolean);
  }

  if (typeof v === "object") {
    if (typeof v["@id"] === "string") return [v["@id"]];
    if (typeof v["@value"] === "string") return [v["@value"]];
  }

  return [];
}

/**
 * Infer the single pill type label you want to show.
 * - Shows OWL structural types: Class, ObjectProperty, NamedIndividual, etc.
 * - If types exist but it's not one of those, treat as "NamedIndividual" (your heuristic)
 * @param {any} node
 * @returns {string} pill label or ""
 */
function getPrimaryTypePill(node) {
  const typeValue = getAnyKey(node, RDF_TYPE_KEYS);

  // Use your shared extractor
  const inferred = inferElementType(typeValue);

  if (inferred && inferred !== "Other") return inferred;

  // Heuristic: if it has rdf:type(s) but none are OWL structural types,
  // treat it like a NamedIndividual and ignore those other rdf:type values in display.
  const rawTypes = valueToStringsLoose(typeValue);
  if (rawTypes.length > 0) return "NamedIndividual";

  return "";
}

/**
 * Extract a single isDefinedBy IRI (first if multiple).
 * @param {any} node
 * @returns {string}
 */
function getDefinedByIri(node) {
  const v = getAnyKey(node, RDFS_IS_DEFINED_BY_KEYS);
  const ids = valueToStringsLoose(v);
  return ids[0] || "";
}

/**
 * Create a pill DOM element.
 * @param {string} text
 * @param {string} extraClass
 * @returns {HTMLSpanElement}
 */
function makePill(text, extraClass = "") {
  const s = document.createElement("span");
  s.className = `pill ${extraClass}`.trim();
  s.textContent = text;
  return s;
}

/**
 * Render the type pill row DOM (or null if none).
 * @param {any} node
 * @returns {HTMLSpanElement|null}
 */
function renderTypePills(node) {
  const t = getPrimaryTypePill(node);
  if (!t) return null;

  const wrap = document.createElement("span");
  wrap.className = "pills";
  wrap.appendChild(makePill(t, "pill--type"));
  return wrap;
}

/**
 * Render isDefinedBy row DOM (or null if none).
 * @param {any} node
 * @returns {HTMLDivElement|null}
 */
function renderDefinedByRow(node) {
  const iri = getDefinedByIri(node);
  if (!iri) return null;

  const row = document.createElement("div");
  row.className = "itemDefinedByRow";

  const lab = document.createElement("div");
  lab.className = "itemDefinedByLabel";
  lab.textContent = "Curated in ontology:";

  const val = document.createElement("div");
  val.className = "itemDefinedByValue";
  val.textContent = iri;

  row.appendChild(lab);
  row.appendChild(val);
  return row;
}

function renderDefinitionRow(defnText) {
  const defn = (defnText || "").trim();
  if (!defn) return null;

  const row = document.createElement("div");
  row.className = "itemDefinedByRow";

  const lab = document.createElement("div");
  lab.className = "itemDefinedByLabel";
  lab.textContent = "Def.";

  const val = document.createElement("div");
  val.className = "itemDefinedByValue";
  val.textContent = defn;

  row.appendChild(lab);
  row.appendChild(val);
  return row;
}

/**
 * Render an IRI row like: IRI: <link>
 * @param {string} iri
 */
function renderIriRow(iri) {
  const row = document.createElement("div");
  row.className = "itemDefinedByRow";

  const lab = document.createElement("div");
  lab.className = "itemDefinedByLabel";
  lab.textContent = "IRI:";

  const val = document.createElement("div");
  val.className = "itemDefinedByValue";

  const a = document.createElement("a");
  a.href = iri;
  a.textContent = iri;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.overflowWrap = "anywhere";
  a.style.wordBreak = "break-word";

  val.appendChild(a);

  row.appendChild(lab);
  row.appendChild(val);
  return row;
}

function render() {
  const doc = loadDoc();
  const bundles = listBundles(doc);
  const idx = nodeById(doc);

  fillBundleSelect(selExportBundle, bundles);
  fillBundleSelect(selMergeA, bundles);
  fillBundleSelect(selMergeB, bundles);

  txtRaw.value = JSON.stringify(doc, null, 2);

  app.innerHTML = "";
  if (bundles.length === 0) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<div class="bundleTitle">No bundles yet</div><div>Create a bundle to get started.</div>`;
    app.appendChild(div);
    return;
  }

  bundles.forEach((bundleId, bundleIndex) => {
    const members = getMembers(doc, bundleId);

    const card = document.createElement("div");
    card.className = "card";

    const bundleManager = document.createElement("div");
    bundleManager.className = "bundleManager";
    bundleManager.innerHTML = `
      <div>
        <div class="bundleTitle">Bundle ${bundleIndex + 1}</div>
        <div>${members.length} item(s)</div>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "row";

    const btnDump = document.createElement("button");
    btnDump.type = "button";
    btnDump.textContent = "Dump bundle";
    btnDump.addEventListener("click", () => {
      const d = loadDoc();
      deleteNode(d, bundleId);
      saveDoc(d);
      render();
    });

    const btnSplitHalf = document.createElement("button");
    btnSplitHalf.type = "button";
    btnSplitHalf.textContent = "Split ~half";
    btnSplitHalf.addEventListener("click", () => {
      const d = loadDoc();
      const m = getMembers(d, bundleId);
      const half = m.slice(0, Math.floor(m.length / 2));
      if (half.length === 0) return;
      splitBundle(d, bundleId, half);
      saveDoc(d);
      render();
    });

    actions.appendChild(btnSplitHalf);
    actions.appendChild(btnDump);
    bundleManager.appendChild(actions);

    card.appendChild(bundleManager);

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "items";

    members.forEach((itemId) => {
      const itemNode = idx.get(itemId) || { "@id": itemId };
      const label = getItemLabel(doc, itemId) || "(no label)";
      const defn = pickLabelValue(itemNode["skos:definition"]) || "";

      const itemDiv = document.createElement("div");
      itemDiv.className = "item";

      const top = document.createElement("div");
      top.className = "itemTop";
      top.innerHTML = `
        <div class="itemHeading">
          <div class="itemLabel">${escapeHtml(label)}</div>
        </div>
      `;

    const heading = top.querySelector(".itemHeading");
    const pills = renderTypePills(itemNode);
    if (pills) heading.appendChild(pills);

          const iriDiv = document.createElement("div");
          iriDiv.className = "itemIri";
          iriDiv.innerHTML = `IRI: `
          iriDiv.innerHTML += `<span class="itemDefinedByValue"><a href="${escapeHtml(itemId)}" target="_blank">${escapeHtml((itemId))}</a></span>`;

          const row = document.createElement("div");
          row.className = "row";
          row.style.justifyContent = "flex-end";


          const btnRemoveItem = document.createElement("button");
          btnRemoveItem.type = "button";
          btnRemoveItem.textContent = "Remove";
          btnRemoveItem.dataset.act = "remove";
          row.appendChild(btnRemoveItem);
          btnRemoveItem.addEventListener("click", () => {
            const d = loadDoc();
            removeMember(d, bundleId, itemId);
            saveDoc(d);
            render();
          });


          const selMove = document.createElement("select");
          const bundleIds = listBundles(doc).filter(b => b !== bundleId);
          selMove.innerHTML = `<option value="">Move to…</option>` + bundleIds.map((b, i) =>
            `<option value="${b}">Bundle ${i + 1} (${shortId(b)})</option>`
          ).join("");

          const btnMove = document.createElement("button");
          btnMove.type = "button";
          btnMove.textContent = "Move";
          btnMove.addEventListener("click", () => {
            const to = selMove.value;
            if (!to) return;
            const d = loadDoc();
            moveMember(d, bundleId, to, itemId);
            saveDoc(d);
            render();
          });

          const btnCopy = document.createElement("button");
          btnCopy.type = "button";
          btnCopy.textContent = "Copy";
          btnCopy.addEventListener("click", () => {
            const to = selMove.value;
            if (!to) return;
            const d = loadDoc();
            copyMember(d, bundleId, to, itemId);
            saveDoc(d);
            render();
          });

          row.appendChild(selMove);
          row.appendChild(btnMove);
          row.appendChild(btnCopy);

          const details = document.createElement("details");
          const sum = document.createElement("summary");
          sum.textContent = "Expand item data";
          details.appendChild(sum);

          const pre = document.createElement("pre");
          pre.style.whiteSpace = "pre-wrap";
          pre.textContent = JSON.stringify(itemNode, null, 2);
          details.appendChild(pre);

          const iriRow = renderIriRow(itemId);
          const defRow = renderDefinitionRow(defn);
          const curatedRow = renderDefinedByRow(itemNode);

          itemDiv.appendChild(top);          // label + pill
          itemDiv.appendChild(iriRow);       // IRI
          if (defRow) itemDiv.appendChild(defRow);         // Def.
          if (curatedRow) itemDiv.appendChild(curatedRow); // Curated in ontology
          itemDiv.appendChild(row);          // move/copy controls (keep wherever you prefer)
          itemDiv.appendChild(details);      // expand
          itemsWrap.appendChild(itemDiv);
        });

        card.appendChild(itemsWrap);
        app.appendChild(card);
      });
    }

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- button wiring ----------
btnCreateBundle.addEventListener("click", () => {
  const doc = loadDoc();
  createBundle(doc);
  saveDoc(doc);
  render();
});

btnSeedExample.addEventListener("click", () => {
  const doc = loadDoc();
  if (listBundles(doc).length === 0) createBundle(doc);
  const b0 = listBundles(doc)[0];
  upsertNode(doc, EX_ITEM_NODE);
  addMember(doc, b0, EX_ITEM_IRI);
  saveDoc(doc);
  render();
});

btnExportSeed.addEventListener("click", () => {
  const doc = loadDoc();
  const bundleId = selExportBundle.value;
  if (!bundleId) return;

  const includeLabels = chkIncludeLabels.checked;
  const text = toRobotSeedText(doc, bundleId, includeLabels);

  const filename = `bundle-${shortId(bundleId)}.txt`;
  downloadText(filename, text);
});

btnMerge.addEventListener("click", () => {
  const a = selMergeA.value;
  const b = selMergeB.value;
  if (!a || !b || a === b) return;
  const doc = loadDoc();
  mergeBundles(doc, [a, b]);
  saveDoc(doc);
  render();
});

btnClear.addEventListener("click", () => {
  localStorage.removeItem(LS_KEY);
  render();
});

// Initial render
render();