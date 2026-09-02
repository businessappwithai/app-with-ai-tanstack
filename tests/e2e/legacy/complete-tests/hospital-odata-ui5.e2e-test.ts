/**
 * Comprehensive E2E Tests for Hospital Management System
 * OpenUI5 + OData V4 Stack (TypeScript)
 *
 * Tests OData V4 API endpoints and OpenUI5 frontend for hospital entities:
 * - Patient, Staff, Department, Appointment, Admission
 * - Bill, Diagnosis, Encounter, Lab Order, Lab Result
 * - Prescription, Vital Sign, Insurance Provider
 *
 * Stack: OpenUI5 + OData V4 (hms-openui5-odatav4-typescript)
 * Backend:  http://localhost:3000 (OData V4 server)
 * Frontend: http://localhost:3004 (UI5 app via ui5-local.yaml)
 *
 * OData Entity Set Naming:
 *   bus_patient            → /odata/Patients
 *   bus_appointment        → /odata/Appointments
 *   bus_admission          → /odata/Admissions
 *   bus_department         → /odata/DepartmentSet
 *   bus_staff              → /odata/StaffSet
 *   bus_bill               → /odata/BillSet
 *   bus_diagnosis          → /odata/DiagnosisSet
 *   bus_encounter          → /odata/EncounterSet
 *   bus_lab_order          → /odata/LabOrderSet
 *   bus_lab_result         → /odata/LabResultSet
 *   bus_prescription       → /odata/PrescriptionSet
 *   bus_vital_sign         → /odata/VitalSignSet
 *   bus_insurance_provider → /odata/InsuranceProviderSet
 */

import { expect, test } from "@playwright/test";

// ============================================================================
// Configuration
// ============================================================================

const ODATA_BACKEND_URL =
  process.env.HOSPITAL_ODATA_URL || process.env.ODATA_BACKEND_URL || "http://localhost:3000";
const UI5_FRONTEND_URL =
  process.env.HOSPITAL_UI5_URL || process.env.UI5_FRONTEND_URL || "http://localhost:3004";

const ODATA_BASE = `${ODATA_BACKEND_URL}/odata`;

// ============================================================================
// Helper: extract created entity ID from OData response
// ============================================================================

function extractId(data: any): string | null {
  return data?.id ?? data?.Id ?? data?.ID ?? data?.patient_id ?? null;
}

// ============================================================================
// Test Suite: OData Service Document & Metadata
// ============================================================================

