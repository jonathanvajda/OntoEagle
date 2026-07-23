# Handling Tabular Data
We use FOSS vendor JS libraries to support various tabular data formats: CSV, TSV, XLS, XLSX, ODS, XLSM, XLSB.
- Papa Parse (`papaparse.min.js`) for comma-separated values (CSV, .csv), tab-separated values (TSV, .tsv).
- SheetJS CE (`xlsx.min.js`) for XLS, XLSX, ODS, XLSM, XLSB.
- Tabular data formats outside of these two libraries coverage are outside of the app's scope.

## FOSS Requirement
- Any vendor code needs to be free and open source, permissive of commercial and non-commercial applications.
- Our dependency on some vendor code needs to be explicit which version.
- Our use of some vendor code needs to attribute properly and give credit where due.
- Our use of any vendor code needs to have a documentation of the know CVEs (if any) for a given version used.

# Tabular Data Adapters
