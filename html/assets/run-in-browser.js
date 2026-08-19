/**
 * The page that generates and runs an application without a server.
 *
 * Three moving parts, in order:
 *
 *   1. A model is read — from `models/*.eml.mmd` beside this page, or from a
 *      file the reader picks. Reading a picked file never leaves the tab.
 *   2. `erdwithai-wasm.js` compiles it. That bundle is built from the same
 *      source the CLI uses, so the application produced here is the application
 *      `erdwithai-wasm generate` would have written.
 *   3. The files are posted to a Service Worker, which serves them as if they
 *      had come off a web server, and an iframe is pointed at the result.
 *
 * The third step is the one worth explaining. The obvious shortcut is to write
 * the application into a blob URL and skip the worker — but then the app's own
 * `fetch("/api/…")` calls have no origin to go to, and the whole property being
 * demonstrated (that this is a server the front end is talking to, not a library
 * it is calling) quietly stops being true. Going through the Service Worker
 * keeps the generated application byte-identical to the one you would deploy.
 */

import { generateFromSource } from "./erdwithai-wasm.js";

const BASE = new URL("wasm-app/run/", window.location.href).pathname;
const SW_URL = new URL("wasm-app/sw.js", window.location.href).pathname;
const SW_SCOPE = new URL("wasm-app/", window.location.href).pathname;

const BUILT_IN = {
  crm: { path: "models/crm.eml.mmd", label: "crm.eml.mmd", name: "Acme CRM" },
  drug: {
    path: "models/drug-discovery.eml.mmd",
    label: "drug-discovery.eml.mmd",
    name: "Drug Discovery",
  },
};

const $ = (id) => document.getElementById(id);

const state = {
  source: "",
  label: "",
  files: null,
  summary: null,
  registration: null,
};

/* ------------------------------------------------------------------ step 1 */

const choices = [
  [$("choice-crm"), "crm"],
  [$("choice-drug"), "drug"],
  [$("choice-upload"), "upload"],
];

for (const [button, kind] of choices) {
  button.addEventListener("click", () => selectChoice(kind));
}

async function selectChoice(kind) {
  for (const [button, candidate] of choices) {
    button.setAttribute("aria-pressed", String(candidate === kind));
  }
  $("dropzone").hidden = kind !== "upload";

  if (kind === "upload") {
    setModel("", "");
    return;
  }

  const built = BUILT_IN[kind];
  setModel("", "");
  try {
    const response = await fetch(built.path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    setModel(await response.text(), built.label);
    $("app-name").value = built.name;
  } catch (error) {
    fail(
      `Could not read <code>${built.path}</code> (${error.message}). ` +
        "This page has to be opened over http:// — from a file:// URL the browser refuses to read " +
        "the model beside it. Try <code>bun run wasm serve html</code>."
    );
  }
}

const dropzone = $("dropzone");
$("file").addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (file) readFile(file);
});
for (const type of ["dragenter", "dragover"]) {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-over");
  });
}
for (const type of ["dragleave", "drop"]) {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-over");
    if (type === "drop" && event.dataTransfer.files[0]) readFile(event.dataTransfer.files[0]);
  });
}

async function readFile(file) {
  const text = await file.text();
  setModel(text, file.name);
  const guessed = file.name.replace(/\.(eml\.)?mmd$|\.md$|\.txt$/i, "").replace(/[-_]+/g, " ");
  if (guessed.trim()) $("app-name").value = titleCase(guessed.trim());
}

function setModel(source, label) {
  state.source = source;
  state.label = label;
  state.files = null;
  state.summary = null;

  $("download").disabled = true;
  $("result").className = "result";
  $("result").innerHTML = "";

  const summary = $("model-summary");
  const preview = $("preview");

  if (!source) {
    summary.hidden = true;
    preview.hidden = true;
    setStep("step-generate", "idle");
    setStep("step-run", "idle");
    return;
  }

  summary.hidden = false;
  summary.innerHTML =
    `<code>${escapeHtml(label)}</code> · ${source.split("\n").length.toLocaleString()} lines · ` +
    `${(new Blob([source]).size / 1024).toFixed(0)}KB`;

  preview.hidden = false;
  preview.open = false;
  $("preview-code").textContent = source;

  setStep("step-model", "done");
  setStep("step-generate", "active");
  setStep("step-run", "idle");
}

/* ------------------------------------------------------------------ step 2 */

