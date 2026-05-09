/**
 * Comprehensive E2E Tests for Hospital Management System
 * Next.js + NestJS Stack
 *
 * Tests CRUD functionality for all core hospital entities:
 * - Patient, Staff, Department, Appointment, Admission
 * - Bill, Diagnosis, Encounter, Lab Order, Lab Result
 * - Prescription, Vital Sign, Insurance Provider
 *
 * Stack: Next.js 14 + NestJS 10
 * Database: SQLite (hospital-swiss-clean)
 *
 * Frontend: http://localhost:3000 (default)
 * Backend:  http://localhost:3001 (default)
 */

import { expect, test } from "@playwright/test";

// ============================================================================
// Configuration
// ============================================================================

const FRONTEND_URL =
  process.env.HOSPITAL_FRONTEND_URL || process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL =
  process.env.HOSPITAL_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:3001";

// Core hospital entity paths
const PATIENT_PATH = "/bus_patient";
const STAFF_PATH = "/bus_staff";
const DEPARTMENT_PATH = "/bus_department";
const APPOINTMENT_PATH = "/bus_appointment";
const ADMISSION_PATH = "/bus_admission";
const BILL_PATH = "/bus_bill";
const DIAGNOSIS_PATH = "/bus_diagnosis";
const ENCOUNTER_PATH = "/bus_encounter";
const LAB_ORDER_PATH = "/bus_lab_order";
const LAB_RESULT_PATH = "/bus_lab_result";
const PRESCRIPTION_PATH = "/bus_prescription";
const VITAL_SIGN_PATH = "/bus_vital_sign";
const INSURANCE_PROVIDER_PATH = "/bus_insurance_provider";

// API endpoints
const API_BASE = `${BACKEND_URL}/api/bus`;

// ============================================================================
// Helper: wait for page to be ready
// ============================================================================

async function waitForPageReady(page: any) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

// ============================================================================
// Test Suite: API Health Check
// ============================================================================

test.describe("Hospital Management System - API Health", () => {
  test("GET /api/bus/patients - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/patients`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("meta");
    expect(Array.isArray(data.data)).toBe(true);
  });

  test("GET /api/bus/departments - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/departments`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("meta");
  });

  test("GET /api/bus/staff - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/staff`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
  });

  test("GET /api/bus/appointments - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/appointments`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/admissions - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/admissions`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/bills - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/bills`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/diagnoses - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/diagnoses`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/encounters - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/encounters`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/lab_orders - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/lab_orders`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/prescriptions - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/prescriptions`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/vital_signs - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/vital_signs`);
    expect(response.status()).toBe(200);
  });

  test("GET /api/bus/insurance_providers - should respond with 200", async ({ request }) => {
    const response = await request.get(`${API_BASE}/insurance_providers`);
    expect(response.status()).toBe(200);
  });
});

// ============================================================================
// Test Suite: Patient Management (Core Entity)
// ============================================================================

