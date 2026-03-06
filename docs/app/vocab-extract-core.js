/* vocab-extract-core.js
 * Append-only: no edits to existing files.
 * Purpose:
 *  - read CQ graph from IndexedDB (CQDatabase/CQStore)
 *  - extract vocabulary terms/phrases using POSTagger + Lexicon
 *  - ignore filler words; keep conjunctions only in “name-like” phrases
 *  - deduplicate
 *  - persist vocabulary nodes as JSON-LD in the same store
 *
 * Exposes: window.VOCAB_EXTRACT
 */
(() => {
  "use strict";

  // ---------------------------
  // Configuration (overrideable)
  // ---------------------------
  const CFG = {
    dbName: "CQDatabase",
    storeName: "CQStore",
    dbVersion: 1,

    // Match your existing GDC defaults (keeps compatibility with what you're already generating).
    // (These are the IDs we’ll use for vocabulary nodes.)
    GDC_BASE_IRI: "http://purl.obolibrary.org/obo/BFO_0000031",
    GDC_TYPE_IRI: "http://purl.obolibrary.org/obo/BFO_0000031",
    ABOUT_LINK_IRI: "http://purl.obolibrary.org/obo/BFO_0000176", // used as “about / derived from” link

    // Skip persons (same IRI as your CQ tool uses for Person nodes)
    PERSON_IRI: "https://www.commoncoreontologies.org/ont00001262",

    // Read text from these properties across the graph
    TEXT_PROPERTIES: [
      "https://www.commoncoreontologies.org/ont00001761", // generic text field in your graph
      "http://www.w3.org/2000/01/rdf-schema#label",
      "http://purl.org/dc/terms/description",
      "http://www.w3.org/2000/01/rdf-schema#comment"
    ],

    // RDF-ish props for the editable table
    RDFS_LABEL: "http://www.w3.org/2000/01/rdf-schema#label",
    RDFS_IS_DEFINED_BY: "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",
    SKOS_DEFINITION: "http://www.w3.org/2004/02/skos/core#definition",
    XSD_STRING: "http://www.w3.org/2001/XMLSchema#string",

    // Custom props for “element type” + “is a” columns (kept separate from @type)
    VOCAB_ELEMENT_TYPE: "https://jonathanvajda.com/ontology/vocabElementType",
    VOCAB_IS_A: "https://jonathanvajda.com/ontology/vocabIsA",

    // Default for rdfs:isDefinedBy
    defaultIsDefinedByFromDb(dbName) {
      return `https://example.org/ontology/${encodeURIComponent(dbName)}`;
    },

    // “Name-like” connectors we can keep inside a phrase
    allowedConnectors: new Set(["and", "or", "&", "of", "for"]),
  };

  // ---------------------------
  // IndexedDB helpers
  // ---------------------------
  function openDb({ dbName = CFG.dbName, dbVersion = CFG.dbVersion, storeName = CFG.storeName } = {}) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, dbVersion);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(e.target.error || new Error("Transaction aborted"));
    });
  }

  async function readAllNodes({ dbName = CFG.dbName, storeName = CFG.storeName } = {}) {
    const db = await openDb({ dbName, storeName });
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);

    const all = await new Promise((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = (e) => reject(e.target.error);
    });

    // Normalize to JSON-LD-ish objects (ensure @id)
    const nodes = all.map((rec) => {
      const id = rec["@id"] || rec.id;
      return { ...rec, "@id": id };
    });

    await txDone(tx);
    db.close();
    return nodes;
  }

  async function upsertNodes(nodes, { dbName = CFG.dbName, storeName = CFG.storeName } = {}) {
    const db = await openDb({ dbName, storeName });
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    nodes.forEach((n) => {
      const id = n["@id"] || n.id;
      store.put({ ...n, "@id": id, id });
    });

    await txDone(tx);
    db.close();
  }

  async function deleteKeys(keys, { dbName = CFG.dbName, storeName = CFG.storeName } = {}) {
    if (!keys.length) return;
    const db = await openDb({ dbName, storeName });
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    keys.forEach((k) => store.delete(k));
    await txDone(tx);
    db.close();
  }

  // ---------------------------
  // Small utilities
  // ---------------------------
  function isAnyUri(s) {
    if (!s || typeof s !== "string") return false;
    try {
      const u = new URL(s);
      return !!u.protocol && !!u.hostname;
    } catch {
      return false;
    }
  }

  function escapeCsv(val) {
    const s = val == null ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function isCapitalizedToken(tok) {
    if (!tok || typeof tok.word !== "string") return false;
    return /^[A-Z]/.test(tok.word);
  }

  function hasType(node, iri) {
    const t = node?.["@type"];
    if (Array.isArray(t)) return t.includes(iri);
    if (typeof t === "string") return t === iri;
    return false;
  }

  function getTextValues(node) {
    const out = [];
    for (const p of CFG.TEXT_PROPERTIES) {
      const arr = node?.[p];
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        const v = item?.["@value"];
        if (typeof v === "string" && v.trim()) out.push(v.trim());
      }
    }
    return out;
  }

  function looksLikeVocabularyNode(node) {
    const id = node?.["@id"] || "";
    // Strong match: our vocabulary node IDs
    if (typeof id === "string" && id.startsWith(CFG.GDC_BASE_IRI + "_")) return true;

    // Also treat nodes with ABOUT_LINK_IRI + rdfs:label as vocab-ish
    if (node?.[CFG.ABOUT_LINK_IRI] && node?.[CFG.RDFS_LABEL]) return true;

    // Or nodes typed as the GDC type IRI
    if (hasType(node, CFG.GDC_TYPE_IRI)) return true;

    return false;
  }

  // ---------------------------
  // Phrase extraction (improved chunking)
  // ---------------------------
  class VocabExtractorService {
    constructor(tagger, options = {}) {
      if (!tagger) throw new Error("VocabExtractorService requires a POSTagger instance.");
      this.tagger = tagger;
      this.lemmatizer = new Lemmatizer();
      this.cfg = { ...CFG, ...options };
    }

    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        hash = (hash << 5) - hash + c;
        hash |= 0;
      }
      return Math.abs(hash);
    }

    // Keep DT/articles out, keep conjunctions only when “name-like”
    extractPhrases(taggedWords) {
      const phrases = [];
      let current = [];

      const isDet = (t) => t?.tag === "DT";
      const isPunct = (t) => t && (t.tag === "." || t.tag === "," || t.tag === ":" || t.tag === "PRN" || t.word === ";" || t.word === "(" || t.word === ")");
      const isContent = (t) => {
        if (!t?.tag) return false;
        // Nouns + adjectives are “phrase material”
        if (t.tag.startsWith("NN")) return true;
        if (t.tag.startsWith("JJ")) return true;
        // Numbers can be part of names (e.g., “U-2”), but keep them conservative:
        if (t.tag === "CD") return true;
        return false;
      };
      const isConnector = (t) => {
        const w = (t?.word || "").toLowerCase();
        return this.cfg.allowedConnectors.has(w) && (t.tag === "CC" || t.tag === "IN");
      };

      const finalize = () => {
        if (!current.length) return;

        // Trim leading determiners just in case
        while (current.length && isDet(current[0])) current.shift();

        // Must include at least one noun
        const hasNoun = current.some((t) => t.tag && t.tag.startsWith("NN"));
        if (!hasNoun) {
          current = [];
          return;
        }

        // Drop trailing connectors
        while (current.length && isConnector(current[current.length - 1])) current.pop();

        const text = current.map((t) => t.word).join(" ").trim();
        if (!text) {
          current = [];
          return;
        }

        phrases.push({
          originalText: text,
          taggedWords: current.slice(),
        });

        current = [];
      };

      for (let i = 0; i < taggedWords.length; i++) {
        const tok = taggedWords[i];

        if (isPunct(tok)) {
          finalize();
          continue;
        }

        // Ignore standalone determiners unless we're already building a phrase
        if (isDet(tok) && current.length === 0) continue;

        if (isContent(tok)) {
          current.push(tok);
          continue;
        }

        if (isConnector(tok)) {
          // Only keep “and/or/&” inside a phrase if it looks like a proper name connector:
          //   NP (caps/NNP) + and + NP (caps/NNP)
          // And keep “of” similarly if adjacent tokens are “name-like”.
          const prev = current.length ? current[current.length - 1] : null;
          const next = i + 1 < taggedWords.length ? taggedWords[i + 1] : null;

          const prevNameLike = !!prev && (prev.tag?.startsWith("NNP") || isCapitalizedToken(prev));
          const nextNameLike = !!next && (next.tag?.startsWith("NNP") || isCapitalizedToken(next));

          const w = (tok.word || "").toLowerCase();
          const allowAndOr = (w === "and" || w === "or" || w === "&") ? (prevNameLike && nextNameLike) : true;
          const allowOfFor = (w === "of" || w === "for") ? (prevNameLike || nextNameLike) : true;

          if (current.length && next && isContent(next) && allowAndOr && allowOfFor) {
            current.push(tok);
            continue;
          }

          // Otherwise connector breaks phrase
          finalize();
          continue;
        }

        // Other tags: break phrase
        finalize();
      }

      finalize();
      return phrases;
    }

    processGraph(sourceGraph) {
      const chunkMap = new Map();

      for (const node of sourceGraph) {
        // Skip persons
        if (hasType(node, this.cfg.PERSON_IRI)) continue;

        const sourceNodeIri = node["@id"];
        if (!sourceNodeIri) continue;

        const texts = getTextValues(node);
        for (const text of texts) {
          const tagged = this.tagger.tagSentence(text);
          const phrases = this.extractPhrases(tagged);

          for (const ph of phrases) {
            const conceptText = ph.originalText.trim();
            if (!conceptText) continue;

            // Dedup key: lemmatize last word + lower
            const lemmatized = this.lemmatizer.lemmatize(conceptText);
            const key = lemmatized.toLowerCase();

            if (chunkMap.has(key)) {
              const existing = chunkMap.get(key);
              const about = existing[this.cfg.ABOUT_LINK_IRI] || [];
              if (!about.some((x) => x?.["@id"] === sourceNodeIri)) {
                about.push({ "@id": sourceNodeIri });
                existing[this.cfg.ABOUT_LINK_IRI] = about;
              }
            } else {
              const gdcId = this.hashCode(key);
              const newNode = {
                "@id": `${this.cfg.GDC_BASE_IRI}_${gdcId}`,
                "@type": [this.cfg.GDC_TYPE_IRI],
                [this.cfg.RDFS_LABEL]: [{ "@value": lemmatized }],
                [this.cfg.ABOUT_LINK_IRI]: [{ "@id": sourceNodeIri }],
              };
              chunkMap.set(key, newNode);
            }
          }
        }
      }

      return Array.from(chunkMap.values());
    }
  }

  // ---------------------------
  // Table row mapping + persistence
  // ---------------------------
  function nodeToRow(node, dbName) {
    const iri = node["@id"] || "";
    const label = node?.[CFG.RDFS_LABEL]?.[0]?.["@value"] ?? "";

    const elementType = node?.[CFG.VOCAB_ELEMENT_TYPE]?.[0]?.["@id"] ?? "";
    const definition = node?.[CFG.SKOS_DEFINITION]?.[0]?.["@value"] ?? "";
    const isA = node?.[CFG.VOCAB_IS_A]?.[0]?.["@value"] ?? "";
    const isDefinedBy = node?.[CFG.RDFS_IS_DEFINED_BY]?.[0]?.["@id"] ?? CFG.defaultIsDefinedByFromDb(dbName);

    return { iri, label, elementType, definition, isA, isDefinedBy };
  }

  function applyRowToNode(row, baseNode, dbName) {
    const node = { ...(baseNode || {}) };

    // IRI is the primary key; we do not change @id by default
    node["@id"] = node["@id"] || row.iri;

    // Keep existing @type and ensure it stays an array
    const types = Array.isArray(node["@type"]) ? node["@type"].slice() : (node["@type"] ? [node["@type"]] : []);
    if (!types.includes(CFG.GDC_TYPE_IRI)) types.push(CFG.GDC_TYPE_IRI);
    node["@type"] = types;

    // rdfs:label
    node[CFG.RDFS_LABEL] = [{ "@value": row.label || "" }];

    // element type (OWL-ish) stored separately
    if (row.elementType) node[CFG.VOCAB_ELEMENT_TYPE] = [{ "@id": row.elementType }];
    else delete node[CFG.VOCAB_ELEMENT_TYPE];

    // definition (skos:definition)
    if (row.definition) node[CFG.SKOS_DEFINITION] = [{ "@value": row.definition }];
    else delete node[CFG.SKOS_DEFINITION];

    // is a (string)
    if (row.isA) node[CFG.VOCAB_IS_A] = [{ "@value": row.isA, "@type": CFG.XSD_STRING }];
    else delete node[CFG.VOCAB_IS_A];

    // isDefinedBy (IRI)
    const defBy = row.isDefinedBy || CFG.defaultIsDefinedByFromDb(dbName);
    node[CFG.RDFS_IS_DEFINED_BY] = [{ "@id": defBy }];

    return node;
  }

  // ---------------------------
  // Public operations
  // ---------------------------
  async function rebuildVocabularyInDb({
    dbName = CFG.dbName,
    storeName = CFG.storeName,
    tagger = null,
  } = {}) {
    if (!tagger) throw new Error("rebuildVocabularyInDb requires a POSTagger instance.");

    const allNodes = await readAllNodes({ dbName, storeName });

    // Build vocab from NON-vocab nodes to avoid self-feeding.
    const nonVocab = allNodes.filter((n) => !looksLikeVocabularyNode(n));
    const extractor = new VocabExtractorService(tagger);
    const vocabNodes = extractor.processGraph(nonVocab);

    // Delete old vocab keys
    const keysToDelete = allNodes
      .filter((n) => looksLikeVocabularyNode(n))
      .map((n) => (n["@id"] || n.id))
      .filter(Boolean);

    await deleteKeys(keysToDelete, { dbName, storeName });
    await upsertNodes(vocabNodes, { dbName, storeName });

    return { vocabCount: vocabNodes.length };
  }

  async function loadVocabularyRows({
    dbName = CFG.dbName,
    storeName = CFG.storeName,
    autoRebuild = true,
  } = {}) {
    const allNodes = await readAllNodes({ dbName, storeName });

    let vocabNodes = allNodes.filter((n) => looksLikeVocabularyNode(n));

    // Auto-rebuild on load so conjunction-in-names works consistently
    if (autoRebuild) {
      const tagger = new POSTagger(window.POSTAGGER_LEXICON);
      await rebuildVocabularyInDb({ dbName, storeName, tagger });
      const refreshed = await readAllNodes({ dbName, storeName });
      vocabNodes = refreshed.filter((n) => looksLikeVocabularyNode(n));
    }

    const nodesById = new Map();
    for (const n of vocabNodes) {
      const id = n["@id"] || n.id;
      if (id) nodesById.set(id, n);
    }

    const rows = vocabNodes
      .map((n) => nodeToRow(n, dbName))
      .filter((r) => r.iri && r.label);

    return { dbName, storeName, rows, nodesById };
  }

  async function saveRow(row, { dbName = CFG.dbName, storeName = CFG.storeName, nodesById } = {}) {
    if (!row?.iri) throw new Error("Row is missing iri.");

    // Validate isDefinedBy if present
    if (row.isDefinedBy && !isAnyUri(row.isDefinedBy)) {
      throw new Error(`is defined by must be a valid absolute IRI: ${row.isDefinedBy}`);
    }

    const base = nodesById?.get(row.iri) || { "@id": row.iri, "@type": [CFG.GDC_TYPE_IRI] };
    const updated = applyRowToNode(row, base, dbName);

    await upsertNodes([updated], { dbName, storeName });
    if (nodesById) nodesById.set(row.iri, updated);
  }

  function exportRowsToCsv(rows) {
    const headers = ["iri", "label", "element type", "definition", "is a", "is defined by"];
    const lines = [headers.join(",")];

    rows.forEach((r) => {
      lines.push([
        escapeCsv(r.iri),
        escapeCsv(r.label),
        escapeCsv(r.elementType),
        escapeCsv(r.definition),
        escapeCsv(r.isA),
        escapeCsv(r.isDefinedBy),
      ].join(","));
    });

    return lines.join("\n");
  }

  // ---------------------------
  // Expose
  // ---------------------------
  window.VOCAB_EXTRACT = {
    CFG,
    openDb,
    readAllNodes,
    loadVocabularyRows,
    rebuildVocabularyInDb,
    saveRow,
    exportRowsToCsv,
    isAnyUri,
  };
})();