/**
 * Help, and the only shape it takes.
 *
 * Every piece of help in this application — a window's overview, a tab, a
 * field's dictionary text, the automation builder's guide — arrives as one
 * toaster pinned to the top right, opened by a `?` button and closed by its
 * own close button. Nothing else shows help: no centred modal over the record
 * you were reading, no popover that vanishes when the pointer moves, no pane
 * that takes the screen away from the work.
 *
 * Three properties are the whole contract, and each replaced something that
 * used to be true here:
 *
 * 1. **It does not dismiss itself.** No timeout, no click-outside, no Escape.
 *    Help is read while the form it describes is being filled in, and a panel
 *    that closes on the next keystroke cannot be read at all. The close button
 *    is the only way out — which is also why the button is always rendered and
 *    always reachable.
 * 2. **It never covers the page.** No backdrop and no focus trap, so the
 *    record stays visible and editable with the help open beside it.
 * 3. **There is one of it.** Opening a second topic replaces the first rather
 *    than stacking, because a tower of panels down the right edge of the
 *    screen is the thing a toaster is supposed to avoid.
 */

import { HelpCircle, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export interface HelpTopic {
  /**
   * Identifies the topic so pressing the same `?` twice is a no-op rather than
   * a flicker. Two buttons describing the same window share a key.
   */
  key: string;
  title: string;
  /** Rendered inside the scrolling body. Plain text is the common case. */
  body: ReactNode;
}

interface HelpContextValue {
  topic: HelpTopic | null;
  showHelp: (topic: HelpTopic) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

/**
 * Outside a `HelpProvider` the hook returns a working no-op rather than
 * throwing. A `?` button is not worth crashing a screen over, and the
 * standalone screens (sign-in, the error boundary) render outside the
 * provider on purpose.
 */
const NO_HELP: HelpContextValue = {
  topic: null,
  showHelp: () => {},
  closeHelp: () => {},
};

export function useHelp(): HelpContextValue {
  return useContext(HelpContext) ?? NO_HELP;
}

export function HelpProvider({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState<HelpTopic | null>(null);

  const showHelp = useCallback((next: HelpTopic) => setTopic(next), []);
  const closeHelp = useCallback(() => setTopic(null), []);

  const value = useMemo(() => ({ topic, showHelp, closeHelp }), [topic, showHelp, closeHelp]);

  return (
    <HelpContext.Provider value={value}>
      {children}
      <HelpToaster />
    </HelpContext.Provider>
  );
}

/**
 * The toaster itself. Rendered once, by the provider — a screen never places
 * it, so no screen can put help anywhere else.
 */
function HelpToaster() {
  const { topic, closeHelp } = useHelp();
  if (!topic) return null;

  return (
    <div
      // `aria-live` rather than `role="dialog"`: this is not modal, the page
      // behind it stays usable, and announcing it without stealing focus is
      // the behaviour that matches what it looks like.
      aria-live="polite"
      // `top-20` rather than `top-4`, and the number is a header's height.
      // Every screen here carries a sticky header 3.5–4rem tall whose
      // right-hand end holds the theme control, the notification bell and the
      // account menu — at `top-4` this panel sat over them, so the one surface
      // whose whole point is that the application stays usable behind it was
      // the thing making three of its controls unclickable. Found by driving
      // it in a browser; nothing in the markup says so.
      className="fixed right-4 top-20 z-[70] flex max-h-[calc(100vh-6rem)] w-[min(26rem,calc(100vw-2rem))] flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <HelpCircle className="h-4 w-4 flex-shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold">{topic.title}</h2>
        </div>
        <button
          type="button"
          onClick={closeHelp}
          aria-label="Close help"
          title="Close help"
          className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
        {topic.body}
      </div>
    </div>
  );
}

/**
 * The `?` button. The only thing in the application that opens help.
 *
 * It is deliberately the same control everywhere — beside a window title,
 * beside a field label, in a toolbar — so that "press the question mark" is
 * true of every screen.
 */
export function HelpButton({
  topic,
  label,
  className,
  size = "sm",
}: {
  topic: HelpTopic;
  /** For the accessible name: "Help for Sales Order". */
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { showHelp } = useHelp();
  return (
    <button
      type="button"
      onClick={() => showHelp(topic)}
      aria-label={`Help for ${label}`}
      title={`Help for ${label}`}
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        size === "sm" ? "h-4 w-4" : "h-7 w-7",
        className
      )}
    >
      <HelpCircle className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}

/** Plain dictionary text, kept readable when an author wrote paragraphs. */
export function HelpText({ children }: { children: ReactNode }) {
  return <p className="whitespace-pre-wrap leading-relaxed">{children}</p>;
}

/** A labelled block inside the body — "Tabs", "Fields", and so on. */
export function HelpSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">{title}</h3>
      {children}
    </section>
  );
}
