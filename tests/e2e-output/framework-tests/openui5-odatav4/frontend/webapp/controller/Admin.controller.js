/**
 * Admin Controller - Field Layout Management
 *
 * Manages runtime modification of field ordering.
 * Updates sys_field.seq_no and seq_no_grid for drag-drop reordering.
 * Implements batch updates for performance.
 *
 * Generated: 2026-02-09T13:00:26.998Z
 */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
  ],
  (Controller, JSONModel, Filter, FilterOperator, Sorter, MessageBox, MessageToast) =>
    Controller.extend("openui5-odatav4-test-app.controller.Admin", {
      /**
       * Controller initialization
       */
      onInit: function () {
        // Initialize view model
        var oViewModel = new JSONModel({
          busy: false,
          hasChanges: false,
          selectedEntity: "",
          layoutMode: "form", // "form" or "grid"
          fields: [],
          originalFields: [],
        });
        this.getView().setModel(oViewModel, "view");

        // Load entity list
        this._loadEntities();
      },

      /**
       * Load entity list from metadata
       * @private
       */
      _loadEntities: function () {
        var oModel = this.getOwnerComponent().getModel();
        var oView = this.getView();

        oModel
          .getMetaModel()
          .requestObject("/")
          .then(
            function (oMetadata) {
              var aEntities = this._extractBusinessEntities(oMetadata);

              var oEntityModel = new JSONModel({
                entities: aEntities,
              });
              oView.setModel(oEntityModel);

              // Select first entity by default
              if (aEntities.length > 0) {
                oView.getModel("view").setProperty("/selectedEntity", aEntities[0].name);
                this._loadFieldMetadata(aEntities[0].name);
              }
            }.bind(this)
          )
          .catch((oError) => {
            console.error("Failed to load metadata:", oError);
          });
      },

      /**
       * Extract business entities from metadata
       * @param {object} oMetadata - OData metadata
       * @returns {Array} Business entities
       * @private
       */
      _extractBusinessEntities: function (oMetadata) {
        var aEntities = [];

        if (oMetadata && oMetadata.$EntityContainer) {
          var sContainerName = oMetadata.$EntityContainer;
          var oContainer = oMetadata[sContainerName];

          if (oContainer) {
            Object.keys(oContainer).forEach(
              function (sKey) {
                // Include business entities (bus_ prefix)
                if (sKey.toLowerCase().startsWith("bus")) {
                  aEntities.push({
                    name: sKey,
                    displayName: this._formatEntityName(sKey),
                  });
                }
              }.bind(this)
            );
          }
        }

        return aEntities.sort((a, b) => a.name.localeCompare(b.name));
      },

      /**
       * Load field metadata for entity
       * @param {string} sEntity - Entity name
       * @private
       */
      _loadFieldMetadata: function (sEntity) {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var sLayoutMode = oViewModel.getProperty("/layoutMode");

        oViewModel.setProperty("/busy", true);
        oViewModel.setProperty("/hasChanges", false);

        var oModel = this.getOwnerComponent().getModel();
        var sSortField = sLayoutMode === "form" ? "seq_no" : "seq_no_grid";

        var aFilters = [
          new Filter("table_name", FilterOperator.EQ, sEntity),
          new Filter("is_active", FilterOperator.EQ, true),
        ];

        oModel
          .bindList("/SysFields", null, [new Sorter(sSortField)], aFilters)
          .requestContexts(0, 200)
          .then((aContexts) => {
            var aFields = aContexts.map((oContext) => Object.assign({}, oContext.getObject()));

            oViewModel.setProperty("/fields", aFields);
            oViewModel.setProperty("/originalFields", JSON.parse(JSON.stringify(aFields)));
            oViewModel.setProperty("/busy", false);
          })
          .catch((oError) => {
            console.error("Failed to load fields:", oError);
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to load field configuration");
          });
      },

      /**
       * Handle entity selection change
       * @param {sap.ui.base.Event} oEvent - Change event
       */
      onEntityChange: function (oEvent) {
        var oViewModel = this.getView().getModel("view");

        // Check for unsaved changes
        if (oViewModel.getProperty("/hasChanges")) {
          MessageBox.confirm("You have unsaved changes. Discard them?", {
            onClose: function (sAction) {
              if (sAction === MessageBox.Action.OK) {
                var sEntity = oEvent.getParameter("selectedItem").getKey();
                this._loadFieldMetadata(sEntity);
              } else {
                // Revert selection
                var sPrevEntity = oViewModel.getProperty("/selectedEntity");
                oEvent.getSource().setSelectedKey(sPrevEntity);
              }
            }.bind(this),
          });
        } else {
          var sEntity = oEvent.getParameter("selectedItem").getKey();
          oViewModel.setProperty("/selectedEntity", sEntity);
          this._loadFieldMetadata(sEntity);
        }
      },

      /**
       * Handle layout mode change
       * @param {sap.ui.base.Event} oEvent - Selection change event
       */
      onModeChange: function (oEvent) {
        var oViewModel = this.getView().getModel("view");
        var sEntity = oViewModel.getProperty("/selectedEntity");

        if (sEntity) {
          this._loadFieldMetadata(sEntity);
        }
      },

      /**
       * Handle field drag and drop
       * @param {sap.ui.base.Event} oEvent - Drop event
       */
      onFieldDrop: function (oEvent) {
        var oViewModel = this.getView().getModel("view");
        var oDraggedItem = oEvent.getParameter("draggedControl");
        var oDroppedItem = oEvent.getParameter("droppedControl");
        var sDropPosition = oEvent.getParameter("dropPosition");

        if (!oDraggedItem || !oDroppedItem) return;

        var oList = this.byId("fieldList");
        var aItems = oList.getItems();
        var aFields = oViewModel.getProperty("/fields");

        // Get indices
        var nDraggedIndex = aItems.indexOf(oDraggedItem);
        var nDroppedIndex = aItems.indexOf(oDroppedItem);

        if (nDraggedIndex === -1 || nDroppedIndex === -1) return;

        // Adjust for drop position
        if (sDropPosition === "After") {
          nDroppedIndex++;
        }

        // Move field in array
        var oMovedField = aFields.splice(nDraggedIndex, 1)[0];
        if (nDraggedIndex < nDroppedIndex) {
          nDroppedIndex--;
        }
        aFields.splice(nDroppedIndex, 0, oMovedField);

        // Recalculate sequence numbers
        var sLayoutMode = oViewModel.getProperty("/layoutMode");
        var sSeqField = sLayoutMode === "form" ? "seq_no" : "seq_no_grid";

        aFields.forEach((oField, nIndex) => {
          oField[sSeqField] = (nIndex + 1) * 10;
        });

        // Update model
        oViewModel.setProperty("/fields", aFields);
        oViewModel.setProperty("/hasChanges", true);
      },

      /**
       * Handle visibility toggle
       * @param {sap.ui.base.Event} oEvent - Select event
       */
      onVisibilityChange: function (oEvent) {
        this.getView().getModel("view").setProperty("/hasChanges", true);
      },

      /**
       * Handle save button press
       */
      onSavePress: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var aFields = oViewModel.getProperty("/fields");
        var aOriginalFields = oViewModel.getProperty("/originalFields");
        var sLayoutMode = oViewModel.getProperty("/layoutMode");

        // Find changed fields
        var aChangedFields = this._getChangedFields(aFields, aOriginalFields, sLayoutMode);

        if (aChangedFields.length === 0) {
          MessageToast.show("No changes to save");
          return;
        }

        oViewModel.setProperty("/busy", true);

        // Batch update changed fields
        this._batchUpdateFields(aChangedFields, sLayoutMode)
          .then(() => {
            oViewModel.setProperty("/hasChanges", false);
            oViewModel.setProperty("/originalFields", JSON.parse(JSON.stringify(aFields)));
            oViewModel.setProperty("/busy", false);
            MessageToast.show("Field layout saved successfully");
          })
          .catch((oError) => {
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to save changes: " + (oError.message || "Unknown error"));
          });
      },

      /**
       * Get fields that have changed
       * @param {Array} aFields - Current fields
       * @param {Array} aOriginalFields - Original fields
       * @param {string} sLayoutMode - Layout mode
       * @returns {Array} Changed fields
       * @private
       */
      _getChangedFields: (aFields, aOriginalFields, sLayoutMode) => {
        var aChanged = [];
        var sSeqField = sLayoutMode === "form" ? "seq_no" : "seq_no_grid";
        var sDisplayField = sLayoutMode === "form" ? "is_displayed" : "is_displayed_grid";

        aFields.forEach((oField) => {
          var oOriginal = aOriginalFields.find((o) => o.id === oField.id);

          if (oOriginal) {
            if (
              oField[sSeqField] !== oOriginal[sSeqField] ||
              oField[sDisplayField] !== oOriginal[sDisplayField]
            ) {
              aChanged.push({
                id: oField.id,
                [sSeqField]: oField[sSeqField],
                [sDisplayField]: oField[sDisplayField],
              });
            }
          }
        });

        return aChanged;
      },

      /**
       * Batch update fields via OData
       * @param {Array} aChangedFields - Fields to update
       * @param {string} sLayoutMode - Layout mode
       * @returns {Promise} Update promise
       * @private
       */
      _batchUpdateFields: function (aChangedFields, sLayoutMode) {
        var oModel = this.getOwnerComponent().getModel();

        // Create batch group
        var sGroupId = "fieldUpdate";
        oModel.setGroupId(sGroupId);

        // Queue updates
        var aPromises = aChangedFields.map((oField) => {
          var sPath = "/SysFields('" + oField.id + "')";

          return new Promise((resolve, reject) => {
            var oBinding = oModel.bindContext(sPath);
            oBinding
              .requestObject()
              .then(() => {
                var oContext = oBinding.getBoundContext();

                // Update properties
                Object.keys(oField).forEach((sKey) => {
                  if (sKey !== "id") {
                    oContext.setProperty(sKey, oField[sKey]);
                  }
                });

                resolve();
              })
              .catch(reject);
          });
        });

        return Promise.all(aPromises).then(() => oModel.submitBatch(sGroupId));
      },

      /**
       * Format entity name for display
       * @param {string} sEntity - Entity name
       * @returns {string} Formatted name
       * @private
       */
      _formatEntityName: (sEntity) =>
        sEntity
          .replace(/^bus_/, "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),

      /**
       * Handle navigation back
       */
      onNavBack: function () {
        var oViewModel = this.getView().getModel("view");

        if (oViewModel.getProperty("/hasChanges")) {
          MessageBox.confirm("You have unsaved changes. Discard them?", {
            onClose: function (sAction) {
              if (sAction === MessageBox.Action.OK) {
                this.getOwnerComponent().getRouter().navTo("master");
              }
            }.bind(this),
          });
        } else {
          this.getOwnerComponent().getRouter().navTo("master");
        }
      },
    })
);
