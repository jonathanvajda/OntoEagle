# Handling Graph Data
We use FOSS vendor JS libraries to support various graph data formats: N-Triple, N-Quad, Turtle, TriG, JSON-LD, RDF/XML, OWL/XML.
- N3 (`n3.min.js`) for RDF in N-Triple (.nt), N-Quad (.nq), Turtle (.ttl), TriG (.trig).
- JSON-LD (`jsonld.min.js`) for RDF in JSON Linked Data format (.jsonld).
- RDF-XML (`rdflib.min.js`) for RDF in RDF-XML (support for OWL-XML only insofar as we treat the OWL-XML as RDF-XML).
- Formats outside of these three libraries coverage are outside of the app's scope.

## FOSS Requirement
- Any vendor code needs to be free and open source, permissive of commercial and non-commercial applications.
- Our dependency on some vendor code needs to be explicit which version.
- Our use of some vendor code needs to attribute properly and give credit where due.
- Our use of any vendor code needs to have a documentation of the know CVEs (if any) for a given version used.

# Graph Data Adapters