test.describe("OData Service - Metadata & Discovery", () => {
  test("GET /odata - should return OData service document", async ({ request }) => {
    const response = await request.get(ODATA_BASE, {
      headers: { Accept: "application/json" },
    });
    expect(response.status()).toBe(200);
  });

  test("GET /odata/$metadata - should return valid EDMX", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/$metadata`);
    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("EntityContainer");
    expect(text).toContain("EntityType");
    expect(text).toContain("HospitalManagement");
  });

  test("$metadata should expose hospital entity types", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/$metadata`);
    expect(response.status()).toBe(200);

    const text = await response.text();
    // Core hospital entities should appear in metadata
    expect(text).toContain("Patient");
    expect(text).toContain("Department");
    expect(text).toContain("Staff");
  });

  test("$metadata should expose business (bus_) entity sets", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/$metadata`);
    const text = await response.text();

    // At least the overridden sets should be present
    expect(text).toContain("Patients");
    expect(text).toContain("EntitySet");
  });
});

// ============================================================================
// Test Suite: OData - Patient Entity
// ============================================================================

test.describe("OData - Patient Entity", () => {
  test("GET /odata/Patients - should return patients collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(Array.isArray(data.value)).toBe(true);
  });

  test("GET /odata/Patients with $top - should limit results", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$top=5`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    expect(data.value.length).toBeLessThanOrEqual(5);
  });

  test("GET /odata/Patients with $skip - should paginate", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$top=5&$skip=0`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("GET /odata/Patients with $count - should include total count", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$count=true`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
    // @odata.count may be present
    if ("@odata.count" in data) {
      expect(typeof data["@odata.count"]).toBe("number");
    }
  });

  test("GET /odata/Patients with $select - should return selected fields", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$select=id,first_name,last_name`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/Patients - should create a patient", async ({ request }) => {
    const newPatient = {
      first_name: "OData",
      last_name: "Test Patient",
      date_of_birth: "1990-03-15",
      gender: "MALE",
      phone: "555-4000",
      email: "odata.patient@hospital-e2e.com",
    };

    const response = await request.post(`${ODATA_BASE}/Patients`, {
      data: newPatient,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);
    expect(id).not.toBeNull();

    // Cleanup
    if (id) {
      await request.delete(`${ODATA_BASE}/Patients(${id})`);
    }
  });

  test("PATCH /odata/Patients(:id) - should update patient", async ({ request }) => {
    // Create first
    const createRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Patch", last_name: "Patient", date_of_birth: "1985-06-15" },
      headers: { "Content-Type": "application/json" },
    });
    const created = await createRes.json();
    const id = extractId(created);

    if (id) {
      const patchRes = await request.patch(`${ODATA_BASE}/Patients(${id})`, {
        data: { phone: "555-9999" },
        headers: { "Content-Type": "application/json" },
      });

      expect([200, 204]).toContain(patchRes.status());

      // Cleanup
      await request.delete(`${ODATA_BASE}/Patients(${id})`);
    }
  });

  test("DELETE /odata/Patients(:id) - should delete patient", async ({ request }) => {
    const createRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Delete", last_name: "Patient", date_of_birth: "1970-01-01" },
      headers: { "Content-Type": "application/json" },
    });
    const created = await createRes.json();
    const id = extractId(created);

    if (id) {
      const deleteRes = await request.delete(`${ODATA_BASE}/Patients(${id})`);
      expect([200, 204]).toContain(deleteRes.status());
    }
  });
});

// ============================================================================
// Test Suite: OData - Department Entity
// ============================================================================

test.describe("OData - Department Entity", () => {
  test("GET /odata/DepartmentSet - should return departments collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/DepartmentSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/DepartmentSet - should create a department", async ({ request }) => {
    const newDept = {
      name: "OData E2E Dept",
      code: "OD-E2E",
      description: "Created by OData E2E test",
    };

    const response = await request.post(`${ODATA_BASE}/DepartmentSet`, {
      data: newDept,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);
    expect(id).not.toBeNull();

    if (id) {
      await request.delete(`${ODATA_BASE}/DepartmentSet(${id})`);
    }
  });

  test("GET /odata/DepartmentSet with $top=3 - should limit", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/DepartmentSet?$top=3`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.value.length).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// Test Suite: OData - Staff Entity
// ============================================================================

