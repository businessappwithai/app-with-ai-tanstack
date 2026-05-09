import type { Entity, Relationship } from "@erdwithai/core/types";
import { TemplateLoader } from "../templates/loader";

export abstract class BaseGenerator {
  protected templateLoader: TemplateLoader;

  constructor(templateDir: string) {
    this.templateLoader = new TemplateLoader(templateDir);
  }

  abstract generate(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void>;

  protected async renderTemplate(
    templatePath: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Handlebars context is dynamic
    context: any
  ): Promise<string> {
    const template = await this.templateLoader.load(templatePath);
    return template(context);
  }
}