$("generate").addEventListener("click", () => {
  if (!state.source) {
    fail("Choose a model first.");
    return;
  }

  const button = $("generate");
  button.disabled = true;
  button.innerHTML = '<span class="working"></span>Generating';

  // A frame so the button's state paints before the compiler blocks the thread.
  // Generation is milliseconds on a small model and long enough to notice on a
  // large one, and a button that never showed it was pressed reads as broken.
  requestAnimationFrame(() => {
    try {
      const result = generateFromSource({
        source: state.source,
        name: $("app-name").value.trim() || "Generated App",
        adminEmail: $("admin-email").value.trim() || "admin@admin.com",
        adminPassword: $("admin-password").value || "admin",
        adminName: ($("admin-email").value.split("@")[0] || "admin").trim(),
        pgliteUrl: state.pgliteUrl,
      });

      state.files = result.files;
      state.summary = result.summary;
      showResult(result);
      $("download").disabled = false;
      setStep("step-generate", "done");
      setStep("step-run", "active");
    } catch (error) {
      fail(escapeHtml(error.message));
      setStep("step-run", "idle");
    } finally {
      button.disabled = false;
      button.textContent = "Generate";
    }
  });
});

function showResult(result) {
  const { summary, warnings } = result;
  const box = $("result");

  box.innerHTML = `
    <div class="tally">
      ${cell(summary.entities.length, "Entities")}
      ${cell(summary.relationships, "Relationships")}
      ${cell(summary.rules.length, "Rules")}
      ${cell(summary.workflows.length + summary.sagas.length, "Processes")}
      ${cell(summary.hooks, "Hooks")}
      ${cell(summary.accessRules, "Access rules")}
      ${cell(summary.fileCount, "Files")}
      ${cell(`${(summary.bytes / 1024).toFixed(0)}KB`, "Size")}
    </div>

    <h4>Entities</h4>
    <div class="chips">${summary.entities.map((name) => chip(name)).join("")}</div>

    ${summary.categories.length ? `<h4>Groups</h4><div class="chips">${summary.categories.map((name) => chip(name)).join("")}</div>` : ""}
    ${summary.rules.length ? `<h4>Rules</h4><div class="chips">${summary.rules.map((name) => chip(name, "rule")).join("")}</div>` : ""}
    ${
      summary.workflows.length || summary.sagas.length
        ? `<h4>Processes</h4><div class="chips">${[...summary.workflows, ...summary.sagas]
            .map((name) => chip(name, "flow"))
            .join("")}</div>`
        : ""
    }

    ${
      warnings.length
        ? `<div class="warnings"><b>${warnings.length} thing${warnings.length === 1 ? "" : "s"} the compiler skipped</b>
             <ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></div>`
        : ""
    }

    <details class="preview"><summary>All ${summary.fileCount} files</summary>
      <div class="filelist">
        ${Object.entries(state.files)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(
            ([name, contents]) =>
              `<div><span>${escapeHtml(name)}</span><span>${(contents.length / 1024).toFixed(1)}KB</span></div>`
          )
          .join("")}
      </div>
    </details>`;

  box.classList.add("is-shown");
}

const cell = (value, label) =>
  `<div class="tally__cell"><span class="tally__value">${value}</span><span class="tally__label">${label}</span></div>`;
const chip = (name, kind = "") =>
  `<span class="chip${kind ? ` chip--${kind}` : ""}">${escapeHtml(name)}</span>`;

function fail(html) {
  const box = $("result");
  box.innerHTML = `<div class="failure">${html}</div>`;
  box.classList.add("is-shown");
}

/**
 * Hand the reader the generated application.
 *
 * A zip would be nicer and would mean shipping a zip encoder to a page whose
 * whole point is that it has no dependencies. A single self-extracting shell
 * script is the honest trade: it is readable before it is run, which a zip is
 * not.
 */
