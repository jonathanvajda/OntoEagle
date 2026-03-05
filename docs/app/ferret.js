
    // ======================================================
    // SECTION 1: GLOBAL STATE
    // ======================================================
    let currentCQId = null;
    let allNodesCache = [];
    const tagger = new POSTagger(window.POSTAGGER_LEXICON);
    const gdcManager = new GDCManager(tagger, allNodesCache);

    // ======================================================
    // SECTION 2: CORE DATABASE LOGIC
    // ======================================================
    function initIndexedDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("CQDatabase", 1);
        request.onupgradeneeded = (event) => {
          if (!event.target.result.objectStoreNames.contains("CQStore")) {
            event.target.result.createObjectStore("CQStore", { keyPath: "id" });
          }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
      });
    }

    async function readFromIndexedDB() {
      const db = await initIndexedDB();
      const transaction = db.transaction("CQStore", "readonly");
      const store = transaction.objectStore("CQStore");
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.map(node => ({ ...node, "@id": node.id })));
        request.onerror = (event) => reject(event.target.error);
      });
    }

    // ======================================================
    // SECTION 3: AUTO-SAVE LOGIC
    // ======================================================
    function debounce(func, delay) {
      let timeoutId;
      const debouncedFunc = function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
      debouncedFunc.cancel = () => clearTimeout(timeoutId);
      return debouncedFunc;
    }

    const debouncedAutoSave = debounce(() => autoSaveCQ(), 2000);

    // ======================================================
    // SECTION 4: UI & STATE MANAGEMENT
    // ======================================================
    async function initialLoad() {
      allNodesCache = await readFromIndexedDB();
      renderSidebarFromCache();
      document.getElementById("new-cq-button").click();
    }

