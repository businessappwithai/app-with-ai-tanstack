import { HelpSection, HelpText, HelpButton } from "@/components/help/help-toaster";
import { useWindowHelp } from "@/hooks/use-entities";

/**
 * The dictionary windows that describe the application rather than an entity.
 * They have no sys_table row, so they are resolved by window name instead —
 * `/sys/windows` is the "Window, Tab and Field" window, and so on. Without this
 * the six screens explaining how the application fits together were the only
 * ones with no help of their own.
 */
const SYS_ENDPOINT_WINDOWS: Record<string, string> = {
  tables: "Table and Column",
  columns: "Table and Column",
  windows: "Window, Tab and Field",
  tabs: "Window, Tab and Field",
  fields: "Window, Tab and Field",
};

/**
 * `/bus/sales-order` → `bus_sales_order`, resolved against sys_table.
 * `/sys/windows` → `Window, Tab and Field`, resolved against sys_window.name.
 *
 * Anything else resolves to an empty key and the button hides itself rather
 * than opening on nothing.
 */
export function helpTableNameFromEndpoint(endpoint: string): string {
  const bus = /^\/bus\/([^/?]+)/.exec(endpoint);
  if (bus) return `bus_${bus[1].replace(/-/g, "_")}`;
  const sys = /^\/sys\/([^/?]+)/.exec(endpoint);
  return sys ? (SYS_ENDPOINT_WINDOWS[sys[1]] ?? "") : "";
}

/**
 * The `?` button for a window. Pressing it puts the window's help into the
 * toaster at the top right, where it stays until the close button is pressed.
 *
 * This used to be a centred modal with a backdrop, which covered the record it
 * was describing — so reading the help and using the screen were two different
 * moments. The toaster is not modal, so they are one.
 *
 * Text comes from the Application Dictionary (sys_window.help, sys_tab.help and
 * sys_field.help), so administrators can rewrite any of it from Window, Tab and
 * Field without touching this component. The button hides itself when the
 * window has no help at all rather than opening an empty panel.
 */
export function WindowHelpButton({
  tableName,
  windowName,
  entityLabel,
}: {
  tableName?: string;
  /**
   * For a window with no table behind it — the Application Dictionary screens,
   * which describe how the application is assembled rather than an entity. The
   * API resolves a table name first and falls back to the window's own name, so
   * these screens carry help from the dictionary like every other window.
   */
  windowName?: string;
  entityLabel: string;
}) {
  const key = tableName || windowName || "";
  const { data: helpData } = useWindowHelp(key);

  const windowHelp = helpData?.window;
  const tabs = (helpData?.tabs ?? []).filter((t) => t.help);
  const fields = (helpData?.fields ?? []).filter((f) => f.help);
  const hasHelp = !!windowHelp?.help || tabs.length > 0 || fields.length > 0;

  if (!hasHelp) return null;

  return (
    <HelpButton
      label={entityLabel}
      topic={{
        key: `window:${key}`,
        title: `${entityLabel} — Help`,
        body: (
          <div className="space-y-5">
            {windowHelp?.help ? (
              <HelpSection title="Window overview">
                <HelpText>{windowHelp.help}</HelpText>
              </HelpSection>
            ) : null}

            {tabs.length > 0 ? (
              <HelpSection title="Tabs">
                <div className="space-y-2">
                  {tabs.map((tab) => (
                    <div
                      key={tab.sys_tab_id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-2.5"
                    >
                      <p className="text-xs font-semibold text-foreground">{tab.name}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {tab.help}
                      </p>
                    </div>
                  ))}
                </div>
              </HelpSection>
            ) : null}

            {fields.length > 0 ? (
              <HelpSection title={`Fields (${fields.length})`}>
                <dl className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
                  {fields.map((field) => (
                    <div key={field.sys_field_id} className="p-2.5 odd:bg-muted/20">
                      <dt className="flex items-start gap-1 text-xs font-semibold text-foreground">
                        <span>{field.name}</span>
                        {field.is_mandatory ? (
                          <span className="text-destructive" title="Required">
                            *
                          </span>
                        ) : null}
                      </dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {field.help}
                      </dd>
                    </div>
                  ))}
                </dl>
              </HelpSection>
            ) : null}
          </div>
        ),
      }}
    />
  );
}
