/**
 * OPA5 E2E Test Generator for OpenUI5 Frontends
 * Generates comprehensive OPA5 tests for Option 2 applications
 */

import type { Entity } from "@erdwithai/core/types";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { BaseE2ETestGenerator } from "./base-e2e.generator";

export class OpenUI5OPA5E2ETestGenerator extends BaseE2ETestGenerator {
  async generate(): Promise<void> {
    const testDir = join(this.config.outputDir, "frontend", "test", "e2e");
    await mkdir(testDir, { recursive: true });

    // Generate OPA5 configuration
    await this.generateOPA5Config();

    // Generate test data
    await this.generateFixtures();

    // Generate OPA5 journey tests for each entity
    for (const entity of this.config.entities) {
      await this.generateEntityJourneyTests(entity);
    }

    // Generate navigation tests
    await this.generateNavigationTests();
  }

  private async generateOPA5Config(): Promise<void> {
    const config = `sap.ui.define([
  'sap/ui/core/library',
  'sap/ui/core/mvc/Controller',
  'sap/ui/core/mvc/View',
  'sap/ui/model/json/JSONModel',
], function(Controller, View, JSONModel) {
  'use strict';
});

sap.ui.require([
  'sap/ui/test/Opa5',
  'sap/ui/test/opaQunit'
], function(Opa5, opaQunit) {
  'use strict';

  // Set default timeout
  Opa5.extendConfig({
    executionTimeout: 90000,
    checkInterval: 500
  });
});
`;

    await writeFile(join(this.config.outputDir, "frontend", "test", "opa5.cfg.js"), config);
  }

  private async generateFixtures(): Promise<void> {
    // Generate common test utilities
    const utils = `// Common OPA5 journeys
sap.ui.define('test/journeys/common', [], function() {
  'use strict';

  return {
    // Navigate to entity list
    toEntityList: function(sEntityName) {
      return this.waitFor({
        controlType: 'sap.m.Table',
        viewName: 'Master',
        success: function(oTable) {
          return oTable.$().length > 0;
        }
      });
    },

    // Click create button
    clickCreate: function() {
      return this.waitFor({
        id: /button::create/i,
        success: function(oButton) {
          oButton.firePress();
        }
      });
    },

    // Navigate to detail view
    toDetail: function(sEntityName) {
      return this.waitFor({
        controlType: 'sap.m.ObjectHeader',
        success: function(oHeader) {
          return oHeader.getTitle() === sEntityName;
        }
      });
    }
  };
});
`;

    await writeFile(join(this.config.outputDir, "frontend", "test", "e2e", "common.js"), utils);

    // Generate test data
    const testData = this.generateOPA5TestData();
    await writeFile(
      join(this.config.outputDir, "frontend", "test", "e2e", "test-data.js"),
      testData
    );
  }

  private async generateEntityJourneyTests(entity: Entity): Promise<void> {
    const entityName = entity.name;
    const entityNamePlural = `${entityName}s`;

    const testFile = `sap.ui.define('test/journeys/${entityName}Journey', [], function() {
  'use strict';

  var sEntityName = '${entityName}';
  var sEntityNamePlural = '${entityNamePlural}';

  // Journey for ${entityName} CRUD operations
  Opa5.describe('${entityName} CRUD Tests', function() {
    var that = this;

    // Common startup
    Opa5.beforeEach(function() {
      // Restart app
      Opa5.iTeaMyApp restart();
    });

    // Cleanup after each test
    Opa5.afterEach(function() {
      Opa5.iTeaMyApp.destroy();
    });

    // Test 1: View ${entityName} list
    Opa5.it('should display ${entityName} list', function(Given, When, Then) {
      // Navigate to the ${entityName} list
      When(onThe${entityName}Page.iNavigateTo${entityName}s);
      Then(assertion.iShouldSeeThe${entityName}List());
    });

    // Test 2: Create new ${entityName}
    Opa5.it('should create a new ${entityName}', function(Given, When, Then) {
      // Click create button
      When(onThe${entityName}Page.iPressCreate);
      // Fill form
      ${this.generateCreateJourneyCode(entity)}
      // Submit
      When(onThe${entityName}Page.iPressSave);
      Then(assertion.iShouldSeeSuccessMessage());
    });

    // Test 3: View ${entityName} details
    Opa5.it('should view ${entityName} details', function(Given, When, Then) {
      When(onThe${entityName}Page.iClickOnFirst${entityName});
      Then(assertion.iShouldSee${entityName}Details());
    });

    // Test 4: Update ${entityName}
    Opa5.it('should update ${entityName}', function(Given, When, Then) {
      When(onThe${entityName}Page.iClickEditOnFirst${entityName});
      ${this.generateUpdateJourneyCode(entity)}
      When(onThe${entityName}Page.iPressSave);
      Then(assertion.iShouldSeeSuccessMessage());
    });

    // Test 5: Delete ${entityName}
    Opa5.it('should delete ${entityName}', function(Given, When, Then) {
      // Get initial count
      var iInitialCount;
      When(onThe${entityName}Page.iGet${entityName}Count(function(iCount) {
        iInitialCount = iCount;
      }));
      // Delete first item
      When(onThe${entityName}Page.iClickDeleteOnFirst${entityName});
      // Confirm deletion
      When(onThe${entityName}Page.iConfirmDelete);
      Then(assertion.iShouldSee${entityName}CountDecreased(iInitialCount));
    });

    // Test 6: Search/Filter ${entityNamePlural}
    Opa5.it('should filter ${entityNamePlural}', function(Given, When, Then) {
      When(onThe${entityName}Page.iEnterSearchTerm);
      Then(assertion.iShouldSeeFilteredResults());
    });
  });
});
`;

    await writeFile(
      join(this.config.outputDir, "frontend", "test", "e2e", `${entityName}.journey.js`),
      testFile
    );

    // Generate page object
    await this.generatePageObject(entity);
  }

