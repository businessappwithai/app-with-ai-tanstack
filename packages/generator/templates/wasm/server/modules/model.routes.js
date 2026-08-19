/**
 * `/model` — the EML this application was generated from.
 *
 * The generated code is the model compiled: reading it tells you what the
 * application does but not what it was asked to do, and nothing in it records
 * that a decision table had three rows for a reason. Serving the source back
 * makes the application self-describing, and it is what lets the model screen
 * show a diagram next to the tables it produced.
 */

import { Router } from "../lib/router.js";
import { json, text } from "../lib/http.js";
import { requireUser } from "../lib/guards.js";

export function modelRoutes(model, readAsset) {
  const router = new Router();

  // Signed-in callers only. The model is not more secret than the data it
  // describes, but it is not less secret either, and an endpoint that answers
  // anyone is one an entity route would never be allowed to be.
  router.use(async (_request, { user }) => {
    requireUser(user);
  });

  router.get("/", async () =>
    json({
      project: model.project,
      entities: model.entities.map((entity) => ({
        name: entity.name,
        tableName: entity.tableName,
        route: entity.routeName,
        displayName: entity.displayName,
        attributes: entity.attributes.map((attribute) => ({
          name: attribute.columnName,
          label: attribute.displayName,
          type: attribute.type,
          required: attribute.required,
          enumValues: attribute.enumValues,
          refTable: attribute.refTableName,
        })),
      })),
      relationships: model.relationships,
      categories: model.categories,
      rules: (model.rules || []).map((rule) => ({
        name: rule.name,
        entity: rule.entity,
        event: rule.event,
        operation: rule.operation,
        priority: rule.priority,
      })),
      workflows: (model.workflows || []).map((workflow) => ({
        name: workflow.name,
        entity: workflow.entity,
        initial: workflow.initial,
        states: workflow.states,
        transitions: workflow.transitions,
      })),
      sagas: model.sagas,
      hooks: model.hooks,
      rbac: model.rbac,
    })
  );

  router.get("/source", async () => {
    const source = await readAsset("model/model.eml.mmd").catch(() => "");
    return text(source || "-- no model source was written with this application --");
  });

  return router;
}