function renderSidebarFromCache() {
    const cqList = document.getElementById("cq-list");
    cqList.innerHTML = "";
    
    // Add safety checks before calling .includes()
    const cqNodes = allNodesCache.filter(node => 
        node["@type"] && Array.isArray(node["@type"]) && // <-- Added check
        node["@type"].includes("https://dhs.gov/ontology/ONT_00001017")
    );
    
    const titleProperty = "http://www.w3.org/2000/01/rdf-schema#label";
    cqNodes.sort((a, b) => {
        const titleA = a[titleProperty]?.[0]?.['@value'] ?? '';
        const titleB = b[titleProperty]?.[0]?.['@value'] ?? '';
        return titleA.localeCompare(titleB);
    });
    cqNodes.forEach(addCQToSidebar);
}
    function addCQToSidebar(cq) {
      const cqList = document.getElementById("cq-list");
      const listItem = document.createElement("div");
      listItem.className = "cq-list-item";
      listItem.dataset.id = cq["@id"];
      listItem.onclick = () => {
        loadCQIntoForm(cq["@id"]);
        if (window.innerWidth <= 768) {
          document.querySelector('.main').scrollIntoView({ behavior: 'smooth' });
        }
      };
      const titleSpan = document.createElement("span");
      const titleProperty = "http://www.w3.org/2000/01/rdf-schema#label";
      titleSpan.textContent = cq[titleProperty]?.[0]?.['@value'] ?? 'Untitled CQ';
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✖";
      deleteBtn.style.cssText = "float: right; border: none; background: transparent; cursor: pointer; color: gray; margin: 0;margin-top: 0;padding: 0;";
      deleteBtn.onclick = (event) => {
        event.stopPropagation();
        if (confirm(`Are you sure you want to delete "${titleSpan.textContent}"?`)) {
          deleteCQ(cq["@id"]);
        }
      };
      listItem.appendChild(titleSpan);
      listItem.appendChild(deleteBtn);
      cqList.appendChild(listItem);
    }

    function updateCQInSidebar(cq) {
      const listItem = document.querySelector(`.cq-list-item[data-id="${cq['@id']}"]`);
      if (listItem) {
        const titleProperty = "http://www.w3.org/2000/01/rdf-schema#label";
        listItem.querySelector('span').textContent = cq[titleProperty]?.[0]?.['@value'] ?? 'Untitled CQ';
      }
    }

    function removeCQFromSidebar(cqId) {
      const listItem = document.querySelector(`.cq-list-item[data-id="${cqId}"]`);
      if (listItem) listItem.remove();
    }

    function loadCQIntoForm(cqId) {
      console.log(`--- Loading CQ: ${cqId} ---`);
      debouncedAutoSave.cancel();
      document.getElementById('save-status').textContent = '';
      const cq = allNodesCache.find(node => node["@id"] === cqId);
      if (!cq) {
        console.error("CQ node not found in cache.");
        return;
      }
      console.log("Found CQ Node:", cq);

      currentCQId = cqId;
      document.getElementById("cq-title").value = cq["http://www.w3.org/2000/01/rdf-schema#label"]?.[0]?.['@value'] ?? '';
      document.getElementById("cq-description").value = cq["http://purl.org/dc/terms/description"]?.[0]?.['@value'] ?? '';
      document.getElementById("cq-status").value = cq["http://example.com/ns/status"]?.[0]?.['@value'] ?? 'Draft';
      const personsList = document.getElementById('persons-list');
      personsList.innerHTML = '';
      const participantLinks = cq["http://purl.org/dc/terms/contributor"] || [];
      console.log("Found Contributor Links:", participantLinks);
      const participantNodes = allNodesCache.filter(n =>
        participantLinks.some(p => p["@id"] === n["@id"]) &&
        n["@type"].includes("https://www.commoncoreontologies.org/ont00001262")
      );
      console.log("Found Participant Nodes:", participantNodes);
      participantNodes.forEach(pNode => {
        const personId = pNode['@id'];
        const emailId = pNode["https://www.commoncoreontologies.org/ont00001801"]?.[0]?.['@id'] ?? '';
        const name = pNode["http://www.w3.org/2000/01/rdf-schema#label"]?.[0]?.['@value'] ?? '';
        const notes = pNode["http://www.w3.org/2000/01/rdf-schema#comment"]?.[0]?.['@value'] ?? '';
        let contact = '';
        if (emailId) {
          const emailNode = allNodesCache.find(n => n['@id'] === emailId);
          contact = emailNode?.["https://www.commoncoreontologies.org/ont00001761"]?.[0]?.['@value'] ?? '';
        }
        let role = 'Other';
        const roleLink = pNode["http://purl.obolibrary.org/obo/BFO_0000196"]?.[0]?.['@id'];
        if (roleLink) {
          const roleNode = allNodesCache.find(n => n['@id'] === roleLink);
          role = roleNode?.["https://www.commoncoreontologies.org/ont00001761"]?.[0]?.['@value'] ?? 'Other';
        }
        console.log(`Calling addPersonItem with personId: ${personId}`);
        addPersonItem(name, role, contact, notes, personId, emailId);
      });
      if (personsList.children.length === 0) {
        addPersonItem();
      }
      const subquestionsList = document.getElementById('subquestions-list');
      subquestionsList.innerHTML = '';
      const subquestionNodes = allNodesCache.filter(n =>
        (cq["http://purl.obolibrary.org/obo/BFO_0000178"] || []).some(item => item["@id"] === n["@id"]) &&
        n["@type"].includes("https://dhs.gov/ontology/ONT_00001016")
      );
      subquestionNodes.forEach(node => addSubquestionItem(node["https://www.commoncoreontologies.org/ont00001761"][0]["@value"]));
      if (subquestionsList.children.length === 0) addSubquestionItem();
      const decisionLogicList = document.getElementById('decision-logic-list');
      decisionLogicList.innerHTML = '';
      const logicNodes = allNodesCache.filter(n =>
        (cq["http://purl.obolibrary.org/obo/BFO_0000178"] || []).some(item => item["@id"] === n["@id"]) &&
        n["@type"].includes("https://dhs.gov/ontology/ONT_00001018")
      );
      logicNodes.forEach(node => addDecisionLogicItem(node["https://www.commoncoreontologies.org/ont00001761"][0]["@value"]));
      if (decisionLogicList.children.length === 0) addDecisionLogicItem();
      const dataRequirementsList = document.getElementById('data-requirements-list');
      dataRequirementsList.innerHTML = '';
      const dataSourceNodes = allNodesCache.filter(n =>
        (cq["http://purl.org/dc/terms/requires"] || []).some(item => item["@id"] === n["@id"]) &&
        n["@type"].includes("https://www.commoncoreontologies.org/ont00000756")
      );
      dataSourceNodes.forEach(dsNode => {
        const sourceText = dsNode["https://www.commoncoreontologies.org/ont00001761"]?.[0]?.["@value"] ?? '';
        const qualityText = dsNode["http://www.w3.org/2000/01/rdf-schema#comment"]?.[0]?.["@value"] ?? '';
        addDataRequirementItem(sourceText, qualityText);
      });
      if (dataRequirementsList.children.length === 0) addDataRequirementItem();
    }

    // ======================================================
    // SECTION 5: UI COMPONENT HELPER FUNCTIONS
    // ======================================================
    function addDataRequirementItem(source = '', quality = '') {
      const listContainer = document.getElementById('data-requirements-list');
      const item = document.createElement('div');
      item.className = 'data-requirement-item';
      const sourceLabel = document.createElement('label');
      sourceLabel.textContent = 'Data Source';
      const sourceInput = document.createElement('input');
      sourceInput.type = 'text';
      sourceInput.className = 'data-source-input';
      sourceInput.placeholder = 'Enter a data source name...';
      sourceInput.value = source;
      const qualityLabel = document.createElement('label');
      qualityLabel.textContent = 'Data Quality Notes (If you know)';
      const qualityTextarea = document.createElement('textarea');
      qualityTextarea.className = 'data-quality-input';
      qualityTextarea.rows = 2;
      qualityTextarea.placeholder = 'Note any known issues or limitations for this source...';
      qualityTextarea.value = quality;
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-item-btn';
      deleteBtn.textContent = '✖';
      deleteBtn.type = 'button';
      deleteBtn.onclick = () => {
        if (confirm('Are you sure you want to delete this data requirement?')) {
          item.remove();
          if (listContainer.children.length === 0) addDataRequirementItem();
          debouncedAutoSave();
        }
      };
      item.appendChild(deleteBtn);
      item.appendChild(sourceLabel);
      item.appendChild(sourceInput);
      item.appendChild(qualityLabel);
      item.appendChild(qualityTextarea);
      listContainer.appendChild(item);
    }

    function addSubquestionItem(text = '') {
      const listContainer = document.getElementById('subquestions-list');
      const item = document.createElement('div');
      item.className = 'list-item-container';
      const textarea = document.createElement('textarea');
      textarea.className = 'subquestion-input';
      textarea.rows = 3;
      textarea.value = text;
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-item-btn';
      deleteBtn.textContent = '✖';
      deleteBtn.type = 'button';
      deleteBtn.onclick = () => {
        if (confirm(`Are you sure you want to delete this subquestion?`)) {
          item.remove();
          if (listContainer.children.length === 0) addSubquestionItem();
          debouncedAutoSave();
        }
      };
      item.appendChild(textarea);
      item.appendChild(deleteBtn);
      listContainer.appendChild(item);
    }

    function addDecisionLogicItem(text = '') {
      const listContainer = document.getElementById('decision-logic-list');
      const item = document.createElement('div');
      item.className = 'list-item-container';
      const textarea = document.createElement('textarea');
      textarea.className = 'decision-logic-input';
      textarea.rows = 3;
      textarea.value = text;
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-item-btn';
      deleteBtn.textContent = '✖';
      deleteBtn.type = 'button';
      deleteBtn.onclick = () => {
        if (confirm(`Are you sure you want to delete this logic item?`)) {
          item.remove();
          if (listContainer.children.length === 0) addDecisionLogicItem();
          debouncedAutoSave();
        }
      };
      item.appendChild(textarea);
      item.appendChild(deleteBtn);
      listContainer.appendChild(item);
    }

    function addPersonItem(name = '', role = 'Creator', contact = '', notes = '', personId = '', emailId = '') {
      const listContainer = document.getElementById('persons-list');
      const item = document.createElement('div');
      item.className = 'person-entry';
      const header = document.createElement('div');
      header.className = 'person-header';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'person-name-input';
      nameInput.placeholder = 'Full Name (type to search...)';
      nameInput.value = name;
      nameInput.setAttribute('autocomplete', 'off');
      const roleSelect = document.createElement('select');
      roleSelect.className = 'person-role-select';
      const roles = ['Creator', 'Approver', 'Reviewer', 'Executor', 'Subject Matter Expert', 'Other'];
      roles.forEach(r => {
        const option = document.createElement('option');
        option.value = r;
        option.textContent = r;
        if (r === role) option.selected = true;
        roleSelect.appendChild(option);
      });
      const contactInput = document.createElement('input');
      contactInput.type = 'text';
      contactInput.className = 'person-contact-input';
      contactInput.placeholder = 'Contact (Email, Phone, etc.)';
      contactInput.value = contact;
      const notesTextarea = document.createElement('textarea');
      notesTextarea.className = 'person-notes-textarea';
      notesTextarea.rows = 2;
      notesTextarea.placeholder = 'Notes / Comments (e.g., area of responsibility)';
      notesTextarea.value = notes;
      const personIdInput = document.createElement('input');
      personIdInput.type = 'hidden';
      personIdInput.className = 'person-id-input';
      personIdInput.value = personId;
      const emailIdInput = document.createElement('input');
      emailIdInput.type = 'hidden';
      emailIdInput.className = 'email-id-input';
      emailIdInput.value = emailId;
      const searchResultsContainer = document.createElement('div');
      searchResultsContainer.className = 'person-search-results';
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-item-btn';
      deleteBtn.textContent = '✖';
      deleteBtn.type = 'button';
      deleteBtn.onclick = () => {
        if (confirm(`Are you sure you want to remove ${nameInput.value || 'this person'}?`)) {
          item.remove();
          if (listContainer.children.length === 0) addPersonItem();
          debouncedAutoSave();
        }
      };
      nameInput.addEventListener('input', () => {
        const searchTerm = nameInput.value.toLowerCase().trim();
        searchResultsContainer.innerHTML = '';
        personIdInput.value = '';
        emailIdInput.value = '';
        if (searchTerm.length < 2) return;
const allPeople = allNodesCache.filter(n =>
    n["@type"] && Array.isArray(n["@type"]) && // <-- Add this check
    n["@type"].includes("https://www.commoncoreontologies.org/ont00001262")
);
        const matches = allPeople.filter(p => {
          const personName = p["http://www.w3.org/2000/01/rdf-schema#label"]?.[0]?.['@value'] ?? '';
          return personName.toLowerCase().includes(searchTerm);
        });
        matches.forEach(match => {
          const resultItem = document.createElement('div');
          resultItem.className = 'person-search-result-item';
          const personName = match["http://www.w3.org/2000/01/rdf-schema#label"]?.[0]?.['@value'] ?? '';
          const emailIdMatch = match["https://www.commoncoreontologies.org/ont00001801"]?.[0]?.['@id'];
          const emailNode = allNodesCache.find(n => n['@id'] === emailIdMatch);
          const personContact = emailNode?.["https://www.commoncoreontologies.org/ont00001761"]?.[0]?.['@value'] ?? 'No contact info';
          resultItem.innerHTML = `${personName} <small>${personContact}</small>`;
          resultItem.addEventListener('click', () => {
            const selectedPersonId = match['@id'];
            const selectedEmailId = emailIdMatch;
            const selectedName = personName;
            const selectedNotes = match["http://www.w3.org/2000/01/rdf-schema#comment"]?.[0]?.['@value'] ?? '';
            const selectedContact = personContact === 'No contact info' ? '' : personContact;
            nameInput.value = selectedName;
            contactInput.value = selectedContact;
            notesTextarea.value = selectedNotes;
            personIdInput.value = selectedPersonId;
            emailIdInput.value = selectedEmailId;
            searchResultsContainer.innerHTML = '';
            debouncedAutoSave();
          });
          searchResultsContainer.appendChild(resultItem);
        });
      });
      document.addEventListener('click', (e) => {
        if (!item.contains(e.target)) {
          searchResultsContainer.innerHTML = '';
        }
      });
      header.appendChild(nameInput);
      header.appendChild(roleSelect);
      item.appendChild(deleteBtn);
      item.appendChild(header);
      item.appendChild(searchResultsContainer);
      item.appendChild(contactInput);
      item.appendChild(notesTextarea);
      item.appendChild(personIdInput);
      item.appendChild(emailIdInput);
      listContainer.appendChild(item);
    }

    // ======================================================
    // SECTION 6: DATA TRANSFORMATION & ACTIONS
    // ======================================================
