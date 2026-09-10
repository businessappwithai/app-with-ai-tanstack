# education-management-system — progress
Phase: 7 (delivered)  ·  Updated: 2026-09-09

| Gate | State |
|---|---|
| A research    | approved (self-approved — no interactive user at the gate) |
| B roster      | approved (self-approved) |
| C entities    | 19 of 19 |
| D cross-cut   | approved |
| E validation  | clean — 0 errors · 0 warnings, three engines agreeing |

| Entity | State | Note |
|---|---|---|
| Department | approved | |
| Room | approved | |
| AcademicTerm | approved | |
| Staff | **amended** | `employment_status` renamed `status` so `StaffLifecycle` could bind (EML500) |
| Course | approved | |
| Guardian | approved | |
| Student | **amended** | gained the `on_leave → suspended` edge while walking DisciplineIncident |
| StudentGuardian | approved | |
| AdmissionApplication | approved | |
| ClassSection | approved | |
| ClassSession | approved | |
| Enrollment | approved | capacity check moved from a rule into `checkSectionCapacity` |
| AttendanceRecord | approved | no state machine, deliberately — see its dossier |
| Assessment | approved | |
| AssessmentResult | approved | gained `max_score`, copied from the paper |
| FeeInvoice | **amended** | gained `part_paid → part_paid` while walking Payment |
| FeeInvoiceLine | approved | |
| Payment | approved | gained `balance_before`, stamped before the write |
| DisciplineIncident | approved | |

**Completion mode: `DONE_WITH_CONCERNS`.** The document is clean and every gate is
closed, but the brief was one line and 22 statements in `00-research.md` §9 are
guesses that no user has confirmed. The one that would change roughly a third of
the roster is §1: this is modelled as a fee-charging secondary school rather than
a college or a training provider.

Open questions for the user, in the order they matter:

1. Is this a school, a college or a training provider? (research §1)
2. Are fees billed per term on enrolment, or on attendance? (research §1)
3. Should teachers record conduct incidents directly, or report them to the
   pastoral team? Today only `counsellor` and `principal` can read or write one.
4. Should a timetable clash and an over-capacity enrolment be **refused** as well
   as reported? Both are two-row facts, so refusing them means a handler.
5. Instalment plans and refunds are out of scope; both are real in most schools.