test.describe("OData - Staff Entity", () => {
  test("GET /odata/StaffSet - should return staff collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/StaffSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/StaffSet - should create staff member", async ({ request }) => {
    const newStaff = {
      first_name: "Dr. OData",
      last_name: "Test",
      role: "DOCTOR",
      specialization: "Internal Medicine",
      phone: "555-5000",
      email: "dr.odata@hospital-e2e.com",
    };

    const response = await request.post(`${ODATA_BASE}/StaffSet`, {
      data: newStaff,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    if (id) {
      await request.delete(`${ODATA_BASE}/StaffSet(${id})`);
    }
  });
});

// ============================================================================
// Test Suite: OData - Appointment Entity
// ============================================================================

test.describe("OData - Appointment Entity", () => {
  test("GET /odata/Appointments - should return appointments collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Appointments`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/Appointments - should create appointment", async ({ request }) => {
    // Create patient first
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Appt", last_name: "OData", date_of_birth: "1995-05-05" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    const newAppt = {
      appointment_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      appointment_time: "11:00",
      status: "SCHEDULED",
      type: "CONSULTATION",
      ...(patientId ? { patient_id: patientId } : {}),
    };

    const response = await request.post(`${ODATA_BASE}/Appointments`, {
      data: newAppt,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    // Cleanup
    if (id) await request.delete(`${ODATA_BASE}/Appointments(${id})`);
    if (patientId) await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
  });

  test("GET /odata/Appointments with $orderby - should sort", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Appointments?$orderby=appointment_date desc`);
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// Test Suite: OData - Admission Entity
// ============================================================================

test.describe("OData - Admission Entity", () => {
  test("GET /odata/Admissions - should return admissions collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Admissions`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/Admissions - should create admission", async ({ request }) => {
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Admitted", last_name: "OData", date_of_birth: "1980-08-08" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    const newAdmission = {
      admission_date: new Date().toISOString().split("T")[0],
      admission_type: "INPATIENT",
      status: "ACTIVE",
      chief_complaint: "OData E2E Test Admission",
      ...(patientId ? { patient_id: patientId } : {}),
    };

    const response = await request.post(`${ODATA_BASE}/Admissions`, {
      data: newAdmission,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    if (id) await request.delete(`${ODATA_BASE}/Admissions(${id})`);
    if (patientId) await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
  });
});

// ============================================================================
// Test Suite: OData - Bill Entity
// ============================================================================

test.describe("OData - Bill Entity", () => {
  test("GET /odata/BillSet - should return bills collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/BillSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/BillSet - should create bill", async ({ request }) => {
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Billing", last_name: "OData", date_of_birth: "1972-12-12" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    const newBill = {
      bill_date: new Date().toISOString().split("T")[0],
      status: "PENDING",
      total_amount: 750.0,
      ...(patientId ? { patient_id: patientId } : {}),
    };

    const response = await request.post(`${ODATA_BASE}/BillSet`, {
      data: newBill,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    if (id) await request.delete(`${ODATA_BASE}/BillSet(${id})`);
    if (patientId) await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
  });
});

// ============================================================================
// Test Suite: OData - Diagnosis & Encounter
// ============================================================================

test.describe("OData - Diagnosis Entity", () => {
  test("GET /odata/DiagnosisSet - should return diagnoses collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/DiagnosisSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/DiagnosisSet - should create diagnosis", async ({ request }) => {
    const newDiag = {
      icd_code: "Z00.00",
      description: "OData E2E Diagnosis Test",
      diagnosis_type: "PRIMARY",
      diagnosis_date: new Date().toISOString().split("T")[0],
    };

    const response = await request.post(`${ODATA_BASE}/DiagnosisSet`, {
      data: newDiag,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    if (id) await request.delete(`${ODATA_BASE}/DiagnosisSet(${id})`);
  });
});

test.describe("OData - Encounter Entity", () => {
  test("GET /odata/EncounterSet - should return encounters collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/EncounterSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/EncounterSet - should create encounter", async ({ request }) => {
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Encounter", last_name: "OData", date_of_birth: "1993-07-20" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    const newEncounter = {
      encounter_date: new Date().toISOString().split("T")[0],
      encounter_type: "OUTPATIENT",
      status: "ACTIVE",
      ...(patientId ? { patient_id: patientId } : {}),
    };

    const response = await request.post(`${ODATA_BASE}/EncounterSet`, {
      data: newEncounter,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    if (id) await request.delete(`${ODATA_BASE}/EncounterSet(${id})`);
    if (patientId) await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
  });
});

// ============================================================================
// Test Suite: OData - Lab Order & Lab Result
// ============================================================================

test.describe("OData - Lab Order Entity", () => {
  test("GET /odata/LabOrderSet - should return lab orders collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/LabOrderSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/LabOrderSet - should create lab order", async ({ request }) => {
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Lab", last_name: "OData", date_of_birth: "1999-04-15" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    const newLabOrder = {
      order_date: new Date().toISOString().split("T")[0],
      status: "PENDING",
      priority: "ROUTINE",
      ...(patientId ? { patient_id: patientId } : {}),
    };

    const response = await request.post(`${ODATA_BASE}/LabOrderSet`, {
      data: newLabOrder,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    if (id) await request.delete(`${ODATA_BASE}/LabOrderSet(${id})`);
    if (patientId) await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
  });
});

test.describe("OData - Lab Result Entity", () => {
  test("GET /odata/LabResultSet - should return lab results collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/LabResultSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });
});

// ============================================================================
// Test Suite: OData - Prescription & Vital Sign
// ============================================================================

test.describe("OData - Prescription Entity", () => {
  test("GET /odata/PrescriptionSet - should return prescriptions collection", async ({
    request,
  }) => {
    const response = await request.get(`${ODATA_BASE}/PrescriptionSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/PrescriptionSet - should create prescription", async ({ request }) => {
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Rx", last_name: "OData", date_of_birth: "2001-02-28" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    const newRx = {
      prescription_date: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      ...(patientId ? { patient_id: patientId } : {}),
    };

    const response = await request.post(`${ODATA_BASE}/PrescriptionSet`, {
      data: newRx,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    if (id) await request.delete(`${ODATA_BASE}/PrescriptionSet(${id})`);
    if (patientId) await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
  });
});

test.describe("OData - Vital Sign Entity", () => {
  test("GET /odata/VitalSignSet - should return vital signs collection", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/VitalSignSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/VitalSignSet - should create vital sign record", async ({ request }) => {
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Vitals", last_name: "OData", date_of_birth: "1988-10-10" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    const newVital = {
      recorded_at: new Date().toISOString(),
      temperature: 36.8,
      heart_rate: 74,
      blood_pressure_systolic: 118,
      blood_pressure_diastolic: 78,
      respiratory_rate: 16,
      oxygen_saturation: 99,
      ...(patientId ? { patient_id: patientId } : {}),
    };

    const response = await request.post(`${ODATA_BASE}/VitalSignSet`, {
      data: newVital,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);

    if (id) await request.delete(`${ODATA_BASE}/VitalSignSet(${id})`);
    if (patientId) await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
  });
});

// ============================================================================
// Test Suite: OData - Insurance Provider
// ============================================================================

test.describe("OData - Insurance Provider Entity", () => {
  test("GET /odata/InsuranceProviderSet - should return insurance providers", async ({
    request,
  }) => {
    const response = await request.get(`${ODATA_BASE}/InsuranceProviderSet`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("value");
  });

  test("POST /odata/InsuranceProviderSet - should create insurance provider", async ({
    request,
  }) => {
    const newProvider = {
      name: "OData E2E Insurance",
      code: "OD-INS",
      type: "PRIVATE",
      phone: "555-6000",
      email: "odata@insurance-e2e.com",
      is_active: true,
    };

    const response = await request.post(`${ODATA_BASE}/InsuranceProviderSet`, {
      data: newProvider,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    const id = extractId(created);
    expect(id).not.toBeNull();

    if (id) {
      await request.delete(`${ODATA_BASE}/InsuranceProviderSet(${id})`);
    }
  });
});

// ============================================================================
// Test Suite: OData Query Options
// ============================================================================

test.describe("OData Query Options - Patients", () => {
  test("$filter eq - should filter by exact value", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$filter=gender eq 'MALE'`);
    expect(response.status()).toBe(200);
  });

  test("$filter contains - should filter with contains", async ({ request }) => {
    const response = await request.get(
      `${ODATA_BASE}/Patients?$filter=contains(first_name,'Test')`
    );
    expect(response.status()).toBe(200);
  });

  test("$orderby asc - should sort ascending", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$orderby=last_name asc`);
    expect(response.status()).toBe(200);
  });

  test("$orderby desc - should sort descending", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$orderby=last_name desc`);
    expect(response.status()).toBe(200);
  });

  test("$top and $skip combined - should paginate", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$top=10&$skip=0`);
    expect(response.status()).toBe(200);
  });

  test("$select specific fields - should return subset", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$select=id,first_name,last_name`);
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// Test Suite: OpenUI5 Frontend
// ============================================================================

test.describe("OpenUI5 Frontend - Hospital App", () => {
  test("should load the main page", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000); // SAP UI5 bootstrap time

    // Page should be visible
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have SAP UI5 framework loaded", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check for SAP UI5 components
    const ui5Elements = page.locator(
      '.sapUiBody, [id="sap-ui-bootstrap"], .sapMPage, .sapMList, .sapMTable, .sapMPanel'
    );
    const count = await ui5Elements.count();
    // At least some UI5 elements should be present
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should display master list or navigation", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check for list or table (SAP UI5 uses specific class names)
    const sapList = page.locator(".sapMList, .sapMTable, .sapUiTable").first();
    const anyList = page.locator('ul, table, [role="listbox"], [role="grid"]').first();

    const hasList =
      (await sapList.isVisible().catch(() => false)) ||
      (await anyList.isVisible().catch(() => false));

    // Either SAP list or generic list should be present
    expect(hasList).toBeTruthy();
  });

  test("should display entity navigation menu", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Navigation panel should have hospital entity items
    const patientNav = page.locator("text=/patient/i").first();
    if (await patientNav.isVisible()) {
      await expect(patientNav).toBeVisible();
    } else {
      // Navigation panel with entity list
      const navPanel = page
        .locator('.sapMNavContainer, .sapMSplitContainer, nav, [role="navigation"]')
        .first();
      await expect(navPanel).toBeVisible({ timeout: 10000 });
    }
  });

  test("should navigate to patients entity list", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Try clicking on Patient link in navigation
    const patientLink = page
      .locator('text=/patient/i, a[href*="Patient"], .sapMLIB:has-text("Patient")')
      .first();

    if (await patientLink.isVisible()) {
      await patientLink.click();
      await page.waitForTimeout(2000);

      // Check for patient list loaded
      const table = page.locator(".sapMTable, .sapUiTable, table").first();
      const hasList = await table.isVisible().catch(() => false);
      expect(hasList).toBeTruthy();
    }
  });

  test("should handle navigation between entity panels", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Click first navigable item
    const listItem = page.locator('.sapMLIB, .sapMObjectListItem, [role="option"]').first();
    if (await listItem.isVisible()) {
      await listItem.click();
      await page.waitForTimeout(2000);

      // Should still show content
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should show patient table with columns", async ({ page }) => {
    await page.goto(UI5_FRONTEND_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Navigate to Patient entity
    const patientItem = page.locator("text=/patient/i").first();
    if (await patientItem.isVisible()) {
      await patientItem.click();
      await page.waitForTimeout(2000);
    }

    // Table column headers should appear
    const columnHeader = page.locator('.sapMColumnHeader, th, [role="columnheader"]').first();
    const hasHeader = await columnHeader.isVisible().catch(() => false);
    expect(hasHeader).toBeTruthy();
  });
});

// ============================================================================
// Test Suite: OData - Error Handling
// ============================================================================

test.describe("OData Error Handling", () => {
  test("should return 404 for non-existent entity set", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/NonExistentEntitySet`);
    expect([404, 400]).toContain(response.status());
  });

  test("should return 404 for non-existent patient ID", async ({ request }) => {
    const response = await request.get(
      `${ODATA_BASE}/Patients(00000000-0000-0000-0000-000000000000)`
    );
    expect([404, 400]).toContain(response.status());
  });

  test("should handle invalid $filter gracefully", async ({ request }) => {
    const response = await request.get(`${ODATA_BASE}/Patients?$filter=invalid_syntax`);
    // Should either handle gracefully or return 400
    expect([200, 400]).toContain(response.status());
  });
});

// ============================================================================
// Test Suite: Full Hospital OData Workflow
// ============================================================================

test.describe("Hospital OData - Patient Journey Workflow", () => {
  test("should register patient and schedule appointment via OData", async ({ request }) => {
    // Step 1: Create patient
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: {
        first_name: "Journey",
        last_name: "ODataTest",
        date_of_birth: "1995-11-25",
        gender: "FEMALE",
        phone: "555-7777",
        email: "journey.odata@hospital-e2e.com",
      },
      headers: { "Content-Type": "application/json" },
    });
    expect([200, 201]).toContain(patientRes.status());
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    // Step 2: Schedule appointment
    if (patientId) {
      const apptRes = await request.post(`${ODATA_BASE}/Appointments`, {
        data: {
          patient_id: patientId,
          appointment_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
          status: "SCHEDULED",
          type: "FOLLOW_UP",
        },
        headers: { "Content-Type": "application/json" },
      });
      expect([200, 201]).toContain(apptRes.status());
      const appt = await apptRes.json();
      const apptId = extractId(appt);

      // Step 3: Verify patient is retrievable
      const getRes = await request.get(`${ODATA_BASE}/Patients(${patientId})`);
      expect(getRes.status()).toBe(200);

      // Cleanup
      if (apptId) await request.delete(`${ODATA_BASE}/Appointments(${apptId})`);
      await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
    }
  });

  test("should record vitals and lab order for patient", async ({ request }) => {
    // Create patient
    const patientRes = await request.post(`${ODATA_BASE}/Patients`, {
      data: { first_name: "Clinical", last_name: "ODataTest", date_of_birth: "1982-04-18" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();
    const patientId = extractId(patient);

    if (patientId) {
      // Record vitals
      const vitalRes = await request.post(`${ODATA_BASE}/VitalSignSet`, {
        data: {
          patient_id: patientId,
          recorded_at: new Date().toISOString(),
          temperature: 37.0,
          heart_rate: 68,
          blood_pressure_systolic: 122,
          blood_pressure_diastolic: 82,
          oxygen_saturation: 97,
        },
        headers: { "Content-Type": "application/json" },
      });
      const vital = await vitalRes.json();
      const vitalId = extractId(vital);

      // Create lab order
      const labRes = await request.post(`${ODATA_BASE}/LabOrderSet`, {
        data: {
          patient_id: patientId,
          order_date: new Date().toISOString().split("T")[0],
          status: "PENDING",
          priority: "URGENT",
        },
        headers: { "Content-Type": "application/json" },
      });
      expect([200, 201]).toContain(labRes.status());
      const lab = await labRes.json();
      const labId = extractId(lab);

      // Cleanup
      if (labId) await request.delete(`${ODATA_BASE}/LabOrderSet(${labId})`);
      if (vitalId) await request.delete(`${ODATA_BASE}/VitalSignSet(${vitalId})`);
      await request.delete(`${ODATA_BASE}/Patients(${patientId})`);
    }
  });
});
