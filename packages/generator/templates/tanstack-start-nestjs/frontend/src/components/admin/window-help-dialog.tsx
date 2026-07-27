import { useEffect, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useWindowHelp } from '@/hooks/use-entities';

/**
 * `/bus/sales-order` → `bus_sales_order`.
 *
 * Anything not served from /bus/ (the admin windows on /sys/) has no business
 * window in the dictionary to describe, so it resolves to an empty name and the
 * dialog hides itself.
 */
export function helpTableNameFromEndpoint(endpoint: string): string {
  const match = /^\/bus\/([^/?]+)/.exec(endpoint);
  return match ? `bus_${match[1].replace(/-/g, '_')}` : '';
}

/**
 * The Help button and screen for a window.
 *
 * Text comes from the Application Dictionary (sys_window.help, sys_tab.help and
 * sys_field.help), so administrators can rewrite any of it from Window, Tab and
 * Field without touching this component. The button hides itself when the
 * window has no help at all rather than opening an empty dialog.
 */
export function WindowHelpDialog({ tableName, entityLabel }: { tableName: string; entityLabel: string }) {
  const [open, setOpen] = useState(false);
  const { data: helpData } = useWindowHelp(tableName);

  const windowHelp = helpData?.window;
  const tabs = (helpData?.tabs ?? []).filter((t) => t.help);
  const fields = (helpData?.fields ?? []).filter((f) => f.help);
  const hasHelp = !!windowHelp?.help || tabs.length > 0 || fields.length > 0;

  // Esc closes, matching every other dismissible surface in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!hasHelp) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Help for ${entityLabel}`}
        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
        title={`Help for ${entityLabel}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Help
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${entityLabel} help`}>
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-background shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-xl">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">{entityLabel} — Help</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-auto">
              {windowHelp?.help && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Window Overview</h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{windowHelp.help}</p>
                </section>
              )}

              {tabs.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">Tabs</h3>
                  {tabs.map((tab) => (
                    <div key={tab.sys_tab_id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs font-semibold text-foreground mb-1">{tab.name}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{tab.help}</p>
                    </div>
                  ))}
                </section>
              )}

              {fields.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Fields <span className="font-normal normal-case tracking-normal text-muted-foreground">({fields.length})</span>
                  </h3>
                  <dl className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
                    {fields.map((field) => (
                      <div key={field.sys_field_id} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-3 p-3 odd:bg-muted/20">
                        <dt className="text-xs font-semibold text-foreground flex items-start gap-1">
                          <span>{field.name}</span>
                          {field.is_mandatory && <span className="text-red-500" title="Required">*</span>}
                        </dt>
                        <dd className="sm:col-span-2 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {field.help}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
