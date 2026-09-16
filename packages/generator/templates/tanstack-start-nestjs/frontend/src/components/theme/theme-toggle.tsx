/**
 * The control that changes the theme.
 *
 * Three explicit choices rather than a two-way switch, because `system` is a
 * state of its own and a switch cannot express it: a reader whose machine goes
 * dark at sunset wants the application to follow, and a reader who wants dark
 * on a light machine wants it not to.
 *
 * It is a plain `<details>` rather than the shadcn dropdown. This sits in four
 * different headers, two of which (the sign-in page, the automations screen)
 * are not inside the provider tree that the dropdown's portal wants, and a
 * theme control that fails to open on the sign-in page is worse than one that
 * is slightly plainer everywhere.
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { type Theme, THEMES, useTheme } from "./theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const box = useRef<HTMLDetailsElement>(null);

  // A menu that stays open after a click outside it reads as stuck.
  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const node = box.current;
      if (node?.open && !node.contains(event.target as Node)) node.open = false;
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  const active = THEMES.find((t) => t.value === theme) ?? THEMES[0]!;
  // The icon shows what is on screen, not what was chosen: under `system` the
  // useful answer to "is this dark?" is the resolved one.
  const Icon = (THEMES.find((t) => t.value === resolvedTheme) ?? active).icon;

  const choose = (next: Theme) => {
    setTheme(next);
    if (box.current) box.current.open = false;
  };

  return (
    <details ref={box} className={cn("relative", className)}>
      <summary
        aria-label={`Theme: ${active.label}`}
        title={`Theme: ${active.label}`}
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"
      >
        <Icon className="h-4 w-4" />
      </summary>
      <div
        role="menu"
        className="absolute right-0 z-[80] mt-1 w-36 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      >
        {THEMES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={theme === option.value}
            onClick={() => choose(option.value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              theme === option.value
                ? "bg-primary/10 font-medium text-primary"
                : "hover:bg-muted hover:text-foreground"
            )}
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}
