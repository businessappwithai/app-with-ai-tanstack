/**
 * Master Controller - Entity Navigation Menu
 *
 * Manages entity list from OData $metadata.
 * Handles entity selection and navigation to List view.
 *
 * Generated: 2026-05-06T11:42:08.765Z
 */

import MessageToast from "sap/m/MessageToast";
import type UI5Event from "sap/ui/base/Event";
import Controller from "sap/ui/core/mvc/Controller";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * Entity Interface
 */
interface Entity {
  name: string;
  entityType: string;
  description: string;
  isSystem: boolean;
  icon: string;
}

/**
 * Entity Model Interface
 */
interface EntityModel {
  entities: Entity[];
}

/**
 * View Model Interface
 */
interface ViewModel {
  busy: boolean;
  entityCount: number;
}

/**
 * Master Controller
 */
export default class MasterController extends Controller {
  /**
   * Controller initialization
   */
  public onInit(): void {
    // Create view model
    const oViewModel: ViewModel = {
      busy: true,
      entityCount: 0,
    };
    this.getView()?.setModel(new JSONModel(oViewModel), "view");

    // Load entities from metadata
    this._loadEntitiesFromMetadata();
  }

  /**
   * Load entity list from OData $metadata
   * @private
   */
  private _loadEntitiesFromMetadata(): void {
    const oModel = this.getOwnerComponent().getModel();
    const oView = this.getView();

    // Wait for metadata to load
    oModel
      ?.getMetaModel()
      .requestObject("/")
      .then((oMetadata: any) => {
        const aEntities = this._extractEntitiesFromMetadata(oMetadata);

        // Create entity model
        const oEntityModel: EntityModel = {
          entities: aEntities,
        };

        oView?.setModel(new JSONModel(oEntityModel));
        oView?.getModel("view")?.setProperty("/busy", false);
        oView?.getModel("view")?.setProperty("/entityCount", aEntities.length);

        // Show/hide no data message
        this._updateNoDataMessage(aEntities.length === 0);
      })
      .catch((oError: any) => {
        console.error("Failed to load metadata:", oError);
        oView?.getModel("view")?.setProperty("/busy", false);
        this._updateNoDataMessage(true);
      });
  }

  /**
   * Extract entity information from OData metadata
   * @param {object} oMetadata - OData metadata object
   * @returns {Entity[]} Array of entity objects
   * @private
   */
  private _extractEntitiesFromMetadata(oMetadata: any): Entity[] {
    const aEntities: Entity[] = [];

    // Get all entity types (filter for bus_ prefixed tables)
    if (oMetadata && oMetadata.$EntityContainer) {
      const sContainerName = oMetadata.$EntityContainer;
      const oContainer = oMetadata[sContainerName];

      if (oContainer) {
        Object.keys(oContainer).forEach((sKey: string) => {
          const oEntitySet = oContainer[sKey];
          if (oEntitySet && oEntitySet.$Type) {
            const sEntityType = oEntitySet.$Type;
            const bIsSystem = sKey.toLowerCase().startsWith("sys");
            const bIsBusiness = sKey.toLowerCase().startsWith("bus");

            // Include business entities and optionally system entities
            if (bIsBusiness) {
              aEntities.push({
                name: sKey,
                entityType: sEntityType,
                description: this._getEntityDescription(sKey),
                isSystem: false,
                icon: "sap-icon://table-view",
              });
            } else if (bIsSystem) {
              aEntities.push({
                name: sKey,
                entityType: sEntityType,
                description: "System entity",
                isSystem: true,
                icon: "sap-icon://it-host",
              });
            }
          }
        });
      }
    }

    // Sort: business entities first, then system
    aEntities.sort((a, b) => {
      if (a.isSystem !== b.isSystem) {
        return a.isSystem ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    return aEntities;
  }

  /**
   * Get entity description from sys_table
   * @param {string} sEntityName - Entity name
   * @returns {string} Entity description
   * @private
   */
  private _getEntityDescription(sEntityName: string): string {
    // In a full implementation, this would fetch from sys_table
    // For now, generate a readable description
    const sCleanName = sEntityName.replace(/^bus_/, "").replace(/^sys_/, "").replace(/_/g, " ");

    return sCleanName.charAt(0).toUpperCase() + sCleanName.slice(1);
  }

  /**
   * Update no data message visibility
   * @param {boolean} bVisible - Whether to show message
   * @private
   */
  private _updateNoDataMessage(bVisible: boolean): void {
    const oMessage = this.byId("noEntitiesMessage");
    if (oMessage) {
      oMessage.setVisible(bVisible);
    }
  }

  /**
   * Handle entity search
   * @param {UI5Event} oEvent - LiveChange event
   */
  public onEntitySearch(oEvent: UI5Event): void {
    const sQuery = oEvent.getParameter("newValue") as string;
    const oList = this.byId("entityList") as any;
    const oBinding = oList?.getBinding("items");

    if (sQuery && sQuery.length > 0) {
      const aFilters = [
        new Filter("name", FilterOperator.Contains, sQuery),
        new Filter("description", FilterOperator.Contains, sQuery),
      ];
      oBinding?.filter(
        new Filter({
          filters: aFilters,
          and: false,
        })
      );
    } else {
      oBinding?.filter([]);
    }
  }

  /**
   * Handle entity selection
   * @param {UI5Event} oEvent - SelectionChange event
   */
  public onEntitySelect(oEvent: UI5Event): void {
    const oSelectedItem = oEvent.getParameter("listItem") as any;
    if (oSelectedItem) {
      const oContext = oSelectedItem.getBindingContext();
      const sEntityName = oContext?.getProperty("name") as string;

      // Navigate to list view
      this.getOwnerComponent().getRouter().navTo("list", {
        entity: sEntityName,
      });
    }
  }

  /**
   * Handle admin button press
   */
  public onAdminPress(): void {
    // Navigate to admin/dictionary management
    MessageToast.show("Admin panel - Coming soon");
  }
}
