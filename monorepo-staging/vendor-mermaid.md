# Handling Mermaid Data
We use FOSS vendor JS libraries to support Mermaid formats
- Mermaid.js (`mermaid.min.js`) for code that is Mermaid syntax.
- Markdown -- we interpret as raw text, and find mermaid code within the markdown.
- Mermaid code outside of this library's coverage are outside of the app's scope.

## FOSS Requirement
- Any vendor code needs to be free and open source, permissive of commercial and non-commercial applications.
- Our dependency on some vendor code needs to be explicit which version.
- Our use of some vendor code needs to attribute properly and give credit where due.
- Our use of any vendor code needs to have a documentation of the know CVEs (if any) for a given version used.

# Mermaid Data Adapters
