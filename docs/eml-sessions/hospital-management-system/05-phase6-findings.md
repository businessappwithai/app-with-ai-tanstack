# Phase 6 — what the generated application says

The model was generated (`bun run wasm generate`, 30 entities, the full NestJS +
TanStack stack) and the three things carried out of Gate D were checked against
what the generator actually wrote, rather than against what I assumed.

## 1 · The handlers — confirmed

All **17 declared hooks** are scaffolded as real modules under
`backend/src/modules/hooks/handlers/`, one file per entity, wired in
`handlers/index.ts`, each with a typed signature and a `// TODO: implement`
body. The file header says it is generated once and never overwritten.

So the six computing handlers exist as code to be written, not as decoration:
`stampInvoiceNumber`, `applyPolicyCoPay`, `applyStockMovement`,
`raiseProcedureCharge`, `decrementStockOnDispense`, `stampEncounterStart`.

Worth stating: **the bodies are empty until someone writes them.** An
unimplemented `applyPolicyCoPay` means the split is never computed — and
`refuseUnbalancedSplit` then refuses to let the invoice be issued. That is the
right failure: the bill cannot go out wrong, it simply cannot go out.

## 2 · Every saga writes a state its machine draws — confirmed, after two fixes

`saga-check.mjs`, 7 state writes, 0 problems. Two edges had to be added to get
there; both are in `04-cross-cutting.md`.

## 3 · The derived rule context — **it is not supplied, and 16 actions depend on it**

This is the finding.

`backend/src/modules/bus/bus.service.ts` calls
`this.rulesService.validate(tableName, data, action)`, and
`rules-engine.service.ts` evaluates the decision graph against
`{ ...data, _operation: action }`. **`data` is the record being written and
nothing else** — no parent row, no child aggregate.

The language says the same thing, and I did not check it against what I was
writing. `ruleNodes.actions.whenForm` in `appwithai-language.json`:

> A zen expression over **the record being written**.

Sixteen of this model's thirty-three actions read something else — a parent's
column or a count of children. `context-check.mjs` lists them:

```
Appointment.refuseClosedList            acceptsNewPatients      (Doctor)
Encounter.requireDiagnosisToClose       diagnosisCount          (children)
Admission.refuseOccupiedBed             bedStatus               (Bed)
Admission.refuseWrongBedType            bedTypeSuitable         (Bed)
Procedure.requireConsentRecord          consentCount            (children)
Procedure.refuseWithdrawnConsent        consentWithdrawn        (children)
Prescription.refuseSelfDispense         hasControlledItem       (children → Medication)
PrescriptionItem.refuseTherapeuticDuplicate  activeSameClassCount (query)
PrescriptionItem.requireSecondCheck     isHighAlert             (Medication)
Invoice.refuseInvalidPolicy             policyValid             (InsurancePolicy)
InvoiceLine.refuseInactiveCharge        chargeIsActive          (ChargeableItem)
Payment.refuseOverpayment               outstandingAmount       (Invoice)
Payment.settleInvoice                   settlesInvoice          (Invoice)
Payment.partPayInvoice                  settlesInvoice          (Invoice)
StockTransaction.refuseNegativeStock    quantityOnHand          (InventoryItem)
StockTransaction.raiseReplenishment     quantityOnHand, reorderLevel, isOnReorder
```

**A comparison against an undefined identifier is false**, so each of these rules
evaluates to *no row matched* on every write. It refuses nothing, triggers
nothing, and says nothing. The decision table is seeded, the rule appears in the
admin screen, the viewer draws it — and it never fires.

Three sagas depend on one of those actions to trigger them, so they are dead
too: `InvoiceSettlement`, `InvoicePartPayment`, `StockReplenishment`.

**Where the assumption came from.** The very first rule I wrote,
`bedAvailabilityGate` at entity 11, read `bedStatus` from the referenced bed. I
recorded it as an assumption at entity 23 and scheduled it for exactly this
check. The check says no.

## 4 · A second, smaller fault the same check found

