import fs from "fs";
import { MermaidParser } from "./packages/generator/dist/parsers/mermaid.parser.js";

const erd = fs.readFileSync("./test-data/hospital-erd.mermaid", "utf8");
const parser = new MermaidParser();
const { entities } = parser.parse(erd);

console.log("Parsed entities:");
entities.forEach((entity) => {
  console.log(`\n${entity.name}:`);
  console.log(`  Attributes (${entity.attributes.length}):`);
  entity.attributes.forEach((attr, i) => {
    const unique = attr.unique || false;
    console.log(`    ${i}: ${attr.name} (${attr.type}) required=${attr.required} unique=${unique}`);
  });
});
