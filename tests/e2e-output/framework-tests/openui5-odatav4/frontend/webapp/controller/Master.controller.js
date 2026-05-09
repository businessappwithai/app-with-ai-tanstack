/**
 * Master Controller - Entity Navigation Menu
 *
 * Manages entity list from OData $metadata.
 * Handles entity selection and navigation to List view.
 *
 * Generated: 2026-02-09T13:00:26.996Z
 */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
  ],
  (Controller, JSONModel, Filter, FilterOperator, MessageToast) =>
    Controller.extend("openui5-odatav4-test-app.controller.Master", {
      /**
       * Controller initialization
       */
      onInit: function () {
        // Create view model
        var oViewModel = new JSONModel({
          busy: true,
          entityCount: 0,
        });
        this.getView().setModel(oViewModel, "view");

        // Load entities from metadata
        this._loadEntitiesFromMetadata();
      },

      /**
       * Load entity list from OData $metadata
       * @private
       */
      _loadEntitiesFromMetadata: function () {
        var oModel = this.getOwnerComponent().getModel();
        var oView = this.getView();

        // Wait for metadata to load
        oModel
          .getMetaModel()
          .requestObject("/")
          .then(
            function (oMetadata) {
              var aEntities = this._extractEntitiesFromMetadata(oMetadata);

              // Create entity model
              var oEntityModel = new JSONModel({
                entities: aEntities,
              });

              oView.setModel(oEntityModel);
              oView.getModel("view").setProperty("/busy", false);
              oView.getModel("view").setProperty("/entityCount", aEntities.length);

              // Show/hide no data message
              this._updateNoDataMessage(aEntities.length === 0);
            }.bind(this)
          )
          .catch(
            function (oError) {
              console.error("Failed to load metadata:", oError);
              oView.getModel("view").setProperty("/busy", false);
              this._updateNoDataMessage(true);
            }.bind(this)
          );
      },

      /**
       * Extract entity information from OData metadata
       * @param {object} oMetadata - OData metadata object
       * @returns {Array} Array of entity objects
       * @private
       */
      _extractEntitiesFromMetadata: function (oMetadata) {
        var aEntities = [];

        // Get all entity types (filter for bus_ prefixed tables)
        if (oMetadata && oMetadata.$EntityContainer) {
          var sContainerName = oMetadata.$EntityContainer;
          var oContainer = oMetadata[sContainerName];

          if (oContainer) {
            Object.keys(oContainer).forEach(
              function (sKey) {
                var oEntitySet = oContainer[sKey];
                if (oEntitySet && oEntitySet.$Type) {
                  var sEntityType = oEntitySet.$Type;
                  var bIsSystem = sKey.toLowerCase().startsWith("sys");
                  var bIsBusiness = sKey.toLowerCase().startsWith("bus");

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
              }.bind(this)
            );
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
      },

      /**
       * Get entity description from sys_table
       * @param {string} sEntityName - Entity name
       * @returns {string} Entity description
       * @private
       */
      _getEntityDescription: (sEntityName) => {
        // In a full implementation, this would fetch from sys_table
        // For now, generate a readable description
        var sCleanName = sEntityName.replace(/^bus_/, "").replace(/^sys_/, "").replace(/_/g, " ");

        return sCleanName.charAt(0).toUpperCase() + sCleanName.slice(1);
      },

      /**
       * Update no data message visibility
       * @param {boolean} bVisible - Whether to show message
       * @private
       */
      _updateNoDataMessage: function (bVisible) {
        var oMessage = this.byId("noEntitiesMessage");
        if (oMessage) {
          oMessage.setVisible(bVisible);
        }
      },

      /**
       * Handle entity search
       * @param {sap.ui.base.Event} oEvent - LiveChange event
       */
      onEntitySearch: function (oEvent) {
        var sQuery = oEvent.getParameter("newValue");
        var oList = this.byId("entityList");
        var oBinding = oList.getBinding("items");

        if (sQuery && sQuery.length > 0) {
          var aFilters = [
            new Filter("name", FilterOperator.Contains, sQuery),
            new Filter("description", FilterOperator.Contains, sQuery),
          ];
          oBinding.filter(
            new Filter({
              filters: aFilters,
              and: false,
            })
          );
        } else {
          oBinding.filter([]);
        }
      },

      /**
       * Handle entity selection
       * @param {sap.ui.base.Event} oEvent - SelectionChange event
       */
      onEntitySelect: function (oEvent) {
        var oSelectedItem = oEvent.getParameter("listItem");
        if (oSelectedItem) {
          var oContext = oSelectedItem.getBindingContext();
          var sEntityName = oContext.getProperty("name");

          // Navigate to list view
          this.getOwnerComponent().getRouter().navTo("list", {
            entity: sEntityName,
          });
        }
      },

      /**
       * Handle admin button press
       */
      onAdminPress: () => {
        // Navigate to admin/dictionary management
        MessageToast.show("Admin panel - Coming soon");
      },
    })
);
