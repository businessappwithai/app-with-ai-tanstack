/**
 * Which stack a generation targets.
 *
 * A one-line union in a module of its own, and the reason is the import graph
 * rather than tidiness. It used to live in `full-stack.generator.ts`, which
 * imports the NestJS backend generator, the TanStack front-end generator and
 * the E2E test generator — and through the first of those, the Handlebars
 * template loader.
 *
 * `pipeline/parse-model.ts` needs this type for `GenerationSettings`, and
 * nothing else from that file. So one `import type` made the *pure* half of the
 * pipeline — the half documented as touching no filesystem, the half the
 * browser bundle and the reporting pack reach for — depend, in the type graph,
 * on every generator and on Handlebars. Anything importing `parse-model.ts`
 * inherited that: `app-and-report-with-ai-tanstack` type-checks this checkout
 * without installing its dependencies, so pulling in the template loader gave
 * it 26 `TS7006` errors on Handlebars callbacks it has no types for, in a file
 * it never meant to read.
 *
 * Keep it alone here. `full-stack.generator.ts` re-exports it, so every
 * existing importer is unaffected.
 */
export type StackOption = "tanstackjs-nestjs" | "tanstack-start-nestjs";
