/**
 * Starting the application.
 *
 * Four things have to come up in order, and each can fail in a way worth
 * naming: the Service Worker (the HTTP layer), the backend Worker (the server),
 * the wiring between them (a MessagePort), and Postgres itself, which is ten
 * megabytes of WebAssembly and the slowest step by an order of magnitude.
 *
 * So the boot log is the first screen rather than a spinner. A ten-second wait
 * with a running commentary reads as a database starting; the same ten seconds
 * behind a spinner reads as a broken page, and the difference costs nothing to
 * provide.
 */

const BASE = new URL("./", window.location.href).pathname;

const screen = document.getElementById("boot");
const logElement = document.getElementById("boot-log");
const statusElement = document.getElementById("boot-status");

const steps = [];

/**
 * Say what is happening, to whoever is watching.
 *
 * On its own the boot screen is the audience. Embedded — which is how the
 * hosted generator page runs a freshly compiled application — the page around
 * this frame is showing a progress bar for the whole build, and the slowest
 * phases by far are the four in here. Without this it can only report "started
 * the iframe" and then guess for ten seconds.
 *
 * A `postMessage` to a parent that may not exist costs nothing and is refused by
 * nobody, so the report is unconditional rather than a flag someone has to set.
 */
function report(payload) {
  if (window.parent === window) return;
  try {
    window.parent.postMessage({ source: "erdwithai-boot", ...payload }, "*");
  } catch {
    // A parent on another origin that refuses messages is not a boot failure.
  }
}

function log(message, tone = "info") {
  steps.push({ message, tone });
  const line = document.createElement("div");
  line.className = `boot-line boot-line--${tone}`;
  line.textContent = message;
  logElement.appendChild(line);
  logElement.scrollTop = logElement.scrollHeight;
  report({ type: "log", message, tone });
}

function status(message) {
  statusElement.textContent = message;
  report({ type: "status", status: message });
}

async function main() {
  status("Starting");

  if (!("serviceWorker" in navigator)) {
    throw new Error(
      "This browser has no Service Worker support, which is what serves this application's API. " +
        "Chrome, Edge, Firefox and Safari all have it; a private window in some browsers does not."
    );
  }

  log(`Application root: ${BASE}`);

  // Two ways this page can be reached, and only one of them needs a worker
  // registered here.
  //
  // Served from disk, it registers its own — the ordinary case. Generated
  // inside another page, it is *already* being served by that page's worker,
  // whose scope is wider than this application's: registering again would mean
  // asking a Service Worker to fetch a Service Worker script, which the browser
  // pointedly does not route through it, so the registration would 404 on a
  // file that only exists in the cache.
  const hosted =
    navigator.serviceWorker.controller &&
    !navigator.serviceWorker.controller.scriptURL.endsWith(`${BASE}sw.js`);

  if (hosted) {
    log("Using the host page's HTTP layer", "ok");
  } else {
    log("Registering the HTTP layer (Service Worker)");
    const registration = await navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE });
    await navigator.serviceWorker.ready;

    // A first visit loads before the worker controls the page, and an
    // uncontrolled page's `/api` calls go to the network and 404. Waiting is
    // the difference between "works on reload" and "works".
    if (!navigator.serviceWorker.controller) {
      log("Waiting for the Service Worker to take control");
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
        if (registration.active) registration.active.postMessage({ type: "ping" });
        setTimeout(resolve, 3000);
      });
    }
    log("HTTP layer ready", "ok");
  }

  if (!navigator.serviceWorker.controller) {
    throw new Error(
      "No Service Worker took control of this page, so nothing can answer its /api requests. " +
        "This usually means the page was opened from a file:// URL."
    );
  }

  status("Starting the server");
  log("Starting the backend worker (Node-API shim)");
  const worker = new Worker(`${BASE}host/browser-node-host.js`, { type: "module" });

  const ready = new Promise((resolve, reject) => {
    worker.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.type === "log") log(message.message);
      if (message.type === "ready") resolve(message);
      if (message.type === "error") reject(new Error(`${message.message}\n${message.stack ?? ""}`));
    });
    worker.addEventListener("error", (event) =>
      reject(new Error(event.message || "The backend worker failed to start"))
    );
  });

  const channel = new MessageChannel();
  worker.postMessage({ type: "port", port: channel.port1 }, [channel.port1]);
  navigator.serviceWorker.controller.postMessage(
    { type: "attach", basePath: BASE, port: channel.port2 },
    [channel.port2]
  );
  log("Request pipe attached");

  const ephemeral = new URLSearchParams(window.location.search).has("ephemeral");
  worker.postMessage({
    type: "boot",
    basePath: BASE,
    dataDir: ephemeral ? null : undefined,
  });
  if (ephemeral) log("Running with an in-memory database (?ephemeral)", "warn");

  status("Starting PostgreSQL (WebAssembly)");
  const { project } = await ready;
  log(`${project.name} is up`, "ok");

  status("Loading the interface");
  const { start } = await import(`${BASE}ui/main.js`);
  await start({ basePath: BASE, project });

  report({ type: "running", project: { name: project.name } });
  screen.classList.add("boot--done");
  window.setTimeout(() => screen.remove(), 400);
}

main().catch((error) => {
  console.error(error);
  report({ type: "failed", message: String(error.message || error) });
  status("Could not start");
  screen.classList.add("boot--failed");
  log(String(error.message || error), "error");
  log(
    "This application needs to be opened over http:// or https:// — a Service Worker cannot be " +
      "registered from a file:// URL. Run `npx serve .` in this directory, or `bun run start`.",
    "hint"
  );
});
