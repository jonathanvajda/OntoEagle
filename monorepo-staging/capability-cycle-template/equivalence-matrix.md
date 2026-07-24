# Equivalence Matrix

## How to Fill This Out

Create one copy of this file for each capability family after candidate functions have been grouped in `inventory.md`.

Use this matrix to compare behavior before choosing a canonical API. The goal is to distinguish true duplicates, legitimate app-specific options, stronger implementations, and accidental divergence.

Each row should describe one candidate function. Each column should describe one behavior or contract feature that matters for the capability.

## Capability Family

- **Capability family:**
- **Candidate group:**
- **Related inventory IDs:**
- **Comparison date:**

## Behavior Matrix

|Candidate ID|App|Function|Core behavior|Input shape|Output shape|Formats|Options|Error model|Warning model|Side effects|Dependencies|Worker-safe|Node-safe|Browser-only assumptions|Known bugs|Legitimate variations|Test fixtures|
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---:|:---:|:---|:---|:---|:---|
|INV-001||||||||||||||||||

## Difference Classification

Classify each important difference found in the matrix.

|Difference ID|Candidates affected|Description|Classification|Decision|Rationale|
|:---|:---|:---|:---|:---|:---|
|DIFF-001|||Bug / Legitimate option / Accidental divergence / Improvement / App-specific adapter|||

## Canonical Behavior Recommendation

- **Recommended canonical behavior:**
- **Behavior to preserve as options:**
- **Behavior to reject:**
- **Behavior requiring migration notes:**
- **Open questions:**