$("download").addEventListener("click", () => {
  if (!state.files) return;
  const name = ($("app-name").value.trim() || "generated-app")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const script = [
    "#!/bin/sh",
    "# Generated by ERDwithAI (browser stack). Writes the application into ./" + name,
    "# Read it before you run it; every file below is plain text.",
    "set -e",
    `mkdir -p "${name}"`,
    `cd "${name}"`,
    "",
    ...Object.entries(state.files).flatMap(([path, contents]) => [
      `mkdir -p "$(dirname "${path}")"`,
      `cat > "${path}" <<'ERDWITHAI_EOF'`,
      contents.replace(/\r/g, ""),
      "ERDWITHAI_EOF",
      "",
    ]),
    `echo "Wrote ${Object.keys(state.files).length} files into ${name}/"`,
    `echo "Serve it over http (a Service Worker cannot start from file://):"`,
    `echo "  npx serve ${name}"`,
    "",
  ].join("\n");

  const url = URL.createObjectURL(new Blob([script], { type: "text/x-shellscript" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.sh`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* ------------------------------------------------------------------ step 3 */

$("run").addEventListener("click", () => run(false));
$("reset").addEventListener("click", () => run(true));

async function run(fresh) {
  if (!state.files) {
    fail("Generate the application first.");
    return;
  }

  const button = $("run");
  button.disabled = true;
  button.innerHTML = '<span class="working"></span>Starting';

  const log = $("log");
  log.hidden = false;
  log.innerHTML = "";

  try {
    say("Registering the HTTP layer");
    const registration = await ensureServiceWorker();
    say("Service Worker active", "ok");

    say(`Mounting ${Object.keys(state.files).length} files at ${BASE}`);
    const mounted = await ask(registration.active, {
      type: "mount",
      basePath: BASE,
      files: state.files,
    });
    if (!mounted.ok) throw new Error(mounted.error || "the Service Worker refused the files");
    say(`Mounted ${mounted.files} files`, "ok");

    say(
      "Starting the application — Postgres is about ten megabytes of WebAssembly, so give it a moment"
    );

    const frame = $("frame");
    const url = `${BASE}index.html${fresh ? "?ephemeral" : ""}`;
    frame.src = "about:blank";
    // A frame so the blank navigation commits first; assigning twice in one
    // task leaves the iframe on the old document with the new URL in its bar.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    frame.src = url;

    $("stage").classList.add("is-shown");
    $("stage-url").textContent = new URL(url, window.location.href).href;
    $("reset").hidden = false;

    $("credentials").hidden = false;
    $("credentials").innerHTML =
      `Sign in as <b>${escapeHtml($("admin-email").value.trim() || "admin@admin.com")}</b> ` +
      `with the password <b>${escapeHtml($("admin-password").value || "admin")}</b>. ` +
      (fresh
        ? "This run uses a fresh in-memory database."
        : "The database persists in this browser, so a reload picks up where you left off.");

    setStep("step-run", "done");
    $("stage").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    say(error.message, "bad");
    say(
      "This page needs to be served over http:// or https:// — a Service Worker cannot be registered " +
        "from a file:// URL.",
      "bad"
    );
  } finally {
    button.disabled = false;
    button.textContent = "Run the application";
  }
}

/**
 * Register the worker and wait for it to be genuinely active.
 *
 * `navigator.serviceWorker.ready` is the usual way and is wrong here: it
 * resolves with the registration controlling *this* page, and this page sits
 * outside the worker's scope on purpose — the worker serves the generated
 * application, not the guide around it. So the activation is watched directly.
 */
async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error(
      "This browser has no Service Worker support, which is what serves the application."
    );
  }

  const registration =
    state.registration || (await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }));
  state.registration = registration;

  if (registration.active) return registration;

  const pending = registration.installing || registration.waiting;
  if (!pending) throw new Error("The Service Worker registered but never started");

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The Service Worker did not activate")), 15000);
    pending.addEventListener("statechange", () => {
      if (pending.state === "activated") {
        clearTimeout(timer);
        resolve();
      }
      if (pending.state === "redundant") {
        clearTimeout(timer);
        reject(new Error("The Service Worker was discarded before it activated"));
      }
    });
  });

  return registration;
}

/** postMessage with an answer, over a one-shot channel. */
function ask(worker, message, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(
      () => reject(new Error("The Service Worker did not answer")),
      timeoutMs
    );
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data);
    };
    worker.postMessage(message, [channel.port2]);
  });
}

$("open-tab").addEventListener("click", () => {
  window.open($("stage-url").textContent, "_blank", "noopener");
});

/* -------------------------------------------------------------------- bits */

function setStep(id, value) {
  $(id).dataset.state = value;
}

function say(message, tone = "") {
  const log = $("log");
  const line = document.createElement("div");
  line.className = tone;
  line.innerHTML = tone === "ok" ? `<b>${escapeHtml(message)}</b>` : escapeHtml(message);
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
  );
}

const titleCase = (value) => value.replace(/\b\w/g, (character) => character.toUpperCase());

/**
 * Prefer a locally served PGlite when one has been placed beside this page.
 *
 * Seventeen megabytes of WebAssembly does not belong in a documentation folder,
 * so the default is the CDN — but `bun run vendor:pglite` puts a copy under
 * `assets/vendor/`, and a page that finds one should use it: it is faster, and
 * it makes the whole demonstration work with the network off.
 */
async function findLocalPglite() {
  try {
    const url = new URL("assets/vendor/pglite/index.js", window.location.href).href;
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      state.pgliteUrl = url;
      say(`Using the local PostgreSQL build at ${url}`);
    }
  } catch {
    // The CDN default stands.
  }
}

await findLocalPglite();
await selectChoice("crm");