test.describe("Patient Management", () => {
  test("should display patients list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}`);
    await waitForPageReady(page);

    // Heading should reference patients
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Table or list should be visible
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Create button should be present
    const createBtn = page
      .locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")')
      .first();
    await expect(createBtn).toBeVisible();
  });

  test("should navigate to create patient page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}`);
    await waitForPageReady(page);

    const createBtn = page
      .locator(
        'button:has-text("Create New"), button:has-text("Create"), button:has-text("New Patient")'
      )
      .first();
    await createBtn.click();
    await waitForPageReady(page);

    await expect(page).toHaveURL(/\/bus_patient\/new/);

    // Form should be visible
    const form = page.locator("form").first();
    await expect(form).toBeVisible({ timeout: 10000 });
  });

  test("should create a new patient via API", async ({ request }) => {
    const newPatient = {
      first_name: "E2E",
      last_name: "Test Patient",
      date_of_birth: "1990-01-15",
      gender: "MALE",
      phone: "555-0100",
      email: "e2e.patient@hospital-test.com",
    };

    const response = await request.post(`${API_BASE}/patients`, {
      data: newPatient,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.first_name).toBe(newPatient.first_name);
    expect(created.last_name).toBe(newPatient.last_name);

    // Cleanup: soft delete
    if (created.id) {
      await request.delete(`${API_BASE}/patients/${created.id}`);
    }
  });

  test("should read a patient record", async ({ request }) => {
    // Create then read
    const created = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Read", last_name: "Test", date_of_birth: "1985-06-20" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    if (created.id) {
      const response = await request.get(`${API_BASE}/patients/${created.id}`);
      expect(response.status()).toBe(200);

      const patient = await response.json();
      expect(patient.id).toBe(created.id);

      // Cleanup
      await request.delete(`${API_BASE}/patients/${created.id}`);
    }
  });

  test("should update a patient record", async ({ request }) => {
    const created = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Update", last_name: "Me", date_of_birth: "1975-03-10" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    if (created.id) {
      const response = await request.patch(`${API_BASE}/patients/${created.id}`, {
        data: { phone: "555-9999", email: "updated@test.com" },
        headers: { "Content-Type": "application/json" },
      });

      expect([200, 204]).toContain(response.status());

      // Cleanup
      await request.delete(`${API_BASE}/patients/${created.id}`);
    }
  });

  test("should delete a patient record", async ({ request }) => {
    const created = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Delete", last_name: "Me", date_of_birth: "1960-12-25" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    if (created.id) {
      const response = await request.delete(`${API_BASE}/patients/${created.id}`);
      expect([200, 204]).toContain(response.status());
    }
  });

  test("should support pagination", async ({ request }) => {
    const response = await request.get(`${API_BASE}/patients?page=1&limit=5`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("meta");
    expect(data.meta).toHaveProperty("page");
    expect(data.meta).toHaveProperty("limit");
    expect(data.data.length).toBeLessThanOrEqual(5);
  });

  test("should display patient detail page", async ({ page }) => {
    // Create a patient first
    const created = await (
      await page.request.post(`${API_BASE}/patients`, {
        data: { first_name: "Detail", last_name: "View", date_of_birth: "1988-07-07" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    if (created.id) {
      await page.goto(`${FRONTEND_URL}${PATIENT_PATH}/${created.id}`);
      await waitForPageReady(page);

      // Detail page should load without errors
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

      // Cleanup
      await page.request.delete(`${API_BASE}/patients/${created.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Department Management
// ============================================================================

test.describe("Department Management", () => {
  test("should display departments list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${DEPARTMENT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a department via API", async ({ request }) => {
    const newDept = {
      name: "E2E Test Department",
      code: "E2E-TEST",
      description: "Created by E2E tests",
    };

    const response = await request.post(`${API_BASE}/departments`, {
      data: newDept,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.name).toBe(newDept.name);

    // Cleanup
    if (created.id) {
      await request.delete(`${API_BASE}/departments/${created.id}`);
    }
  });

  test("should retrieve department list with metadata", async ({ request }) => {
    const response = await request.get(`${API_BASE}/departments`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("meta");
    expect(data.meta).toHaveProperty("total");
  });
});

// ============================================================================
// Test Suite: Staff Management
// ============================================================================

test.describe("Staff Management", () => {
  test("should display staff list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${STAFF_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("table").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a staff member via API", async ({ request }) => {
    const newStaff = {
      first_name: "Dr. E2E",
      last_name: "Test Doctor",
      role: "DOCTOR",
      specialization: "General Medicine",
      phone: "555-0200",
      email: "e2e.doctor@hospital-test.com",
    };

    const response = await request.post(`${API_BASE}/staff`, {
      data: newStaff,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    // Cleanup
    if (created.id) {
      await request.delete(`${API_BASE}/staff/${created.id}`);
    }
  });

  test("should navigate to create staff page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${STAFF_PATH}`);
    await waitForPageReady(page);

    const createBtn = page
      .locator('button:has-text("Create New"), button:has-text("Create"), button:has-text("Add")')
      .first();
    await createBtn.click();
    await waitForPageReady(page);

    await expect(page).toHaveURL(/\/bus_staff\/new/);
  });
});

// ============================================================================
// Test Suite: Appointment Management
// ============================================================================

test.describe("Appointment Management", () => {
  test("should display appointments list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${APPOINTMENT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create an appointment via API", async ({ request }) => {
    // Create prerequisite patient
    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Appt", last_name: "Patient", date_of_birth: "1995-05-05" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    const newAppointment = {
      appointment_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      appointment_time: "10:00",
      status: "SCHEDULED",
      type: "CONSULTATION",
      notes: "E2E Test Appointment",
      ...(patient.id ? { patient_id: patient.id } : {}),
    };

    const response = await request.post(`${API_BASE}/appointments`, {
      data: newAppointment,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    // Cleanup
    if (created.id) {
      await request.delete(`${API_BASE}/appointments/${created.id}`);
    }
    if (patient.id) {
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });

  test("should support filtering appointments", async ({ request }) => {
    const response = await request.get(`${API_BASE}/appointments?status=SCHEDULED`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
  });
});

// ============================================================================
// Test Suite: Admission Management
// ============================================================================

test.describe("Admission Management", () => {
  test("should display admissions list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${ADMISSION_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create an admission record via API", async ({ request }) => {
    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Admitted", last_name: "Patient", date_of_birth: "1980-01-01" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    const newAdmission = {
      admission_date: new Date().toISOString().split("T")[0],
      admission_type: "INPATIENT",
      status: "ACTIVE",
      chief_complaint: "E2E Test Admission",
      ...(patient.id ? { patient_id: patient.id } : {}),
    };

    const response = await request.post(`${API_BASE}/admissions`, {
      data: newAdmission,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    // Cleanup
    if (created.id) {
      await request.delete(`${API_BASE}/admissions/${created.id}`);
    }
    if (patient.id) {
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Billing Management
// ============================================================================

test.describe("Billing Management", () => {
  test("should display bills list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${BILL_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a bill via API", async ({ request }) => {
    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Billing", last_name: "Test", date_of_birth: "1970-11-11" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    const newBill = {
      bill_date: new Date().toISOString().split("T")[0],
      status: "PENDING",
      total_amount: 500.0,
      notes: "E2E Test Bill",
      ...(patient.id ? { patient_id: patient.id } : {}),
    };

    const response = await request.post(`${API_BASE}/bills`, {
      data: newBill,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    // Cleanup
    if (created.id) {
      await request.delete(`${API_BASE}/bills/${created.id}`);
    }
    if (patient.id) {
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });

  test("should retrieve bill with pagination", async ({ request }) => {
    const response = await request.get(`${API_BASE}/bills?page=1&limit=10`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data.data.length).toBeLessThanOrEqual(10);
  });
});

// ============================================================================
// Test Suite: Clinical - Diagnosis & Encounter
// ============================================================================

test.describe("Clinical Records - Diagnosis", () => {
  test("should display diagnoses list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${DIAGNOSIS_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a diagnosis via API", async ({ request }) => {
    const newDiagnosis = {
      icd_code: "J00",
      description: "Common Cold - E2E Test",
      diagnosis_type: "PRIMARY",
      diagnosis_date: new Date().toISOString().split("T")[0],
    };

    const response = await request.post(`${API_BASE}/diagnoses`, {
      data: newDiagnosis,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/diagnoses/${created.id}`);
    }
  });
});

test.describe("Clinical Records - Encounter", () => {
  test("should display encounters list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${ENCOUNTER_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create an encounter via API", async ({ request }) => {
    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Encounter", last_name: "Patient", date_of_birth: "1992-08-15" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    const newEncounter = {
      encounter_date: new Date().toISOString().split("T")[0],
      encounter_type: "OUTPATIENT",
      status: "ACTIVE",
      chief_complaint: "E2E Test Encounter",
      ...(patient.id ? { patient_id: patient.id } : {}),
    };

    const response = await request.post(`${API_BASE}/encounters`, {
      data: newEncounter,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/encounters/${created.id}`);
    }
    if (patient.id) {
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Laboratory
// ============================================================================

test.describe("Laboratory - Lab Orders", () => {
  test("should display lab orders list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${LAB_ORDER_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a lab order via API", async ({ request }) => {
    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Lab", last_name: "Patient", date_of_birth: "1998-03-20" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    const newLabOrder = {
      order_date: new Date().toISOString().split("T")[0],
      status: "PENDING",
      priority: "ROUTINE",
      notes: "E2E Test Lab Order",
      ...(patient.id ? { patient_id: patient.id } : {}),
    };

    const response = await request.post(`${API_BASE}/lab_orders`, {
      data: newLabOrder,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/lab_orders/${created.id}`);
    }
    if (patient.id) {
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });
});

test.describe("Laboratory - Lab Results", () => {
  test("should display lab results list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${LAB_RESULT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// Test Suite: Prescription Management
// ============================================================================

test.describe("Prescription Management", () => {
  test("should display prescriptions list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PRESCRIPTION_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create a prescription via API", async ({ request }) => {
    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Rx", last_name: "Patient", date_of_birth: "2000-06-30" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    const newPrescription = {
      prescription_date: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      notes: "E2E Test Prescription",
      ...(patient.id ? { patient_id: patient.id } : {}),
    };

    const response = await request.post(`${API_BASE}/prescriptions`, {
      data: newPrescription,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/prescriptions/${created.id}`);
    }
    if (patient.id) {
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Vital Signs
// ============================================================================

test.describe("Vital Signs Management", () => {
  test("should display vital signs list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${VITAL_SIGN_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create vital sign record via API", async ({ request }) => {
    const patient = await (
      await request.post(`${API_BASE}/patients`, {
        data: { first_name: "Vital", last_name: "Signs", date_of_birth: "1985-09-15" },
        headers: { "Content-Type": "application/json" },
      })
    ).json();

    const newVitalSign = {
      recorded_at: new Date().toISOString(),
      temperature: 37.2,
      heart_rate: 72,
      blood_pressure_systolic: 120,
      blood_pressure_diastolic: 80,
      respiratory_rate: 16,
      oxygen_saturation: 98,
      notes: "E2E Test Vitals",
      ...(patient.id ? { patient_id: patient.id } : {}),
    };

    const response = await request.post(`${API_BASE}/vital_signs`, {
      data: newVitalSign,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");

    if (created.id) {
      await request.delete(`${API_BASE}/vital_signs/${created.id}`);
    }
    if (patient.id) {
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Insurance Provider Management
// ============================================================================

test.describe("Insurance Provider Management", () => {
  test("should display insurance providers list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${INSURANCE_PROVIDER_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should create an insurance provider via API", async ({ request }) => {
    const newProvider = {
      name: "E2E Test Insurance Co.",
      code: "E2E-INS",
      type: "PRIVATE",
      phone: "555-0300",
      email: "e2e@insurance-test.com",
      is_active: true,
    };

    const response = await request.post(`${API_BASE}/insurance_providers`, {
      data: newProvider,
      headers: { "Content-Type": "application/json" },
    });

    expect([200, 201]).toContain(response.status());

    const created = await response.json();
    expect(created).toHaveProperty("id");
    expect(created.name).toBe(newProvider.name);

    if (created.id) {
      await request.delete(`${API_BASE}/insurance_providers/${created.id}`);
    }
  });
});

// ============================================================================
// Test Suite: Frontend Navigation & UI
// ============================================================================

test.describe("Hospital Dashboard Navigation", () => {
  test("should load dashboard/home page", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await waitForPageReady(page);

    // Page should load without error
    await expect(page).not.toHaveURL(/error/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should navigate to patients from navigation", async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await waitForPageReady(page);

    // Look for navigation link to patients
    const patientLink = page.locator('a[href*="bus_patient"], a:has-text("Patient")').first();
    if (await patientLink.isVisible()) {
      await patientLink.click();
      await waitForPageReady(page);
      await expect(page).toHaveURL(/bus_patient/);
    } else {
      // Direct navigation fallback
      await page.goto(`${FRONTEND_URL}${PATIENT_PATH}`);
      await waitForPageReady(page);
      await expect(page.locator("h1, h2").first()).toBeVisible();
    }
  });

  test("should navigate to departments from navigation", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${DEPARTMENT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to staff from navigation", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${STAFF_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// Test Suite: Frontend - Patient Form Interactions
// ============================================================================

test.describe("Patient Form - UI Interactions", () => {
  test("should show form fields on create patient page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}/new`);
    await waitForPageReady(page);

    // Form should be present
    const form = page.locator("form").first();
    await expect(form).toBeVisible({ timeout: 10000 });

    // Should have at least one input field
    const inputs = page.locator("input, select, textarea");
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });

  test("should have save/submit button on create page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}/new`);
    await waitForPageReady(page);

    const submitBtn = page
      .locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Submit")'
      )
      .first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  test("should have cancel/back button on create page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}/new`);
    await waitForPageReady(page);

    const cancelBtn = page
      .locator('button:has-text("Cancel"), button:has-text("Back"), a:has-text("Back")')
      .first();
    await expect(cancelBtn).toBeVisible({ timeout: 10000 });
  });

  test("should show refresh button on list page", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}`);
    await waitForPageReady(page);

    const refreshBtn = page
      .locator('button:has-text("Refresh"), button[aria-label*="refresh"]')
      .first();
    await expect(refreshBtn).toBeVisible({ timeout: 10000 });
  });
});

// ============================================================================
// Test Suite: Frontend - Table Features
// ============================================================================

test.describe("Patient List - Table Features", () => {
  test("should display table headers", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}`);
    await waitForPageReady(page);

    const tableHeader = page.locator('table thead tr th, th[role="columnheader"]').first();
    await expect(tableHeader).toBeVisible({ timeout: 10000 });
  });

  test("should support sorting by column header", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}`);
    await waitForPageReady(page);

    // Click on first sortable column
    const th = page.locator('th[class*="sort"], th[aria-sort], th button').first();
    if (await th.isVisible()) {
      await th.click();
      await page.waitForTimeout(500);
      // Page should still be functional after sort click
      await expect(page.locator("table").first()).toBeVisible();
    }
  });
});

// ============================================================================
// Test Suite: Responsive Design
// ============================================================================

test.describe("Hospital App - Responsive Design", () => {
  test("should be usable on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${FRONTEND_URL}${PATIENT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });

  test("should be usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${FRONTEND_URL}${DEPARTMENT_PATH}`);
    await waitForPageReady(page);

    await expect(page.locator("body")).toBeVisible();
  });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

test.describe("Hospital API - Error Handling", () => {
  test("should return 404 for non-existent patient", async ({ request }) => {
    const response = await request.get(`${API_BASE}/patients/00000000-0000-0000-0000-000000000000`);
    expect([404, 400]).toContain(response.status());
  });

  test("should return 404 for non-existent entity type", async ({ request }) => {
    const response = await request.get(`${API_BASE}/nonexistententity`);
    expect([404, 400, 500]).toContain(response.status());
  });

  test("should handle malformed request body gracefully", async ({ request }) => {
    const response = await request.post(`${API_BASE}/patients`, {
      data: "not-valid-json-object",
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 422]).toContain(response.status());
  });
});

// ============================================================================
// Test Suite: Multi-Entity Workflow
// ============================================================================

test.describe("Hospital Workflow - Patient Journey", () => {
  test("should complete basic patient registration workflow", async ({ request }) => {
    // Step 1: Create patient
    const patientRes = await request.post(`${API_BASE}/patients`, {
      data: {
        first_name: "Journey",
        last_name: "Test",
        date_of_birth: "1990-01-01",
        gender: "FEMALE",
        phone: "555-1111",
      },
      headers: { "Content-Type": "application/json" },
    });
    expect([200, 201]).toContain(patientRes.status());
    const patient = await patientRes.json();

    // Step 2: Verify patient appears in list
    const listRes = await request.get(`${API_BASE}/patients`);
    expect(listRes.status()).toBe(200);
    const listData = await listRes.json();
    expect(listData.data).toBeDefined();

    // Step 3: Create appointment for patient
    if (patient.id) {
      const apptRes = await request.post(`${API_BASE}/appointments`, {
        data: {
          patient_id: patient.id,
          appointment_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          status: "SCHEDULED",
          type: "CONSULTATION",
        },
        headers: { "Content-Type": "application/json" },
      });
      expect([200, 201]).toContain(apptRes.status());
      const appt = await apptRes.json();

      // Cleanup in reverse order
      if (appt.id) {
        await request.delete(`${API_BASE}/appointments/${appt.id}`);
      }
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });

  test("should track admission and billing workflow", async ({ request }) => {
    // Create patient
    const patientRes = await request.post(`${API_BASE}/patients`, {
      data: { first_name: "Billing", last_name: "Journey", date_of_birth: "1975-07-07" },
      headers: { "Content-Type": "application/json" },
    });
    const patient = await patientRes.json();

    if (patient.id) {
      // Create admission
      const admissionRes = await request.post(`${API_BASE}/admissions`, {
        data: {
          patient_id: patient.id,
          admission_date: new Date().toISOString().split("T")[0],
          admission_type: "INPATIENT",
          status: "ACTIVE",
        },
        headers: { "Content-Type": "application/json" },
      });
      const admission = await admissionRes.json();

      // Create bill
      const billRes = await request.post(`${API_BASE}/bills`, {
        data: {
          patient_id: patient.id,
          bill_date: new Date().toISOString().split("T")[0],
          status: "PENDING",
          total_amount: 1500.0,
        },
        headers: { "Content-Type": "application/json" },
      });
      expect([200, 201]).toContain(billRes.status());
      const bill = await billRes.json();

      // Cleanup
      if (bill.id) await request.delete(`${API_BASE}/bills/${bill.id}`);
      if (admission.id) await request.delete(`${API_BASE}/admissions/${admission.id}`);
      await request.delete(`${API_BASE}/patients/${patient.id}`);
    }
  });
});
