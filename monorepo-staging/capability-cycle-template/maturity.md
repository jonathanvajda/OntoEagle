# Reuse Maturity Ratings

## How to Fill This Out

Create one copy of this file for each capability family after the initial inventory exists. Rate each candidate function based on its current state, not on how valuable it might become later.

Update ratings after characterization tests, contract definition, package extraction, pilot adoption, and duplicate deletion. A function or package is not `5 - Canonical` until all intended consumers use it and local duplicates are gone.

## Maturity Scale

|Level|Name|Meaning|
|:---:|:---|:---|
|0|Local only|App-specific, unclear contract, or tightly coupled to DOM/storage.|
|1|Candidate|Useful behavior exists, but it is under-tested, underspecified, or partially coupled.|
|2|Characterized|Current behavior is documented with representative fixtures and comparison notes.|
|3|Reusable|Function is pure or mostly pure, named by action, has clear JSDoc, and has focused tests.|
|4|Package ready|Function is environment-neutral, has predictable error handling, and separates adapters from core logic.|
|5|Canonical|Shared package is adopted by all intended consumers and local duplicates have been deleted.|

## Rating Table

|ID|Function or package|Current level|Target level|Evidence|Blockers|Next action|Owner|Date updated|
|:---|:---|:---:|:---:|:---|:---|:---|:---|:---|
|MAT-001|||||||||

## Promotion Checklist

Use this checklist before rating anything `4 - Package ready`.

- [ ] Function name describes the action, not the source app or one current use case.
- [ ] Inputs and outputs are explicit and documented.
- [ ] Core logic is pure or mostly pure.
- [ ] DOM, storage, file, download, and vendor side effects are behind adapters.
- [ ] Error and warning behavior is predictable.
- [ ] Representative fixtures exist.
- [ ] Jest tests cover happy paths, edge cases, and known invalid inputs.
- [ ] Browser, worker, and Node assumptions are documented.
- [ ] Dependency and vendor provenance is documented.

Use this checklist before rating anything `5 - Canonical`.

- [ ] Shared package has a documented contract.
- [ ] Simple pilot app has adopted the package.
- [ ] Demanding pilot app has adopted the package.
- [ ] All intended consumers have adopted the package.
- [ ] Local duplicate implementations have been deleted.
- [ ] Stale function names have been searched and resolved.
- [ ] App-specific adapter tests remain where needed.
- [ ] Inventory and naming decision files have been updated.

## Notes

- 