function generateJSONLD() {
        const cqUniqueId = currentCQId ? currentCQId.split('/').pop().split('_').pop() : Date.now();
        const title = document.getElementById("cq-title").value;
        if (!title.trim()) {
            console.warn("Save aborted: Title is a required field.");
            return null;
        }
        // ... (get description, status, subquestions, decisionLogic - unchanged) ...
        const description = document.getElementById("cq-description").value;
        const status = document.getElementById("cq-status").value;
        const subquestions = Array.from(document.querySelectorAll('.subquestion-input')).map(input => input.value.trim()).filter(Boolean);
        const decisionLogic = Array.from(document.querySelectorAll('.decision-logic-input')).map(input => input.value.trim()).filter(Boolean);


        const personItems = Array.from(document.querySelectorAll('.person-entry'));
        const personsData = personItems.map(item => ({
            id: item.querySelector('.person-id-input').value,
            emailId: item.querySelector('.email-id-input').value,
            name: item.querySelector('.person-name-input').value.trim(),
            role: item.querySelector('.person-role-select').value,
            contact: item.querySelector('.person-contact-input').value.trim(),
            notes: item.querySelector('.person-notes-textarea').value.trim()
        })).filter(p => p.name);

        const dataRequirementItems = Array.from(document.querySelectorAll('.data-requirement-item'));
        const dataRequirements = dataRequirementItems.map(item => ({
            source: item.querySelector('.data-source-input').value.trim(),
            quality: item.querySelector('.data-quality-input').value.trim()
        })).filter(dr => dr.source);

        let personRelatedNodes = [];
        const contributorLinks = []; // Store links to add to the CQ node

        // --- START MODIFIED PERSON LOGIC ---
        personsData.forEach((p, index) => {
            let personId = p.id;
            let emailId = p.emailId;
            let existingPersonNode = null;

            // If ID is missing, try to find an existing person by name in the cache
if (!personId && p.name) {
                existingPersonNode = allNodesCache.find(n =>
                    n["@type"] && Array.isArray(n["@type"]) && // <-- Add this check
                    n["@type"].includes("https://www.commoncoreontologies.org/ont00001262") &&
                    n["http://www.w3.org/2000/01/rdf-schema#label"]?.[0]?.['@value'] === p.name
                );
                if (existingPersonNode) {
                    console.log(`Found existing person for "${p.name}" with ID: ${existingPersonNode['@id']}`);
                    personId = existingPersonNode['@id'];
                    // Try to get the existing email ID too
                    emailId = existingPersonNode["https://www.commoncoreontologies.org/ont00001801"]?.[0]?.['@id'] || emailId;
                }
            }
            
            // If still no personId, generate a new one
            if (!personId) {
                 personId = `https://www.commoncoreontologies.org/ont00001262/Person_${Date.now() + index}`;
            }
            // Generate email ID if still missing
            if (!emailId) {
                emailId = `https://www.commoncoreontologies.org/CommonCoreOntologies/EmailAddress_${Date.now() + index}`;
            }

            const roleId = `http://purl.obolibrary.org/obo/BFO_0000023/role_${p.role.replace(/\s+/g, '')}`;

            // Add the contributor link for the CQ node
            contributorLinks.push({ "@id": personId });

            // Create/Update Person Node (only add if not already in cache or if it's new)
            if (!allNodesCache.find(n => n['@id'] === personId)) {
                personRelatedNodes.push({
                    "@id": personId,
                    "@type": ["https://www.commoncoreontologies.org/ont00001262", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    "http://www.w3.org/2000/01/rdf-schema#label": [{ "@value": p.name }],
                    "http://www.w3.org/2000/01/rdf-schema#comment": [{ "@value": p.notes }],
                    "https://www.commoncoreontologies.org/ont00001801": [{ "@id": emailId }],
                    "http://purl.obolibrary.org/obo/BFO_0000196": [{ "@id": roleId }]
                });
            }

            // Create/Update Email Node
            if (!allNodesCache.find(n => n['@id'] === emailId)) {
                personRelatedNodes.push({
                    "@id": emailId,
                    "@type": ["https://www.commoncoreontologies.org/CommonCoreOntologies/EmailAddress", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    // Use a more robust property name here, ensure it matches your email node definition
                    "https://www.commoncoreontologies.org/ont00001761": [{ "@value": p.contact }], 
                });
            }

            // Create/Update Role Node
            if (!allNodesCache.find(n => n['@id'] === roleId)) {
                 personRelatedNodes.push({
                    "@id": roleId,
                    "@type": ["http://purl.obolibrary.org/obo/BFO_0000023", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    "https://www.commoncoreontologies.org/ont00001761": [{ "@value": p.role }],
                });
            }
        });
        // --- END MODIFIED PERSON LOGIC ---


        const dataSourceNodes = dataRequirements.map((dr, index) => ({
             "@id": `https://www.commoncoreontologies.org/ont00000756/Database_${cqUniqueId}_${index + 1}`,
             // ... rest of data source node ...
             "@type": ["https://www.commoncoreontologies.org/ont00000756", "http://www.w3.org/2002/07/owl#NamedIndividual"],
             "https://www.commoncoreontologies.org/ont00001761": [{ "@value": dr.source }],
             "http://www.w3.org/2000/01/rdf-schema#comment": [{ "@value": dr.quality }]
        }));
        const subquestionNodes = subquestions.map((sq, index) => ({
             "@id": `https://dhs.gov/ontology/ONT_00001016/InterrogativeInformationContentEntity_${cqUniqueId}_${index + 1}`,
             // ... rest of subquestion node ...
             "@type": ["https://dhs.gov/ontology/ONT_00001016", "http://www.w3.org/2002/07/owl#NamedIndividual"],
             "https://www.commoncoreontologies.org/ont00001761": [{ "@value": sq }],
        }));
        const decisionLogicNodes = decisionLogic.map((dl, index) => ({
             "@id": `https://dhs.gov/ontology/ONT_00001018/BusinessRule_${cqUniqueId}_${index + 1}`,
             // ... rest of logic node ...
             "@type": ["https://dhs.gov/ontology/ONT_00001018", "http://www.w3.org/2002/07/owl#NamedIndividual"],
             "https://www.commoncoreontologies.org/ont00001761": [{ "@value": dl }],
        }));
        
        // ... (timestamp logic unchanged) ...
        const nowISO = new Date().toISOString();
        const lastModifiedTimestamp = [{ "@value": nowISO, "@type": "http://www.w3.org/2001/XMLSchema#dateTime" }];
        let createdTimestamp;
        if (currentCQId) { const existingCQ = allNodesCache.find(n => n['@id'] === currentCQId); if (existingCQ && existingCQ["http://purl.org/dc/terms/created"]) { createdTimestamp = existingCQ["http://purl.org/dc/terms/created"]; } }
        if (!createdTimestamp) { createdTimestamp = [{ "@value": nowISO, "@type": "http://www.w3.org/2001/XMLSchema#dateTime" }]; }

        const jsonLD = [
            ...personRelatedNodes,
            ...dataSourceNodes,
            ...subquestionNodes,
            ...decisionLogicNodes,
            {
                "@id": `https://dhs.gov/ontology/ONT_00001017/DecisionSupportQuestion_${cqUniqueId}`,
                "@type": ["https://dhs.gov/ontology/ONT_00001017", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                "http://www.w3.org/2000/01/rdf-schema#label": [{ "@value": title }],
                "http://purl.org/dc/terms/description": [{ "@value": description }],
                "http://purl.org/dc/terms/created": createdTimestamp,
                "http://purl.org/dc/terms/modified": lastModifiedTimestamp,
                "http://example.com/ns/status": [{ "@value": status }],
                "http://purl.org/dc/terms/contributor": contributorLinks, // Use the collected links
                "http://purl.org/dc/terms/requires": dataSourceNodes.map(dsn => ({ "@id": dsn['@id'] })),
                "http://purl.obolibrary.org/obo/BFO_0000178": [
                    ...decisionLogicNodes.map(n => ({ "@id": n['@id'] })),
                    ...subquestionNodes.map(n => ({ "@id": n['@id'] })),
                ],
            },
        ];
        return jsonLD;
    }
    
async function performSave() {
    // 1. Generate the fresh CQ data from the form.
    const newJsonLD = generateJSONLD(); // <-- Make sure this line exists and is uncommented

    // Check if generation failed (e.g., missing title)
    if (!newJsonLD) {
        return { success: false, reason: 'Title is required.' };
    }

    // 2. Create the sync node.
    const syncNode = {
        '@id': 'sync_state',
        id: 'sync_state', // Required for the IndexedDB keyPath
        'http://purl.org/dc/terms/modified': new Date().toISOString()
    };

    // 3. Combine the form data with the sync node.
    const nodesToSave = [...newJsonLD, syncNode];

    // 4. Pass the data and current cache to the manager.
    return await gdcManager.updateAndSave(nodesToSave, allNodesCache, currentCQId);
}
    
    async function saveJSONLD() {
      debouncedAutoSave.cancel();
      const result = await performSave();
      if (result.success) {
        const isUpdate = !!currentCQId;
        const savedDsqId = isUpdate ? currentCQId : result.newJsonLD.find(n => n["@type"].includes("https://dhs.gov/ontology/ONT_00001017"))["@id"];
        allNodesCache = await readFromIndexedDB();
        const cqNode = allNodesCache.find(n => n['@id'] === savedDsqId);
        if (!cqNode) {
          console.error("Could not find the saved CQ in the cache after saving:", savedDsqId);
          alert("An error occurred after saving. Could not update the UI.");
          return;
        }
        if (!isUpdate) {
          currentCQId = savedDsqId;
          addCQToSidebar(cqNode);
        } else {
          updateCQInSidebar(cqNode);
        }
        const cqList = document.getElementById("cq-list");
        Array.from(cqList.children)
          .sort((a, b) => a.textContent.localeCompare(b.textContent))
          .forEach(node => cqList.appendChild(node));
        document.getElementById('save-status').textContent = '';
        alert(isUpdate ? "CQ updated successfully!" : "New CQ saved successfully!");
      } else {
        alert(`Error saving CQ: ${result.reason}`);
      }
    }

    async function autoSaveCQ() {
      if (!currentCQId) return;
      const statusEl = document.getElementById('save-status');
      statusEl.textContent = 'Saving...';
      const result = await performSave();
      if (result.success) {
        statusEl.textContent = `All changes saved. (${new Date().toLocaleTimeString()})`;
        allNodesCache = await readFromIndexedDB();
        const updatedDsqNode = allNodesCache.find(n => n['@id'] === currentCQId);
        if (updatedDsqNode) updateCQInSidebar(updatedDsqNode);
      } else {
        statusEl.textContent = `Save failed: ${result.reason}`;
      }
    }

    async function deleteCQ(cqId) {
      debouncedAutoSave.cancel();
      const db = await initIndexedDB();
      const transaction = db.transaction("CQStore", "readwrite");
      const store = transaction.objectStore("CQStore");
      const uniqueId = cqId.split('_').pop();
      const request = store.getAllKeys();
      request.onsuccess = () => {
        request.result.filter(key => key.includes(`_${uniqueId}`)).forEach(key => store.delete(key));
      };
      transaction.oncomplete = () => {
        allNodesCache = allNodesCache.filter(node => !node['@id'].includes(`_${uniqueId}`));
        removeCQFromSidebar(cqId);
        alert("CQ deleted successfully.");
        if (currentCQId === cqId) {
          document.getElementById("new-cq-button").click();
        }
      };
    }

    function downloadJSONLD() {
      const jsonLD = JSON.stringify(allNodesCache, null, 2);
      const blob = new Blob([jsonLD], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "CQDatabase.jsonld";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function downloadCSV() {
      console.log("Generating CSV...");

      // 1. Define the columns for our normalized CSV
      const headers = [
        'cq_id', 'cq_title', 'cq_description', 'cq_created_date', 'cq_modified_date', 'cq_status',
        'item_type', 'item_id', 'item_text',
        'contributor_role', 'contributor_contact', 'contributor_notes',
        'contributor_email_id', 'contributor_role_id',
        'datasource_quality_notes'
      ];
      const csvRows = [headers.join(',')]; // Start with the header row

      // Helper function to escape CSV data
      const escapeCSV = (str) => {
        if (str === null || str === undefined) return '""';
        const text = String(str);
        if (text.includes('"') || text.includes(',') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return `"${text}"`;
      };

      // 2. Find all the master CQ nodes
      const cqNodes = allNodesCache.filter(n => n["@type"].includes("https://dhs.gov/ontology/ONT_00001017"));

      // 3. Process each CQ and its related items
      cqNodes.forEach(cq => {
        const baseRow = {
          cq_id: cq['@id'] || '',
          cq_title: cq["http://www.w3.org/2000/01/rdf-schema#label"]?.[0]?.['@value'] ?? '',
          cq_description: cq["http://purl.org/dc/terms/description"]?.[0]?.['@value'] ?? '',
          cq_created_date: cq["http://purl.org/dc/terms/created"]?.[0]?.['@value'] ?? '',
          cq_modified_date: cq["http://purl.org/dc/terms/modified"]?.[0]?.['@value'] ?? '',
          cq_status: cq["http://example.com/ns/status"]?.[0]?.['@value'] ?? '',
        };

        let itemsFound = 0;

        // Process Contributors (Persons/Roles)
        const participantLinks = cq["http://purl.org/dc/terms/contributor"] || [];
        const participantNodes = allNodesCache.filter(n =>
          participantLinks.some(p => p["@id"] === n["@id"]) && n["@type"].includes("https://www.commoncoreontologies.org/ont00001262")
        );
        participantNodes.forEach(pNode => {
          itemsFound++;
          const personId = pNode['@id'];
          const emailId = pNode["https://www.commoncoreontologies.org/ont00001801"]?.[0]?.['@id'] ?? '';
          const roleLink = pNode["http://purl.obolibrary.org/obo/BFO_0000196"]?.[0]?.['@id'];

          const emailNode = allNodesCache.find(n => n['@id'] === emailId);
          const roleNode = allNodesCache.find(n => n['@id'] === roleLink);

          const row = {
            ...baseRow,
            item_type: 'Contributor',
            item_id: personId,
            item_text: pNode["http://www.w3.org/2000/01/rdf-schema#label"]?.[0]?.['@value'] ?? '',
            contributor_role: roleNode?.["https://www.commoncoreontologies.org/ont00001761"]?.[0]?.['@value'] ?? '',
            contributor_contact: emailNode?.["https://www.commoncoreontologies.org/ont00001761"]?.[0]?.['@value'] ?? '',
            contributor_notes: pNode["http://www.w3.org/2000/01/rdf-schema#comment"]?.[0]?.['@value'] ?? '',
            // ADDED: Populate the new ID columns
            contributor_email_id: emailId,
            contributor_role_id: roleLink,
            datasource_quality_notes: ''
          };
          csvRows.push(headers.map(header => escapeCSV(row[header])).join(','));
        });

        // Process other item types (Subquestions, Logic, Data Sources)
        const itemTypes = [
          { type: 'Subquestion', iri: 'https://dhs.gov/ontology/ONT_00001016', link: 'http://purl.obolibrary.org/obo/BFO_0000178' },
          { type: 'DecisionLogic', iri: 'https://dhs.gov/ontology/ONT_00001018', link: 'http://purl.obolibrary.org/obo/BFO_0000178' },
          { type: 'DataSource', iri: 'https://www.commoncoreontologies.org/ont00000756', link: 'http://purl.org/dc/terms/requires' }
        ];

        itemTypes.forEach(config => {
          const itemNodes = allNodesCache.filter(n =>
            (cq[config.link] || []).some(item => item["@id"] === n["@id"]) && n["@type"].includes(config.iri)
          );
          itemNodes.forEach(node => {
            itemsFound++;
            const row = {
              ...baseRow,
              item_type: config.type,
              item_id: node['@id'],
              item_text: node["https://www.commoncoreontologies.org/ont00001761"]?.[0]?.['@value'] ?? '',
              contributor_role: '',
              contributor_contact: '',
              contributor_notes: '',
              datasource_quality_notes: node["http://www.w3.org/2000/01/rdf-schema#comment"]?.[0]?.['@value'] ?? ''
            };
            csvRows.push(headers.map(header => escapeCSV(row[header])).join(','));
          });
        });

        // If a CQ has no items, create a single row for it.
        if (itemsFound === 0) {
          const row = { ...baseRow, item_type: 'CQ', item_id: baseRow.cq_id };
          csvRows.push(headers.map(header => escapeCSV(row[header] || '')).join(','));
        }
      });

      // 4. Trigger the file download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CQ_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("CSV generation complete.");
    }

    async function handleCSVUpload(event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }

      // UPDATED: Changed the confirmation message to reflect the new behavior.
      if (!confirm("This will ADD data from the CSV to your tool, or UPDATE existing entries if the IDs match. Are you sure you want to proceed?")) {
        event.target.value = ''; // Reset the file input
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;

        // --- 1. PARSE THE CSV TEXT INTO ROW OBJECTS (Unchanged) ---
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const headers = rows.shift().split(',').map(h => h.replace(/"/g, '').trim());
        const data = rows.map(row => {
          const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] ? values[index].replace(/"/g, '').trim() : '';
          });
          return obj;
        });
        console.log("Parsed CSV data:", data);

        // --- 2. RECONSTRUCT THE GRAPH FROM THE FLAT DATA ---
        let newGraph = [];
        const processedNodeIds = new Set();
        const cqGroups = data.reduce((acc, row) => {
          const cqId = row.cq_id;
          if (cqId) { // Only process rows that have a cq_id
            if (!acc[cqId]) acc[cqId] = [];
            acc[cqId].push(row);
          }
          return acc;
        }, {});
        console.log("Grouped by CQ:", cqGroups);

        

        for (const cqId in cqGroups) {
          const groupRows = cqGroups[cqId];
          const baseRow = groupRows[0];

          const cqNode = {
            "@id": baseRow.cq_id,
            "@type": ["https://dhs.gov/ontology/ONT_00001017", "http://www.w3.org/2002/07/owl#NamedIndividual"],
            "http://www.w3.org/2000/01/rdf-schema#label": [{ "@value": baseRow.cq_title }],
            "http://purl.org/dc/terms/description": [{ "@value": baseRow.cq_description }],
            "http://purl.org/dc/terms/created": [{ "@value": baseRow.cq_created_date, "@type": "http://www.w3.org/2001/XMLSchema#dateTime" }],
            "http://purl.org/dc/terms/modified": [{ "@value": baseRow.cq_modified_date, "@type": "http://www.w3.org/2001/XMLSchema#dateTime" }],
            "http://example.com/ns/status": [{ "@value": baseRow.cq_status }],
            "http://purl.org/dc/terms/contributor": [],
            "http://purl.org/dc/terms/requires": [],
            "http://purl.obolibrary.org/obo/BFO_0000178": []
          };

          // Process each item row within the CQ group
          groupRows.forEach(row => {
            if (!row.item_id || !row.item_type) return;

            switch (row.item_type) {
              case 'Contributor':
                // Create Person, Email, and Role nodes, ensuring no duplicates within this import
                if (row.item_id && !processedNodeIds.has(row.item_id)) {
                  const pNode = {
                    "@id": row.item_id, "@type": ["https://www.commoncoreontologies.org/ont00001262", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    "http://www.w3.org/2000/01/rdf-schema#label": [{ "@value": row.item_text }],
                    "http://www.w3.org/2000/01/rdf-schema#comment": [{ "@value": row.contributor_notes }],
                    "https://www.commoncoreontologies.org/ont00001801": [{ "@id": row.contributor_email_id }],
                    "http://purl.obolibrary.org/obo/BFO_0000196": [{ "@id": row.contributor_role_id }]
                  };
                  newGraph.push(pNode);
                  processedNodeIds.add(row.item_id);
                }
                if (row.contributor_email_id && !processedNodeIds.has(row.contributor_email_id)) {
                  const eNode = {
                    "@id": row.contributor_email_id, "@type": ["https://www.commoncoreontologies.org/CommonCoreOntologies/EmailAddress", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    "https://www.commoncoreontologies.org/ont00001761": [{ "@value": row.contributor_contact }],
                  };
                  newGraph.push(eNode);
                  processedNodeIds.add(row.contributor_email_id);
                }
                if (row.contributor_role_id && !processedNodeIds.has(row.contributor_role_id)) {
                  const rNode = {
                    "@id": row.contributor_role_id, "@type": ["http://purl.obolibrary.org/obo/BFO_0000023", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    "https://www.commoncoreontologies.org/ont00001761": [{ "@value": row.contributor_role }],
                  };
                  newGraph.push(rNode);
                  processedNodeIds.add(row.contributor_role_id);
                }
                cqNode["http://purl.org/dc/terms/contributor"].push({ "@id": row.item_id });
                break;

              // --- ADDED MISSING CASES ---
              case 'Subquestion':
                if (!processedNodeIds.has(row.item_id)) {
                  const sqNode = {
                    "@id": row.item_id, "@type": ["https://dhs.gov/ontology/ONT_00001016", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    "https://www.commoncoreontologies.org/ont00001761": [{ "@value": row.item_text }],
                  };
                  newGraph.push(sqNode);
                  processedNodeIds.add(row.item_id);
                }
                cqNode["http://purl.obolibrary.org/obo/BFO_0000178"].push({ "@id": row.item_id });
                break;

              case 'DecisionLogic':
                if (!processedNodeIds.has(row.item_id)) {
                  const dlNode = {
                    "@id": row.item_id, "@type": ["https://dhs.gov/ontology/ONT_00001018", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    "https://www.commoncoreontologies.org/ont00001761": [{ "@value": row.item_text }],
                  };
                  newGraph.push(dlNode);
                  processedNodeIds.add(row.item_id);
                }
                cqNode["http://purl.obolibrary.org/obo/BFO_0000178"].push({ "@id": row.item_id });
                break;

              case 'DataSource':
                if (!processedNodeIds.has(row.item_id)) {
                  const dsNode = {
                    "@id": row.item_id, "@type": ["https://www.commoncoreontologies.org/ont00000756", "http://www.w3.org/2002/07/owl#NamedIndividual"],
                    "https://www.commoncoreontologies.org/ont00001761": [{ "@value": row.item_text }],
                    "http://www.w3.org/2000/01/rdf-schema#comment": [{ "@value": row.datasource_quality_notes }]
                  };
                  newGraph.push(dsNode);
                  processedNodeIds.add(row.item_id);
                }
                cqNode["http://purl.org/dc/terms/requires"].push({ "@id": row.item_id });
                break;
            }
          });
          newGraph.push(cqNode);
        }
        console.log("Reconstructed graph:", newGraph);

// --- 3. UPDATE THE DATABASE USING THE GDC MANAGER ---
        try {
          // The manager handles GDC generation, deletion, and saving for the CSV data.
          const result = await gdcManager.updateAndSave(newGraph, allNodesCache);
          if (result.success) {
            alert(`Successfully processed ${Object.keys(cqGroups).length} CQs from the CSV! The application will now reload with the new data.`);
            initialLoad(); // Reload the application state from the updated database
          } else {
            throw new Error(result.reason);
          }
        } catch (error) {
          console.error("Failed to save uploaded data:", error);
          alert("An error occurred while saving the uploaded data. Check the console for details.");
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset file input
    }

    // ======================================================
    // SECTION 7: INITIALIZATION & EVENT LISTENERS
    // ======================================================

    function setupEventListeners() {
      document.querySelector('.main').addEventListener('input', debouncedAutoSave);
      document.getElementById('add-subquestion-btn').addEventListener('click', () => {
        addSubquestionItem();
        debouncedAutoSave();
      });
      document.getElementById('add-decision-logic-btn').addEventListener('click', () => {
        addDecisionLogicItem();
        debouncedAutoSave();
      });
      document.getElementById('add-data-requirement-btn').addEventListener('click', () => {
        addDataRequirementItem();
        debouncedAutoSave();
      });
      document.getElementById('add-person-btn').addEventListener('click', () => {
        addPersonItem();
        debouncedAutoSave();
      });
      const saveButtons = ['save-button-top', 'save-button-bottom'];
      saveButtons.forEach(id => {
        document.getElementById(id).addEventListener('click', saveJSONLD);
      });
      document.getElementById("download-jsonld-button").addEventListener("click", downloadJSONLD);
      document.getElementById("download-csv-button").addEventListener("click", downloadCSV);
      document.getElementById("upload-csv-button").addEventListener("click", () => {
        document.getElementById('csv-upload-input').click();
      });
      document.getElementById("csv-upload-input").addEventListener("change", handleCSVUpload);

      document.getElementById("new-cq-button").addEventListener("click", () => {
        debouncedAutoSave.cancel();
        currentCQId = null;
        document.getElementById("cq-title").value = "";
        document.getElementById("cq-description").value = "";
        document.getElementById("cq-status").value = "Draft";
        document.getElementById('save-status').textContent = '';
        document.getElementById("subquestions-list").innerHTML = "";
        document.getElementById("decision-logic-list").innerHTML = "";
        document.getElementById("persons-list").innerHTML = "";
        addPersonItem();
        document.getElementById("data-requirements-list").innerHTML = "";
        addDataRequirementItem();
        addSubquestionItem();
        addDecisionLogicItem();
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
      initialLoad();
    });