Three conditions still named the pre-rename columns —
`dispensedByStaffId`, `prescribedByStaffId`, `secondCheckByStaffId` — after the
Gate C-Billing rename to `*_by_id`. They would have been undefined for the same
reason, including the controlled-drug segregation comparison. **Fixed**:
`dispensedById`, `prescribedById`, `secondCheckById`, all three now real columns
of their own row.

## The two scripts

Both read the same `ViewModel` the published viewers draw from, so neither
knows anything the site does not.

- `saga-check.mjs` — every saga state write against its machine.
- `context-check.mjs` — every `when:` identifier against its own entity's columns.

Neither check exists in the checker, and both found real faults. That is a
finding about the protocol as much as about this model.

---

# The repair

Decided at the Phase 6 gate: **fix the model.** The principle it settles on is
one the generated application already implements, and I only had to notice it:

> `bus.service.ts` runs `executeBeforeCreateHooks` (or `executeBeforeUpdateHooks`)
> **and then** `enforceBusinessRules`, and on an update the rules see
> `{ ...current, ...processedData }`.
>
> **So a handler resolves; the rule decides and acts.**

A fact the rule needs that lives on another row is put onto this row by a
handler that runs first. Where that fact deserves to be a column, it becomes
one. Where it does not, the check itself moves into the handler.

## Six facts became columns, and every one earns its place

| Column | Written by | What it saved |
|---|---|---|
| `Prescription.has_controlled_item` | `afterCreate flagControlledPrescription on PrescriptionItem` | The controlled-drug segregation rule — the model's most important control |
| `PrescriptionItem.is_high_alert` | `beforeCreate copyMedicationFlags` | The second-check refusal |
| `Invoice.policy_verified` | `applyPolicyCoPay`, which already reads the policy | The eligibility refusal |
| `Payment.outstanding_before` | `beforeCreate resolveOutstandingBalance` | The overpayment refusal **and both settlement sagas** |
| `StockTransaction.quantity_on_hand_after` | `beforeCreate applyStockBalance` | The negative-stock refusal |
| `StockTransaction.triggers_reorder` | the same handler | The replenishment saga |

None is a flag invented to satisfy a rule. A pharmacy worklist flags a
controlled prescription; an audit asks what the high-alert flag said *when it was
prescribed*; a billing office records that cover was checked; a receipt that
does not say what was owed cannot be reconciled; a stock ledger carries its
running balance. Each was a column the model should have had.

## Seven checks became handlers

`checkDoctorAcceptsNewPatients`, `requireDiagnosisToClose`, `checkBedAvailable`,
`requireConsentBeforeConsented`, `refuseTherapeuticDuplicate`,
`priceInvoiceLine`, and `resolveOutstandingBalance`. Three whole rule sections
went with them — `encounterCloseGate`, `bedAvailabilityGate`,
`procedureConsentGate` — because every action in each was off-row.

**The consent check lost less than it looks.** `ConsentWithdrawal` already takes
a procedure back to `planned` the moment consent is withdrawn, so a withdrawn
consent cannot leave a procedure sitting in `consented` at all. The rule was the
weaker of the two mechanisms.

## What the model is now

```
30 entities · 323 columns · 39 enums · 10 state machines
10 sagas · 18 rules · 27 hooks · 132 access rules
```

Against the published model it replaces: 28 entities, 216 columns, 12 enums,
9 machines, 0 sagas, 8 rules, 17 hooks.

## Verified against the generated application, not against the model text

The application was regenerated and the seeded decision tables were read back
out of `backend/seeds/04_business_rules.ts`:

```
25 seeded conditions checked in the generated application, 0 off-row
27 handler functions scaffolded
7 saga state writes checked, 0 problems
0 errors, 0 warnings, 1 note · scripts/check-model.mjs 20/20
```

The one note is `Department.doctor_id`, the deliberate undrawn edge from entity 1.

## What is still true and unfixed

**Nothing raises `overdue` on a date.** `%%trigger` is `validated` only; the
language has no directive that fires on a clock. Stated in the `Invoice`
dossier, and not closeable in EML today.

**The seven handler bodies are empty.** The generator writes each as a typed
module with a `// TODO: implement` body and never overwrites it. The model
declares them, the application wires them, and a person writes them — which is
the honest boundary between a model and an implementation.
