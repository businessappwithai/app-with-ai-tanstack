# education-management-system — progress
Phase: 7 (delivered)  ·  Updated: 2026-10-24 — **revision 1.1.0** (24 entities); the 19 below are the original session

| Gate | State |
|---|---|
| A research    | approved (self-approved — no interactive user at the gate) |
| B roster      | approved (self-approved) |
| C entities    | 19 of 19 in the original session; 5 more added in revision 1.1.0 (24 of 24, below) |
| D cross-cut   | approved |
| E validation  | clean — 0 errors · 0 warnings · 0 info, audit 23 passed 0 failed on the 1.1.0 bytes (`03-validation.md`) |

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
| ConsentRecord | added in 1.1.0 | not walked through this session's gates; dossier generated from the model, judgement notes written from its help, rules and access |
| SupportPlan | added in 1.1.0 | as above; `Student.has_support_plan` is not kept in step with it (see its dossier) |
| SafeguardingConcern | added in 1.1.0 | as above; readable by `principal` and `counsellor` only, creatable by `teacher` |
| CommunicationLog | added in 1.1.0 | as above; a record of messages, not a sender of them |
| Refund | added in 1.1.0 | as above; no saga moves the invoice when a refund is paid |

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
5. Instalment plans are out of scope; they are real in most schools. (Refunds were out of scope
   when this list was written; revision 1.1.0 added `Refund`.)
6. `Student.has_support_plan` says the support plan "is held outside this system", and
   `SupportPlan` now holds it inside. Derive the flag from active plans, or change its help.
7. Nothing moves a `FeeInvoice` when a `Refund` is paid, so an invoice stays `paid` after its
   money has been returned.
8. A teacher may report a safeguarding concern but cannot read it back, or its outcome.
   How does the reporting teacher learn that action was taken?
