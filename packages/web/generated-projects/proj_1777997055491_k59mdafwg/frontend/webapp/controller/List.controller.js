/**
 * List Controller - Entity Table (Column 2)
 *
 * Dynamically generates table columns from sys_field metadata.
 * Columns are ordered by seq_no_grid for runtime customization.
 * Supports search, filter, sort, and growing list pattern.
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
    "sap/ui/model/type/Date",
    "sap/ui/model/type/DateTime",
    "sap/ui/model/type/Float",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Link",
    "sap/m/ObjectNumber",
    "sap/m/ObjectStatus",
    "sap/m/CheckBox",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
  ],
  (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    Sorter,
    DateType,
    DateTimeType,
    FloatType,
    Column,
    ColumnListItem,
    Text,
    Link,
    ObjectNumber,
    ObjectStatus,
    CheckBox,
    MessageToast,
    DateFormat
  ) =>
    Controller.extend("q-a-test-project.controller.List", {
      /**
       * Controller initialization
       */
      onInit: function () {
        // Initialize view model
        var oViewModel = new JSONModel({
          busy: true,
          itemCount: 0,
          entityName: "",
          entityDisplayName: "",
          entityPath: "",
          searchQuery: "",
          fields: [],
        });
        this.getView().setModel(oViewModel, "view");

        // Attach route matched handler
        this.getOwnerComponent()
          .getRouter()
          .getRoute("list")
          .attachPatternMatched(this._onRouteMatched, this);

        this.getOwnerComponent()
          .getRouter()
          .getRoute("detail")
          .attachPatternMatched(this._onDetailRouteMatched, this);

        this.getOwnerComponent()
          .getRouter()
          .getRoute("create")
          .attachPatternMatched(this._onDetailRouteMatched, this);
      },

      /**
       * Handle list route matched
       * @param {sap.ui.base.Event} oEvent - Route event
       * @private
       */
      _onRouteMatched: function (oEvent) {
        var sEntity = oEvent.getParameter("arguments").entity;
        this._loadEntityData(sEntity);
      },

      /**
       * Handle detail route matched (keep list visible)
       * @param {sap.ui.base.Event} oEvent - Route event
       * @private
       */
      _onDetailRouteMatched: function (oEvent) {
        var sEntity = oEvent.getParameter("arguments").entity;
        if (sEntity !== this.getView().getModel("view").getProperty("/entityName")) {
          this._loadEntityData(sEntity);
        }
      },

      /**
       * Load entity data and field metadata
       * @param {string} sEntity - Entity name
       * @private
       */
      _loadEntityData: function (sEntity) {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");

        oViewModel.setProperty("/busy", true);
        oViewModel.setProperty("/entityName", sEntity);
        oViewModel.setProperty("/entityDisplayName", this._formatEntityName(sEntity));
        oViewModel.setProperty("/entityPath", "/" + sEntity);

        // Load field metadata from sys_field
        this._loadFieldMetadata(sEntity)
          .then(
            function (aFields) {
              oViewModel.setProperty("/fields", aFields);
              this._buildTableColumns(aFields);
              this._bindTableItems(sEntity);
              oViewModel.setProperty("/busy", false);
            }.bind(this)
          )
          .catch(
            function (oError) {
              console.error("Failed to load field metadata:", oError);
              // Fall back to default columns
              this._buildDefaultColumns(sEntity);
              this._bindTableItems(sEntity);
              oViewModel.setProperty("/busy", false);
            }.bind(this)
          );
      },

      /**
       * Load field metadata from sys_field table
       * @param {string} sEntity - Entity name
       * @returns {Promise} Promise resolving to field array
       * @private
       */
      _loadFieldMetadata: function (sEntity) {
        return new Promise(
          function (resolve, reject) {
            var oModel = this.getOwnerComponent().getModel();

            // Query sys_field for this entity, ordered by seq_no_grid
            var sPath = "/SysFields";
            var aFilters = [
              new Filter("table_name", FilterOperator.EQ, sEntity),
              new Filter("is_displayed_grid", FilterOperator.EQ, true),
              new Filter("is_active", FilterOperator.EQ, true),
            ];

            oModel
              .bindList(sPath, null, [new Sorter("seq_no_grid")], aFilters)
              .requestContexts(0, 100)
              .then((aContexts) => {
                var aFields = aContexts.map((oContext) => oContext.getObject());
                resolve(aFields);
              })
              .catch(
                function (oError) {
                  // If sys_field doesn't exist, fall back to metadata
                  console.warn("sys_field not available, using metadata fallback");
                  resolve(this._getFieldsFromMetadata(sEntity));
                }.bind(this)
              );
          }.bind(this)
        );
      },

      /**
       * Get fields from OData metadata (fallback)
       * @param {string} sEntity - Entity name
       * @returns {Array} Array of field definitions
       * @private
       */
      _getFieldsFromMetadata: function (sEntity) {
        var oModel = this.getOwnerComponent().getModel();
        var oMetaModel = oModel.getMetaModel();
        var aFields = [];

        try {
          var sEntityType = "/" + sEntity + "/";
          var oEntityType = oMetaModel.getObject(sEntityType);

          if (oEntityType) {
            var nSeq = 10;
            Object.keys(oEntityType).forEach(
              function (sKey) {
                if (!sKey.startsWith("$") && !sKey.startsWith("@")) {
                  var oProperty = oEntityType[sKey];
                  if (oProperty && typeof oProperty === "object" && oProperty.$Type) {
                    aFields.push({
                      column_name: sKey,
                      display_name: this._formatColumnName(sKey),
                      data_type: this._mapODataType(oProperty.$Type),
                      seq_no_grid: nSeq,
                      is_displayed_grid: true,
                    });
                    nSeq += 10;
                  }
                }
              }.bind(this)
            );
          }
        } catch (e) {
          console.error("Error reading metadata:", e);
        }

        return aFields;
      },

      /**
       * Map OData type to internal type
       * @param {string} sODataType - OData type
       * @returns {string} Internal type
       * @private
       */
      _mapODataType: (sODataType) => {
        var mTypeMap = {
          "Edm.String": "string",
          "Edm.Int32": "integer",
          "Edm.Int64": "bigint",
          "Edm.Decimal": "decimal",
          "Edm.Double": "double",
          "Edm.Boolean": "boolean",
          "Edm.Date": "date",
          "Edm.DateTimeOffset": "timestamp",
          "Edm.Guid": "uuid",
        };
        return mTypeMap[sODataType] || "string";
      },

      /**
       * Build table columns dynamically
       * @param {Array} aFields - Field metadata array
       * @private
       */
      _buildTableColumns: function (aFields) {
        var oTable = this.byId("entityTable");

        // Clear existing columns
        oTable.destroyColumns();

        // Add columns based on field metadata
        aFields.forEach(
          function (oField) {
            var oColumn = new Column({
              header: new Text({ text: oField.display_name || oField.column_name }),
              width: this._getColumnWidth(oField),
              demandPopin: true,
              minScreenWidth: this._getMinScreenWidth(oField),
              popinDisplay: "Inline",
            });

            oTable.addColumn(oColumn);
          }.bind(this)
        );

        // Store field info for cell binding
        this._aFields = aFields;
      },

      /**
       * Build default columns when metadata unavailable
       * @param {string} sEntity - Entity name
       * @private
       */
      _buildDefaultColumns: function (sEntity) {
        var aDefaultFields = [
          { column_name: "id", display_name: "ID", data_type: "uuid" },
          { column_name: "name", display_name: "Name", data_type: "string" },
          { column_name: "created_at", display_name: "Created", data_type: "timestamp" },
        ];

        this._buildTableColumns(aDefaultFields);
      },

      /**
       * Bind table items to entity path
       * @param {string} sEntity - Entity name
       * @private
       */
      _bindTableItems: function (sEntity) {
        var oTable = this.byId("entityTable");
        var aFields = this._aFields || [];

        // Create cell template
        var oCellTemplate = this._createCellTemplate(aFields);

        oTable.bindItems({
          path: "/" + sEntity,
          parameters: {
            $count: true,
          },
          template: oCellTemplate,
          templateShareable: false,
          events: {
            dataReceived: this.onDataReceived.bind(this),
          },
        });
      },

      /**
       * Create cell template for table items
       * @param {Array} aFields - Field metadata
       * @returns {sap.m.ColumnListItem} Cell template
       * @private
       */
      _createCellTemplate: function (aFields) {
        var oCellTemplate = new ColumnListItem({
          type: "Navigation",
          press: this.onItemPress.bind(this),
        });

        // Add cells for each field
        aFields.forEach(
          function (oField) {
            var oCell = this._createCellControl(oField);
            oCellTemplate.addCell(oCell);
          }.bind(this)
        );

        return oCellTemplate;
      },

      /**
       * Create appropriate control for cell based on data type
       * @param {object} oField - Field metadata
       * @returns {sap.ui.core.Control} Cell control
       * @private
       */
      _createCellControl: function (oField) {
        var sColumnName = oField.column_name;
        var sDataType = oField.data_type || "string";
        var oControl;

        switch (sDataType) {
          case "boolean":
            oControl = new CheckBox({
              selected: "{" + sColumnName + "}",
              enabled: false,
            });
            break;

          case "integer":
          case "bigint":
            oControl = new ObjectNumber({
              number: "{" + sColumnName + "}",
              unit: "",
            });
            break;

          case "decimal":
          case "double":
          case "money":
            oControl = new ObjectNumber({
              number: {
                path: sColumnName,
                type: new FloatType({ decimals: 2 }),
              },
              unit: oField.reference_type === "currency" ? "{currency}" : "",
            });
            break;

          case "date":
            oControl = new Text({
              text: {
                path: sColumnName,
                type: new DateType(),
              },
            });
            break;

          case "timestamp":
            oControl = new Text({
              text: {
                path: sColumnName,
                type: new DateTimeType(),
              },
            });
            break;

          case "url":
            oControl = new Link({
              text: "{" + sColumnName + "}",
              href: "{" + sColumnName + "}",
              target: "_blank",
            });
            break;

          default:
            // Check for status-like fields
            if (sColumnName === "status" || sColumnName.endsWith("_status")) {
              oControl = new ObjectStatus({
                text: "{" + sColumnName + "}",
                state: {
                  path: sColumnName,
                  formatter: this._formatStatusState.bind(this),
                },
              });
            } else {
              oControl = new Text({
                text: "{" + sColumnName + "}",
              });
            }
            break;
        }

        // Apply field styling from sys_field
        var sStyleClass = this._buildFieldStyle(oField);
        if (sStyleClass) {
          oControl.addStyleClass(sStyleClass);
        }

        return oControl;
      },

      /**
       * Build CSS style class from field styling properties
       * @param {object} oField - Field metadata
       * @returns {string|null} CSS class name or null
       * @private
       */
      _buildFieldStyle: function (oField) {
        var aStyles = [];

        // Apply font color
        if (oField.font_color) {
          aStyles.push("color: " + oField.font_color);
        }

        // Apply background color
        if (oField.background_color) {
          aStyles.push("background-color: " + oField.background_color);
        }

        // Apply font style
        if (oField.font_style) {
          if (oField.font_style.indexOf("bold") !== -1) {
            aStyles.push("font-weight: bold");
          }
          if (oField.font_style.indexOf("italic") !== -1) {
            aStyles.push("font-style: italic");
          }
          if (oField.font_style.indexOf("underline") !== -1) {
            aStyles.push("text-decoration: underline");
          }
        }

        if (aStyles.length === 0) {
          return null;
        }

        // Create custom style class
        var sStyleClass = "listCellStyle_" + oField.column_name;
        var sStyleDef = "." + sStyleClass + " { " + aStyles.join("; ") + "; }";

        // Add style to document if not already added
        if (!this._aCustomStyles) {
          this._aCustomStyles = [];
        }
        if (this._aCustomStyles.indexOf(sStyleClass) === -1) {
          this._aCustomStyles.push(sStyleClass);
          var oStyleElement = document.createElement("style");
          oStyleElement.textContent = sStyleDef;
          document.head.appendChild(oStyleElement);
        }

        return sStyleClass;
      },

      /**
       * Format status to state
       * @param {string} sStatus - Status value
       * @returns {string} UI5 state
       * @private
       */
      _formatStatusState: (sStatus) => {
        if (!sStatus) return "None";

        var sLower = sStatus.toLowerCase();
        if (sLower === "active" || sLower === "approved" || sLower === "complete") {
          return "Success";
        } else if (sLower === "pending" || sLower === "draft") {
          return "Warning";
        } else if (sLower === "inactive" || sLower === "rejected" || sLower === "error") {
          return "Error";
        }
        return "None";
      },

      /**
       * Get column width based on data type
       * @param {object} oField - Field metadata
       * @returns {string} Column width
       * @private
       */
      _getColumnWidth: (oField) => {
        var sType = oField.data_type || "string";

        switch (sType) {
          case "boolean":
            return "5rem";
          case "uuid":
            return "12rem";
          case "integer":
          case "bigint":
            return "8rem";
          case "decimal":
          case "double":
          case "money":
            return "10rem";
          case "date":
            return "8rem";
          case "timestamp":
            return "12rem";
          default:
            return "auto";
        }
      },

      /**
       * Get minimum screen width for column
       * @param {object} oField - Field metadata
       * @returns {string} Minimum screen width
       * @private
       */
      _getMinScreenWidth: (oField) => {
        var nSeq = oField.seq_no_grid || 999;

        // First few columns always visible
        if (nSeq <= 30) return "";

        // Middle columns hide on tablet
        if (nSeq <= 60) return "Tablet";

        // Later columns hide on desktop
        return "Desktop";
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
       * Format column name for display
       * @param {string} sColumn - Column name
       * @returns {string} Formatted name
       * @private
       */
      _formatColumnName: (sColumn) =>
        sColumn.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),

      /**
       * Handle data received event
       * @param {sap.ui.base.Event} oEvent - Data received event
       */
      onDataReceived: function (oEvent) {
        var oSource = oEvent.getSource();
        var nCount = oSource.getLength();
        this.getView().getModel("view").setProperty("/itemCount", nCount);
      },

      /**
       * Handle item press - navigate to detail
       * @param {sap.ui.base.Event} oEvent - Press event
       */
      onItemPress: function (oEvent) {
        var oItem = oEvent.getSource();
        var oContext = oItem.getBindingContext();
        var sId = oContext.getProperty("id");
        var sEntity = this.getView().getModel("view").getProperty("/entityName");

        this.getOwnerComponent().getRouter().navTo("detail", {
          entity: sEntity,
          id: sId,
        });
      },

      /**
       * Handle item selection
       * @param {sap.ui.base.Event} oEvent - Selection change event
       */
      onItemSelect: function (oEvent) {
        var oItem = oEvent.getParameter("listItem");
        if (oItem) {
          this.onItemPress({ getSource: () => oItem });
        }
      },

      /**
       * Handle search
       * @param {sap.ui.base.Event} oEvent - Search event
       */
      onSearch: function (oEvent) {
        var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
        var oTable = this.byId("entityTable");
        var oBinding = oTable.getBinding("items");

        if (sQuery && sQuery.length > 0) {
          // Build filters for searchable string fields
          var aFilters = [];
          var aFields = this._aFields || [];

          aFields.forEach((oField) => {
            if (oField.data_type === "string" || !oField.data_type) {
              aFilters.push(new Filter(oField.column_name, FilterOperator.Contains, sQuery));
            }
          });

          if (aFilters.length > 0) {
            oBinding.filter(
              new Filter({
                filters: aFilters,
                and: false,
              })
            );
          }
        } else {
          oBinding.filter([]);
        }
      },

      /**
       * Handle filter button press
       */
      onFilterPress: () => {
        MessageToast.show("Filter dialog - Coming soon");
      },

      /**
       * Handle sort button press
       */
      onSortPress: () => {
        MessageToast.show("Sort dialog - Coming soon");
      },

      /**
       * Handle refresh button press
       */
      onRefresh: function () {
        var oTable = this.byId("entityTable");
        var oBinding = oTable.getBinding("items");
        if (oBinding) {
          oBinding.refresh();
        }
      },

      /**
       * Handle create button press
       */
      onCreatePress: function () {
        var sEntity = this.getView().getModel("view").getProperty("/entityName");
        this.getOwnerComponent().getRouter().navTo("create", {
          entity: sEntity,
        });
      },

      /**
       * Handle navigation back
       */
      onNavBack: function () {
        this.getOwnerComponent().getRouter().navTo("master");
      },
    })
);
