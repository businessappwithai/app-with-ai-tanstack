/**
 * The theme, for the whole application.
 *
 * `globals.css` has carried a complete `.dark` palette from the start and
 * nothing ever set the class: `--dark-mode` at generation time wrote
 * `className="dark"` onto `<html>` and froze the application there. So a
 * generated application had either no dark mode or nothing else — and in both
 * cases the reader had no say.
 *
 * Three things make it a mode rather than a build flag:
 *
 * 1. **One switch, on `<html>`.** Every colour in the application resolves
 *    through the tokens `globals.css` redefines under `.dark`, so the class on
 *    the document element is the entire mechanism — screens, dialogs, the help
 *    toaster, the admin shells and the sign-in page included. Nothing opts in.
 * 2. **It is applied before first paint**, by `THEME_BOOT_SCRIPT` in the
 *    document head. React cannot do this: the server renders without knowing
 *    what this browser chose, so a class applied in an effect arrives one paint
 *    late and the reader sees a white flash on every navigation to a dark app.
 * 3. **`system` is a real third state**, not the absence of a choice. It
 *    follows `prefers-color-scheme` *and keeps following it* — the media query
 *    is subscribed to, so a machine that switches at sunset takes the
 *    application with it without a reload.
 */

import { Monitor, Moon, Sun } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_THEME } from "@/lib/app-meta";

export type Theme = "light" | "dark" | "system";
/** What the page is actually showing once `system` has been resolved. */
export type ResolvedTheme = "light" | "dark";

/**
 * Per-browser, per-origin. Deliberately not on the user record: the choice
 * belongs to the screen someone is reading on, and the same account on a phone
 * and a desktop reasonably wants two different answers.
 */
export const THEME_STORAGE_KEY = "appwithai.theme";

export const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

const generatedDefault: Theme = isTheme(DEFAULT_THEME) ? DEFAULT_THEME : "light";

/**
 * `?theme=light|dark|system` — the default a host embedding this application
 * asks for, honoured only until the reader chooses for themselves.
 *
 * The published guide runs a generated application in an iframe on a near-black
 * page; left on the generated default it renders light inside it, and a host
 * cannot reach into the frame to say otherwise. So it asks in the URL. It is a
 * *default*, not an override: a stored choice wins, and the theme control
 * decides from then on.
 *
 * Read on the client only. During SSR there is no location to read, and the
 * pre-paint script below has already applied the answer by the time React
 * hydrates — so reading it during render would be the one thing that makes the
 * two trees disagree.
 */
function requestedTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const asked = new URLSearchParams(window.location.search).get("theme");
    return isTheme(asked) ? asked : null;
  } catch {
    return null;
  }
}

/**
 * Runs in the document head, before the body exists, as plain ES5 in a string.
 *
 * It is deliberately the same three rules the provider applies below, written
 * twice — there is no way to share them, because this one has to execute
 * before any module has loaded. Keep them in step: a disagreement shows up as
 * a one-frame flash of the wrong theme, which is easy to miss and impossible
 * to explain.
 *
 * Wrapped in try/catch because `localStorage` throws rather than returning
 * null in a browser with site data blocked, and a theme is not worth a blank
 * page.
 */
export const THEME_BOOT_SCRIPT = `(function(){
var k=${JSON.stringify(THEME_STORAGE_KEY)},d=${JSON.stringify(generatedDefault)};
var ok=function(v){return v==="light"||v==="dark"||v==="system"};
try{var a=new URLSearchParams(window.location.search).get("theme");if(ok(a))d=a}catch(e){}
var t=d;try{var s=localStorage.getItem(k);if(ok(s))t=s}catch(e){}
try{
var dark=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var r=document.documentElement;
r.classList[dark?"add":"remove"]("dark");
r.style.colorScheme=dark?"dark":"light";
}catch(e){}})();`;

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/**
 * `color-scheme` alongside the class, so the browser's own chrome — scrollbars,
 * form controls it draws itself, the flash between documents — matches. Without
 * it a dark application still scrolls with a white scrollbar.
 */
function paint(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  // A screen outside the provider gets a reader of the current state rather
  // than a crash — the sign-in page and the error boundary render there.
  if (ctx) return ctx;
  return {
    theme: generatedDefault,
    resolvedTheme:
      typeof document !== "undefined" && document.documentElement.classList.contains("dark")
        ? "dark"
        : "light",
    setTheme: () => {},
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts at the generated default on both sides of hydration. The boot script
  // has already painted the reader's real choice onto `<html>`; reading storage
  // *here* during render would make the server and client disagree, and React
  // would throw away the tree.
  const [theme, setThemeState] = useState<Theme>(generatedDefault);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolve(generatedDefault)
  );

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Private window, blocked site data. The default stands.
    }
    const initial = isTheme(stored) ? stored : (requestedTheme() ?? generatedDefault);
    setThemeState(initial);
    const next = resolve(initial);
    setResolvedTheme(next);
    paint(next);
  }, []);

  // `system` means "keep following it", so the query stays subscribed for as
  // long as that is the choice.
  useEffect(() => {
    if (theme !== "system") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next: ResolvedTheme = query.matches ? "dark" : "light";
      setResolvedTheme(next);
      paint(next);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    const painted = resolve(next);
    setResolvedTheme(painted);
    paint(painted);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The theme still applies for this page; it just will not be remembered.
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
