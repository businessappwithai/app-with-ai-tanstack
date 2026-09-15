/**
 * The theme: light, dark, or whatever the machine says.
 *
 * One attribute on `<html>`. `styles.css` states the whole palette twice —
 * once as `:root` and once under `[data-theme="dark"]` — and every rule in it
 * resolves its colours through those custom properties, so setting the
 * attribute is the entire mechanism. Screens, panels, grids, forms, the
 * reporting application and the toasts all follow with nothing to opt into.
 *
 * It used to be `@media (prefers-color-scheme: dark)` and nothing else, which
 * is not a mode: a reader who wanted the other one had to change their
 * operating system. The preference is still honoured — it is what `system`
 * resolves to, and the default when nothing has been chosen — but it is now
 * one of three answers rather than the only one.
 *
 * `index.html` applies the stored choice before first paint, in a blocking
 * script that duplicates `paintTheme` below because it has to run before any
 * module has loaded. Keep the two in step.
 *
 * This is a module of its own rather than part of `main.js` so that the
 * sign-in screen and the reporting application can offer the control without
 * importing the shell that renders them.
 */

import { el, mount } from "./dom.js";

/** Per browser, not per account: the choice belongs to the screen being read. */
const THEME_STORAGE_KEY = "appwithai.theme";

/**
 * `?theme=light|dark|system` — the default a host embedding this application
 * asks for, honoured only until the reader chooses for themselves.
 *
 * The guide runs a freshly generated application in an iframe on a near-black
 * page. Left on `system` it renders light inside that page for every reader
 * whose machine is set to light, which is the same mistake `viewers/index.html`
 * fixed with `data-awv-theme="dark"`. A host cannot reach into the frame, so it
 * asks in the URL.
 *
 * Read here as well as in `index.html`'s pre-paint script, so the control in
 * the masthead shows the theme the page is actually in rather than `system`.
 */
function requestedTheme() {
  try {
    const asked = new URLSearchParams(window.location.search).get("theme");
    if (asked === "light" || asked === "dark" || asked === "system") return asked;
  } catch {
    // A URL we cannot parse is not a reason to fail to paint.
  }
  return "system";
}

const THEMES = [
  { value: "light", label: "Light", glyph: "\u2600" },
  { value: "dark", label: "Dark", glyph: "\u263e" },
  { value: "system", label: "System", glyph: "\u25d1" },
];

export function storedTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // Site data blocked. The default stands.
  }
  return requestedTheme();
}

function prefersDark() {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

/** Resolve a choice to a painted theme and put it on the document. */
export function paintTheme(theme) {
  const resolved = theme === "system" ? (prefersDark() ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
  // The browser's own chrome — scrollbars, the controls it draws itself — is
  // not styled by our properties. Without this a dark application scrolls with
  // a white scrollbar.
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function applyTheme(theme) {
  paintTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Applied for this page; just not remembered.
  }
  // Every control on screen, not only the one that was pressed: the sign-in
  // screen and the reporting application each carry one.
  for (const control of document.querySelectorAll(".themepick")) {
    mount(control, ...themeChoices(theme));
  }
}

function themeChoices(active) {
  return THEMES.map((option) =>
    el(
      "button.themepick__option",
      {
        type: "button",
        class: option.value === active ? "is-active" : null,
        "aria-pressed": option.value === active ? "true" : "false",
        title: `${option.label} theme`,
        "aria-label": `${option.label} theme`,
        onclick: () => applyTheme(option.value),
      },
      option.glyph
    )
  );
}

/**
 * Three buttons rather than a two-way switch, because `system` is a state of
 * its own and a switch cannot express it: a reader whose machine goes dark at
 * sunset wants the application to follow, and a reader who wants dark on a
 * light machine wants it not to.
 */
export function themeControl() {
  return el(
    "div.themepick",
    { role: "group", "aria-label": "Theme" },
    themeChoices(storedTheme())
  );
}

/**
 * `system` means "keep following it", so the query stays subscribed for the
 * life of the tab rather than being read once at boot.
 */
if (typeof window.matchMedia === "function") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (storedTheme() === "system") paintTheme("system");
  });
}
