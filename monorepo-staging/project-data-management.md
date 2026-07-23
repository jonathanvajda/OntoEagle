# Data Management

## User Data and Storage
User data is saved and can be stored, in order to persist across sessions.

### Browser Storage
**IndexedDB** (native to all modern browsers)
**IndexedDB Extension** `./public/app/scripts/vendor/idb.min.js` basic adapter
App adapter

## File System Access (FSA) Storage
** Local File System** 
User selects an arbitrary folder to pick. Requires user granting read-write permissions one-time or whenever.

## Session State Management

### UI State Management

### DOM Painting and Management


## What user data?

Overview:
- Project
    - Common ontologies
    - Staged ontology RDF
    - Staged instance RDF
- User settings
    - Per app
    - UI-oriented

**Project Entity and its Metadata:**
|Key|Description|Schema required|Example|
|:---:|:---|:---:|:---|
|IRI|Internationalized Resource Identifier of the project.|`true`|`<https://semanticweb.org/project-xxxx-xxxx-xxxx-xxxx-xxxx>`|
|`dcterms:title`|A name given to the project.|`true`|Customer Project|
|`dcterms:description`|An account of the project.|`true`|This project represents the domain of customers.|
|`dcterms:created`|Date on which project was created.|`true`|`YYYY-MM-DDThh:mmTZD`|
|`dcterms:modified`|Date on which the project was changed.|`false`|`YYYY-MM-DDThh:mmTZD`|
|`dcterms:creator`|An entity responsible for making the project.|`false`|Barry Guarino|
|`dcterms:contributor`|Person or organization that created the project.|`false`|Melanie Sowa|
|`dcterms:license`|A legal document giving official permission to do something with the project.|`false`|MIT 2.0|

**Staged RDF**
|Key|Description|Schema required|Example|
|:---:|:---|:---:|:---|
|subject|IRI of some subject of some semantic statement.|`true`|`<https://semanticweb.org/ind-xxxx-xxxx-xxxx-xxxx-xxxx>`|
|predicate|IRI of some predicate of some semantic statement.|`true`|`<https://semanticweb.org/prop-xxxx-xxxx-xxxx-xxxx-xxxx>`|
|object|An IRI or literal that is the object of some semantic statement|`true`|`YYYY-MM-DDThh:mmTZD` or `<https://semanticweb.org/class-xxxx-xxxx-xxxx-xxxx-xxxx>`|
|graph|IRI naming the graph to which the triple belongs.|`false`|`<https://semanticweb.org/graph-xxxx-xxxx-xxxx-xxxx-xxxx>`|


Metadata:
|Key|Description|Schema required|Example|
|:---:|:---|:---:|:---|
|event|Act of Information Processing.|`true`||
|agent|Artifact that processed information.|`true`|App that generated the data|
|datetime|The date and time that the information processing completed.|`true`|`YYYY-MM-DDThh:mmTZD`|


**Ontology and its Metadata:**
|Key|Description|Schema required|Example|
|:---:|:---|:---:|:---|
|IRI|Internationalized Resource Identifier of the ontology.|true|`<https://semanticweb.org/DomainOntology>`|
|`owl:versionIRI`|IRI that identifies the version of the ontology.|true|`<https://semanticweb.org/2026-02-15T12:34/DomainOntology>`|
|`dcterms:title`|A name given to the ontology.|true|Customer Ontology|
|`dcterms:description`|An account of the ontology.|true|This ontology represents the domain of customers.|
|`dcterms:created`|Date on which ontology was created.|true|YYYY-MM-DDThh:mmTZD|
|`dcterms:modified`|Date on which the ontology was changed.|false|YYYY-MM-DDThh:mmTZD|
|`dcterms:creator`|An entity responsible for making the ontology.|false|Neil Ruttenberg|
|`dcterms:contributor`|Person or organization that created the ontology.|false|Brian Lebo|
|`dcterms:license`|A legal document giving official permission to do something with the ontology.|false|MIT 2.0|

**Platform Settings**
- Light and dark mode (default: light)
- Language (default: English)
- Time zone (default: Eastern, UTC+5:00)

**App Settings**
- 
