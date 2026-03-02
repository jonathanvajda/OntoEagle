/** UI Wiring for bundler app */ 

const app = document.getElementById("app");
const txtRaw = document.getElementById("txtRaw");

const btnCreateBundle = document.getElementById("btnCreateBundle");
const btnSeedExample = document.getElementById("btnSeedExample");
const btnExportSeed = document.getElementById("btnExportSeed");
const btnClear = document.getElementById("btnClear");
const btnMerge = document.getElementById("btnMerge");

const selExportBundle = document.getElementById("selExportBundle");
const chkIncludeLabels = document.getElementById("chkIncludeLabels");
if (document.getElementById("selMergeA")){
  const selMergeA = document.getElementById("selMergeA");
  }
if (document.getElementById("selMergeB")){
const selMergeB = document.getElementById("selMergeB");}

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

if (btnMerge) {btnMerge.addEventListener("click", () => {
  const a = selMergeA.value;
  const b = selMergeB.value;
  if (!a || !b || a === b) return;
  const doc = loadDoc();
  mergeBundles(doc, [a, b]);
  saveDoc(doc);
  render();
});}

if (btnClear){
btnClear.addEventListener("click", () => {
  localStorage.removeItem(BUNDLE_LS_KEY);
  render();
});}

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

// Initial render
render();