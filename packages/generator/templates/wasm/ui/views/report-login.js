/**
 * The reporting application's sign-in — the second login.
 *
 * It looks like the application's on purpose and is not the same screen: the
 * accounts are different accounts, in different tables, with a different
 * password, and what the numbers beside them count is different too. The
 * application's screen says how many *entities* a role can open; this one says
 * how many *tables* a role's queries may read. That is the whole difference
 * between the two products' idea of a role, stated in the one place a reader
 * meets both.
 *
 * Every seeded account is listed for the same reason the application lists
 * every one of its own: the administrator reads every table, so a reporting
 * platform you can only sign into as the administrator is one whose access
 * control you cannot see. `support.agent@… — 5 of 17 tables` is the invitation.
 */

import { el, mount, toast } from "../dom.js";
import { reportApi, setReportToken } from "../api.js";

export async function reportLoginView(root, { project, onSignedIn, onLeave }) {
  let config = null;
  try {
    config = await reportApi.get("/report-auth/config");
  } catch {
    // The screen still works without the hint — the form is the point.
  }

  const accounts = config?.accounts ?? [];
  const password = config?.password ?? "admin";
  const administrator = accounts.find((account) => account.isAdmin) ?? accounts[0] ?? null;

  const emailInput = el("input.field__input", {
    type: "text",
    id: "report-email",
    name: "email",
    autocomplete: "username",
    value: administrator?.email ?? "",
    required: true,
  });
  const passwordInput = el("input.field__input", {
    type: "password",
    id: "report-password",
    name: "password",
    autocomplete: "current-password",
    value: password,
    required: true,
  });
  const submit = el("button.btn.btn--primary", { type: "submit" }, "Sign in to reporting");

  const form = el(
    "form.login__form",
    {
      onsubmit: async (event) => {
        event.preventDefault();
        submit.disabled = true;
        submit.textContent = "Signing in…";
        try {
          const result = await reportApi.post("/report-auth/login", {
            email: emailInput.value.trim(),
            password: passwordInput.value,
          });
          // Before anything else calls the API: the next request loads this
          // role's reports, and without the token it is a 401 that reads as
          // "your session ended" a quarter-second after signing in.
          setReportToken(result.token);
          onSignedIn(result.user);
        } catch (error) {
          toast(error.message, "error");
          submit.disabled = false;
          submit.textContent = "Sign in to reporting";
          passwordInput.focus();
        }
      },
    },
    el(
      "div.field",
      el(
        "div.field__head",
        el("label.field__label", { for: "report-email" }, "Reporting account"),
        el("span.chip.chip--text", "Text")
      ),
      emailInput
    ),
    el(
      "div.field",
      el(
        "div.field__head",
        el("label.field__label", { for: "report-password" }, "Password"),
        el("span.chip.chip--text", "Password")
      ),
      passwordInput
    ),
    submit
  );

  const counts = config?.counts ?? {};

  mount(
    root,
    el(
      "div.login.login--report",
      el(
        "div.login__panel",
        el("div.login__mark.login__mark--report", "ER"),
        el("h1.login__title", "Enterprise Reporting"),
        el(
          "p.login__subtitle",
          `Reporting on ${config?.application?.name ?? project.name}. A separate application, with its own accounts.`
        ),
        form,
        accounts.length > 0
          ? el(
              "div.accounts",
              el(
                "p.accounts__head",
                `${accounts.length} reporting account${accounts.length === 1 ? "" : "s"}, password `,
                el("code", password),
                config?.scoped
                  ? ". A reporting role decides which of the application's tables its queries may read — pick one to try it."
                  : ". Pick one to fill the form."
              ),
              el(
                "ul.accounts__list",
                ...accounts.map((account) =>
                  el(
                    "li",
                    el(
                      "button.accounts__row",
                      {
                        type: "button",
                        onclick: () => {
                          emailInput.value = account.email;
                          passwordInput.value = password;
                          passwordInput.focus();
                        },
                      },
                      el("span.accounts__role", account.role ?? account.name),
                      el("span.accounts__email", account.email),
                      el(
                        "span.accounts__scope",
                        account.isAdmin
                          ? `all ${account.total} tables`
                          : /* Zero is a real answer, not a missing seed: this is
                               the account holding no functional role, so no
                               `read` rule admits it and its queries may read
                               nothing. Said plainly, because a row reading
                               "0 of 17 tables" and nothing else looks like the
                               generator failed. */
                            account.tables === 0
                            ? "no tables — signed in, holding no reporting role"
                            : `${account.tables} of ${account.total} tables`
                      )
                    )
                  )
                )
              )
            )
          : el(
              "p.login__hint",
              "No reporting accounts were seeded, which means this model declares no %%rbac roles. ",
              el("span.login__hint-note", "Sign in as the administrator to read every table.")
            )
      ),
      el(
        "div.login__aside",
        el("h2", "The other half of the model"),
        el(
          "ul.login__facts",
          el(
            "li",
            el("strong", `${counts.reports ?? 0} reports and ${counts.charts ?? 0} charts`),
            " derived from this model — its entities, its enums, its state machines and its own %%report queries"
          ),
          el(
            "li",
            el("strong", "One reporting role per %%rbac role"),
            " — the same names, permitted to read exactly the tables that role may see"
          ),
          el(
            "li",
            el("strong", "A separate sign-in"),
            " — two applications, two user tables, two sessions. Neither password works on the other side"
          ),
          el(
            "li",
            el("strong", "Read-only"),
            " — a reporting role narrows what a query may read; nothing here writes to the application"
          )
        ),
        el(
          "p.login__aside-note",
          "Deployed, this is the Enterprise Reporting platform running beside the application as its own service, with its own database. Here it is the same reports and the same roles, served from this tab."
        ),
        onLeave
          ? el(
              "button.btn.btn--ghost",
              { type: "button", onclick: () => onLeave() },
              `← Back to ${project.name}`
            )
          : null
      )
    )
  );

  emailInput.focus();
}
