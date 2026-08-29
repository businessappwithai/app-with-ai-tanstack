/**
 * What this application is called, and where its API lives.
 *
 * The only file in the front end that a model changes. Everything else — every
 * screen, hook and provider — is the same code in every generated application
 * and imports its identity from here.
 *
 * That is not a tidiness point. Before this file existed, twenty components were
 * Handlebars templates because each carried a project name in a heading or a
 * comment, which meant none of them could be type-checked, linted or opened in
 * an editor that understood TSX: a broken component was found by a person
 * running the generated application, not by `tsc`. Substituting one constant
 * instead of twenty files buys all of that back.
 */

export const APP_NAME = "my-app";
export const APP_VERSION = "1.0.0";
export const APP_DESCRIPTION = "Generated application";

/** The NestJS backend, as reached from the browser. */
export const BACKEND_PORT = 4001;
export const BACKEND_URL = "http://localhost:4001";

/**
 * The accounts the seed creates, so the sign-in screen can offer them.
 *
 * A generated application seeds one account per functional role, and an
 * administrator who bypasses every restriction the model wrote. Listing only
 * the administrator — or listing nothing, which is what this screen did — means
 * the access control the model declared can be read in the seed and never seen
 * in the application.
 *
 * This is demonstration data. `SEEDED_PASSWORD` is what
 * `seeds/00_users_and_roles.ts` writes for every one of them, and the seed says
 * so at the top: change it before the application runs anywhere real, at which
 * point these accounts stop existing and the list empties itself.
 */
export interface SeededAccount {
  email: string;
  role: string;
  isAdmin: boolean;
  /** How many entities this role may read; equal to the total for an admin. */
  entities: number;
}

export const SEEDED_PASSWORD = "admin123";
export const TOTAL_ENTITIES = 17;

export const SEEDED_ACCOUNTS: SeededAccount[] = [
  {
    email: "admin@admin.com",
    role: "Administrator",
    isAdmin: true,
    entities: 17,
  },
  {
    email: "user@my-app.example.com",
    role: "User",
    isAdmin: false,
    entities: 0,
  },
  {
    email: "account.executive@my-app.example.com",
    role: "Account Executive",
    isAdmin: false,
    entities: 10,
  },
  {
    email: "marketing.manager@my-app.example.com",
    role: "Marketing Manager",
    isAdmin: false,
    entities: 6,
  },
  {
    email: "sales.manager@my-app.example.com",
    role: "Sales Manager",
    isAdmin: false,
    entities: 13,
  },
  {
    email: "sales.ops@my-app.example.com",
    role: "Sales Ops",
    isAdmin: false,
    entities: 15,
  },
  {
    email: "sales.rep@my-app.example.com",
    role: "Sales Rep",
    isAdmin: false,
    entities: 9,
  },
  {
    email: "support.agent@my-app.example.com",
    role: "Support Agent",
    isAdmin: false,
    entities: 5,
  },
  {
    email: "support.manager@my-app.example.com",
    role: "Support Manager",
    isAdmin: false,
    entities: 6,
  },
];

/** True when the model restricted `read`, so the counts above differ. */
export const ACCESS_IS_SCOPED = true;
