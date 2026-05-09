/**
 * Admin Controller - Application Dictionary Management
 *
 * Manages the Application Dictionary admin interface:
 * - Loads sys_table entries with field counts
 * - Loads sys_field entries for selected table
 * - Allows seq_no editing via direct input
 * - Move up/down buttons for field reordering
 * - Drag-and-drop field reordering
 * - Batch save changes to sys_field via OData
 * - Overview statistics for sys_table, sys_column, sys_field, sys_window
 *
 * Generated: 2026-05-06T11:42:08.768Z
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
    Controller.extend("q-a-test-project.controller.Admin", {
      /**
       * Controller initialization
       */
      onInit: function () {
        // Initialize view model with extended state
        var oViewModel = new JSONModel({
          busy: false,
          hasChanges: false,
          selectedEntity: "",
          selectedEntityName: "",
          layoutMode: "form", // "form" or "grid"
          fields: [],
          visibleFields: [],
          originalFields: [],
          tables: [],
          allTables: [],
          stats: {
            tableCount: 0,
            columnCount: 0,
            fieldCount: 0,
            windowCount: 0,
          },
        });
        this.getView().setModel(oViewModel, "view");

        // Load sys_table entries and statistics
        this._loadSysTables();
        this._loadStatistics();
      },

      /**
       * Load sys_table entries from OData
       * @private
       */
      _loadSysTables: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var oModel = this.getOwnerComponent().getModel();

        oViewModel.setProperty("/busy", true);

        // Load all sys_table entries
        oModel
          .bindList("/SysTables", null, [new Sorter("name")], [])
          .requestContexts(0, 500)
          .then(
            function (aContexts) {
              var aTables = aContexts.map((oContext) => Object.assign({}, oContext.getObject()));

              // Load field counts for each table
              this._loadFieldCountsForTables(aTables).then(
                function (aTablesWithCounts) {
                  oViewModel.setProperty("/tables", aTablesWithCounts);
                  oViewModel.setProperty(
                    "/allTables",
                    JSON.parse(JSON.stringify(aTablesWithCounts))
                  );
                  oViewModel.setProperty("/stats/tableCount", aTablesWithCounts.length);
                  oViewModel.setProperty("/busy", false);

                  // Select first table by default if available
                  if (aTablesWithCounts.length > 0) {
                    var oTable = this.byId("sysTableList");
                    if (oTable && oTable.getItems().length > 0) {
                      oTable.setSelectedItem(oTable.getItems()[0]);
                      this._selectTable(aTablesWithCounts[0]);
                    }
                  }
                }.bind(this)
              );
            }.bind(this)
          )
          .catch((oError) => {
            console.error("Failed to load sys_table entries:", oError);
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to load entity list from sys_table");
          });
      },

      /**
       * Load field counts for all tables
       * @param {Array} aTables - Table entries
       * @returns {Promise<Array>} Tables with field counts
       * @private
       */
      _loadFieldCountsForTables: function (aTables) {
        var oModel = this.getOwnerComponent().getModel();

        // Load all sys_field entries to calculate counts
        return oModel
          .bindList("/SysFields", null, [], [])
          .requestContexts(0, 2000)
          .then((aFieldContexts) => {
            var mFieldCounts = {};

            aFieldContexts.forEach((oContext) => {
              var oField = oContext.getObject();
              var sTableName = oField.table_name;
              if (sTableName) {
                mFieldCounts[sTableName] = (mFieldCounts[sTableName] || 0) + 1;
              }
            });

            return aTables.map((oTable) => {
              oTable.fieldCount = mFieldCounts[oTable.table_name] || 0;
              return oTable;
            });
          })
          .catch(() => {
            // If field count loading fails, return tables without counts
            return aTables.map((oTable) => {
              oTable.fieldCount = 0;
              return oTable;
            });
          });
      },

      /**
       * Load overview statistics (counts for sys_column, sys_field, sys_window)
       * @private
       */
      _loadStatistics: function () {
        var oViewModel = this.getView().getModel("view");
        var oModel = this.getOwnerComponent().getModel();

        // Load column count
        oModel
          .bindList("/SysColumns", null, [], [])
          .requestContexts(0, 1)
          .then((aContexts) => {
            // Use the binding's $count if available, or count the total
            oModel
              .bindList("/SysColumns")
              .requestContexts(0, 5000)
              .then((aAllContexts) => {
                oViewModel.setProperty("/stats/columnCount", aAllContexts.length);
              });
          })
          .catch(() => {
            oViewModel.setProperty("/stats/columnCount", 0);
          });

        // Load field count
        oModel
          .bindList("/SysFields", null, [], [])
          .requestContexts(0, 5000)
          .then((aContexts) => {
            oViewModel.setProperty("/stats/fieldCount", aContexts.length);
          })
          .catch(() => {
            oViewModel.setProperty("/stats/fieldCount", 0);
          });

        // Load window count
        oModel
          .bindList("/SysWindows", null, [], [])
          .requestContexts(0, 500)
          .then((aContexts) => {
            oViewModel.setProperty("/stats/windowCount", aContexts.length);
          })
          .catch(() => {
            oViewModel.setProperty("/stats/windowCount", 0);
          });
      },

      /**
       * Load entity list from metadata (fallback for non-sys_table entities)
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
       * Handle sys_table selection change in the table list
       * @param {sap.ui.base.Event} oEvent - Selection change event
       */
      onTableSelectionChange: function (oEvent) {
        var oViewModel = this.getView().getModel("view");
        var oSelectedItem = oEvent.getParameter("listItem");

        if (!oSelectedItem) return;

        var oBindingContext = oSelectedItem.getBindingContext("view");
        if (!oBindingContext) return;

        var oTable = oBindingContext.getObject();

        // Check for unsaved changes before switching
        if (oViewModel.getProperty("/hasChanges")) {
          MessageBox.confirm("You have unsaved changes. Discard them?", {
            onClose: function (sAction) {
              if (sAction === MessageBox.Action.OK) {
                this._selectTable(oTable);
              }
            }.bind(this),
          });
        } else {
          this._selectTable(oTable);
        }
      },

      /**
       * Select a table and load its fields
       * @param {object} oTable - Table object from sys_table
       * @private
       */
      _selectTable: function (oTable) {
        var oViewModel = this.getView().getModel("view");

        oViewModel.setProperty("/selectedEntity", oTable.table_name);
        oViewModel.setProperty("/selectedEntityName", oTable.name || oTable.table_name);
        oViewModel.setProperty("/hasChanges", false);

        this._loadFieldMetadata(oTable.table_name);
      },

      /**
       * Handle table search
       * @param {sap.ui.base.Event} oEvent - Live change event
       */
      onTableSearch: function (oEvent) {
        var sQuery = oEvent.getParameter("newValue").toLowerCase();
        var oViewModel = this.getView().getModel("view");
        var aTables = oViewModel.getProperty("/allTables");

        if (!sQuery) {
          oViewModel.setProperty("/tables", aTables);
          return;
        }

        var aFiltered = aTables.filter(
          (oTable) =>
            (oTable.name && oTable.name.toLowerCase().indexOf(sQuery) > -1) ||
            (oTable.table_name && oTable.table_name.toLowerCase().indexOf(sQuery) > -1) ||
            (oTable.description && oTable.description.toLowerCase().indexOf(sQuery) > -1)
        );

        oViewModel.setProperty("/tables", aFiltered);
      },

      /**
       * Load field metadata for entity from sys_field
       * @param {string} sEntity - Entity/table name
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
          .then(
            function (aContexts) {
              var aFields = aContexts.map((oContext) => Object.assign({}, oContext.getObject()));

              oViewModel.setProperty("/fields", aFields);
              oViewModel.setProperty("/originalFields", JSON.parse(JSON.stringify(aFields)));
              oViewModel.setProperty("/busy", false);

              // Update visible fields for preview
              this._updateVisibleFields();
            }.bind(this)
          )
          .catch((oError) => {
            console.error("Failed to load fields:", oError);
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to load field configuration for " + sEntity);
          });
      },

      /**
       * Update the visible fields list for the preview panel
       * @private
       */
      _updateVisibleFields: function () {
        var oViewModel = this.getView().getModel("view");
        var aFields = oViewModel.getProperty("/fields");
        var sLayoutMode = oViewModel.getProperty("/layoutMode");
        var sDisplayField = sLayoutMode === "form" ? "is_displayed" : "is_displayed_grid";
        var sSeqField = sLayoutMode === "form" ? "seq_no" : "seq_no_grid";

        var aVisible = aFields
          .filter((oField) => oField[sDisplayField])
          .sort((a, b) => (a[sSeqField] || 0) - (b[sSeqField] || 0));

        oViewModel.setProperty("/visibleFields", aVisible);
      },

      /**
       * Handle entity selection change (legacy dropdown - kept for backward compatibility)
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
       * Handle layout mode change (form/grid toggle)
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
        this._recalculateSeqNumbers(aFields);

        // Update model
        oViewModel.setProperty("/fields", aFields);
        oViewModel.setProperty("/hasChanges", true);
        this._updateVisibleFields();
      },

      /**
       * Move a field up one position
       * @param {sap.ui.base.Event} oEvent - Button press event
       */
      onMoveFieldUp: function (oEvent) {
        var oViewModel = this.getView().getModel("view");
        var oSource = oEvent.getSource();

        // Get the field item from the button's parent hierarchy
        var oListItem = oSource.getParent();
        while (oListItem && !oListItem.isA("sap.m.CustomListItem")) {
          oListItem = oListItem.getParent();
        }

        if (!oListItem) return;

        var oList = this.byId("fieldList");
        var aItems = oList.getItems();
        var nIndex = aItems.indexOf(oListItem);

        if (nIndex <= 0) return; // Already at top

        var aFields = oViewModel.getProperty("/fields");

        // Swap with previous item
        var oTemp = aFields[nIndex];
        aFields[nIndex] = aFields[nIndex - 1];
        aFields[nIndex - 1] = oTemp;

        // Recalculate sequence numbers
        this._recalculateSeqNumbers(aFields);

        oViewModel.setProperty("/fields", aFields);
        oViewModel.setProperty("/hasChanges", true);
        this._updateVisibleFields();

        MessageToast.show("Field moved up");
      },

      /**
       * Move a field down one position
       * @param {sap.ui.base.Event} oEvent - Button press event
       */
      onMoveFieldDown: function (oEvent) {
        var oViewModel = this.getView().getModel("view");
        var oSource = oEvent.getSource();

        // Get the field item from the button's parent hierarchy
        var oListItem = oSource.getParent();
        while (oListItem && !oListItem.isA("sap.m.CustomListItem")) {
          oListItem = oListItem.getParent();
        }

        if (!oListItem) return;

        var oList = this.byId("fieldList");
        var aItems = oList.getItems();
        var nIndex = aItems.indexOf(oListItem);

        var aFields = oViewModel.getProperty("/fields");

        if (nIndex >= aFields.length - 1) return; // Already at bottom

        // Swap with next item
        var oTemp = aFields[nIndex];
        aFields[nIndex] = aFields[nIndex + 1];
        aFields[nIndex + 1] = oTemp;

        // Recalculate sequence numbers
        this._recalculateSeqNumbers(aFields);

        oViewModel.setProperty("/fields", aFields);
        oViewModel.setProperty("/hasChanges", true);
        this._updateVisibleFields();

        MessageToast.show("Field moved down");
      },

      /**
       * Handle seq_no direct editing
       * @param {sap.ui.base.Event} oEvent - Input change event
       */
      onSeqNoChange: function (oEvent) {
        this.getView().getModel("view").setProperty("/hasChanges", true);
        this._updateVisibleFields();
      },

      /**
       * Handle visibility toggle
       * @param {sap.ui.base.Event} oEvent - Select event
       */
      onVisibilityChange: function (oEvent) {
        this.getView().getModel("view").setProperty("/hasChanges", true);
        this._updateVisibleFields();
      },

      /**
       * Recalculate sequence numbers after reordering
       * @param {Array} aFields - Field array
       * @private
       */
      _recalculateSeqNumbers: function (aFields) {
        var oViewModel = this.getView().getModel("view");
        var sLayoutMode = oViewModel.getProperty("/layoutMode");
        var sSeqField = sLayoutMode === "form" ? "seq_no" : "seq_no_grid";

        aFields.forEach((oField, nIndex) => {
          oField[sSeqField] = (nIndex + 1) * 10;
        });
      },

      /**
       * Handle refresh button press
       */
      onRefreshPress: function () {
        var oViewModel = this.getView().getModel("view");

        if (oViewModel.getProperty("/hasChanges")) {
          MessageBox.confirm("You have unsaved changes. Discard them and refresh?", {
            onClose: function (sAction) {
              if (sAction === MessageBox.Action.OK) {
                this._doRefresh();
              }
            }.bind(this),
          });
        } else {
          this._doRefresh();
        }
      },

      /**
       * Perform full refresh of all data
       * @private
       */
      _doRefresh: function () {
        var oViewModel = this.getView().getModel("view");
        oViewModel.setProperty("/hasChanges", false);

        this._loadSysTables();
        this._loadStatistics();

        var sEntity = oViewModel.getProperty("/selectedEntity");
        if (sEntity) {
          this._loadFieldMetadata(sEntity);
        }
      },

      /**
       * Handle save button press - saves all changed fields via OData
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

        // Batch update changed fields via OData
        this._batchUpdateFields(aChangedFields, sLayoutMode)
          .then(
            function () {
              oViewModel.setProperty("/hasChanges", false);
              oViewModel.setProperty("/originalFields", JSON.parse(JSON.stringify(aFields)));
              oViewModel.setProperty("/busy", false);
              MessageToast.show(aChangedFields.length + " field(s) saved successfully");

              // Refresh table field counts
              this._loadSysTables();
            }.bind(this)
          )
          .catch((oError) => {
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to save changes: " + (oError.message || "Unknown error"));
          });
      },

      /**
       * Get fields that have changed compared to original
       * @param {Array} aFields - Current fields
       * @param {Array} aOriginalFields - Original fields
       * @param {string} sLayoutMode - Layout mode (form/grid)
       * @returns {Array} Changed fields with their updated values
       * @private
       */
      _getChangedFields: (aFields, aOriginalFields, sLayoutMode) => {
        var aChanged = [];
        var sSeqField = sLayoutMode === "form" ? "seq_no" : "seq_no_grid";
        var sDisplayField = sLayoutMode === "form" ? "is_displayed" : "is_displayed_grid";

        aFields.forEach((oField) => {
          var sFieldId = oField.sys_field_id || oField.id;
          var oOriginal = aOriginalFields.find((o) => (o.sys_field_id || o.id) === sFieldId);

          if (oOriginal) {
            if (
              oField[sSeqField] !== oOriginal[sSeqField] ||
              oField[sDisplayField] !== oOriginal[sDisplayField]
            ) {
              aChanged.push({
                id: sFieldId,
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

        // Queue updates for each changed field
        var aPromises = aChangedFields.map((oField) => {
          var sPath = "/SysFields('" + oField.id + "')";

          return new Promise((resolve, reject) => {
            var oBinding = oModel.bindContext(sPath);
            oBinding
              .requestObject()
              .then(() => {
                var oContext = oBinding.getBoundContext();

                // Update only the changed properties
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
