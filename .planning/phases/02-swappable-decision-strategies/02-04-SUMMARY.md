## Summary

Wave 4 made the strategy architecture usable in researcher workflows:

- Step 4 of the experiment setup now includes named experiment condition choices:
  - `Manual only`
  - `Rule-based advisory`
  - `Rule-based autonomous`
  - `External advisory`
  - `External autonomous`
- The live researcher view now exposes supervisory controls for:
  - approving/rejecting active proposals
  - pausing/resuming automation
  - switching advisory/autonomous execution mode
- The live metadata column now shows condition/provider/execution state, active proposal status, and proposal history without removing the existing manual intervention history.

## Verification

Frontend verification completed locally on 2026-03-31. The production build passed and the researcher supervisory workflow code is now covered by the Phase 2 verification report.
