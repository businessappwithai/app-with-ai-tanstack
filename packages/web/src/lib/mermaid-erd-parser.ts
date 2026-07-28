// Thin wrapper around @erdwithai/generator's MermaidParser
// Exposes ERD parsing as a standalone module for web-layer use

export type { Entity, EntityAttribute, Relationship } from "@erdwithai/core/types";
export { MermaidParser } from "@erdwithai/generator";