  private generateCreateJourneyCode(entity: Entity): string {
    const lines: string[] = [];

    for (const attr of entity.attributes) {
      if (attr.name === "id" || attr.name.includes("_id")) continue;
      if (attr.name === "created_at" || attr.name === "updated_at") continue;

      const value = this.getMockValueForType(attr.type, attr.name);
      lines.push(
        `      When(onThe${entity.name}Page.iFill${this.capitalize(attr.name)}With('${value}'));`
      );
    }

    return lines.join("\n");
  }

  private generateUpdateJourneyCode(entity: Entity): string {
    const lines: string[] = [];

    for (const attr of entity.attributes) {
      if (attr.name === "id" || attr.name.includes("_id")) continue;
      if (attr.name === "created_at" || attr.name === "updated_at") continue;

      const value = this.getUniqueMockValue(attr.type, attr.name, 2);
      lines.push(
        `      When(onThe${entity.name}Page.iFill${this.capitalize(attr.name)}With('${value}'));`
      );
    }

    return lines.join("\n");
  }

  private async generatePageObject(entity: Entity): Promise<void> {
    const pageObject = `sap.ui.define('test/pageObjects/${entity.name}Page', [], function() {
  'use strict';

  return {
    // Navigate to entity list page
    iNavigateTo${entity.name}s: function() {
      return this.waitFor({
        viewName: 'Master',
        viewData: {
          entitySet: '/${entity.name}'
        }
      });
    },

    // Get count of items
    iGet${entity.name}Count: function(fnResult) {
      this.waitFor({
        controlType: 'sap.m.Table',
        viewName: 'Master'
      });

      var oTable = this.getView().byId('table');
      var iCount = oTable.$().length;

      fnResult(iCount);
    },

    // Click create button
    iPressCreate: function() {
      return this.waitFor({
        id: /button::create/i,
        actions: new Opa5.waitFor({
          success: function(oButton) {
            oButton.firePress();
          }
        })
      });
    },

    // Click save
    iPressSave: function() {
      return this.waitFor({
        controlType: 'sap.m.Button',
        text: /Save|Submit/i,
        actions: new Opa5.waitFor({
          success: function(oButton) {
            oButton.firePress();
          }
        })
      });
    },

    // Click on first item
    iClickOnFirst${entity.name}: function() {
      return this.waitFor({
        controlType: 'sap.m.ColumnListItem',
        viewName: 'Master',
        actions: new Opa5.waitFor({
          success: function(oListItem) {
            oListItem.$().children('div').first().firePress();
          }
        })
      });
    },

    // Click edit
    iClickEditOnFirst${entity.name}: function() {
      return this.waitFor({
        id: /button::edit/i,
        actions: new Opa5.waitFor({
          success: function(oButton) {
            oButton.firePress();
          }
        })
      });
    },

    // Click delete
    iClickDeleteOnFirst${entity.name}: function() {
      return this.waitFor({
        id: /button::delete/i,
        actions: new Opa5.waitFor({
          success: function(oButton) {
            oButton.firePress();
          }
        })
      });
    },

    // Confirm delete
    iConfirmDelete: function() {
      return this.waitFor({
        controlType: 'sap.m.Button',
        text: /Confirm|Yes/i,
        actions: new Opa5.waitFor({
          success: function(oButton) {
            oButton.firePress();
          }
        })
      });
    },

    // Enter search term
    iEnterSearchTerm: function() {
      return this.waitFor({
        controlType: 'sap.m.SearchField',
        actions: new Opa5.waitFor({
          success: function(oSearch) {
            oSearch.setValue('Test');
          }
        })
      });
    }
  };
});
`;

    await writeFile(
      join(this.config.outputDir, "frontend", "test", "e2e", `${entity.name}Page.js`),
      pageObject
    );
  }

  private async generateNavigationTests(): Promise<void> {
    const navTest = `sap.ui.define('test/journeys/Navigation', [], function() {
  'use strict';

  Opa5.describe('Navigation Tests', function() {
    Opa5.beforeEach(function() {
      Opa5.iTeaMyApp.restart();
    });

    Opa5.afterEach(function() {
      Opa5.iTeaMyApp.destroy();
    });

    ${this.config.entities
      .map(
        (entity) => `
    Opa5.it('should navigate to ${entity.name}', function(Given, When, Then) {
      When(onTheDashboardPage.iClickOn${entity.name}Link);
      Then(assertion.iShouldSee${entity.name}List());
    });
    `
      )
      .join("")}
  });
});
`;

    await writeFile(
      join(this.config.outputDir, "frontend", "test", "e2e", "navigation.journey.js"),
      navTest
    );
  }

  private generateOPA5TestData(): string {
    const lines: string[] = [];
    lines.push("// Test data for OPA5 tests");
    lines.push('sap.ui.define("test/testData", [], function() {');
    lines.push("  return {");

    for (const entity of this.config.entities) {
      lines.push(`    ${entity.name}: {`);
      lines.push(`      create: ${this.getSampleDataForEntity(entity)},`);
      lines.push(`    },`);
    }

    lines.push("  };");
    lines.push("});");

    return lines.join("\n");
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
