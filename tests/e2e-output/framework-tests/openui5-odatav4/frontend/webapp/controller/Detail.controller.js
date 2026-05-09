/**
 * Detail Controller - Object Page (Column 3)
 *
 * Dynamically generates form fields from sys_field metadata.
 * Fields are ordered by seq_no for runtime customization.
 * Supports display/edit modes, save, and delete operations.
 *
 * Generated: 2026-02-09T13:00:26.996Z
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
    "sap/ui/core/format/DateFormat",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/Input",
    "sap/m/TextArea",
    "sap/m/CheckBox",
    "sap/m/DatePicker",
    "sap/m/DateTimePicker",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
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
    DateFormat,
    Label,
    Text,
    Input,
    TextArea,
    CheckBox,
    DatePicker,
    DateTimePicker,
    Select,
    Item,
    MessageBox,
    MessageToast
  ) =>
    Controller.extend("openui5-odatav4-test-app.controller.Detail", {
      /**
       * Controller initialization
       */
      onInit: function () {
        // Initialize view model
        var oViewModel = new JSONModel({
          busy: true,
          editMode: false,
          showSystemFields: false,
          title: "",
          status: "",
          statusState: "None",
          id: "",
          entityName: "",
          entityPath: "",
          fields: [],
          originalData: null,
        });
        this.getView().setModel(oViewModel, "view");

        // Attach route matched handler
        this.getOwnerComponent()
          .getRouter()
          .getRoute("detail")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      /**
       * Handle route matched
       * @param {sap.ui.base.Event} oEvent - Route event
       * @private
       */
      _onRouteMatched: function (oEvent) {
        var oArgs = oEvent.getParameter("arguments");
        var sEntity = oArgs.entity;
        var sId = oArgs.id;

        var oViewModel = this.getView().getModel("view");
        oViewModel.setProperty("/busy", true);
        oViewModel.setProperty("/editMode", false);
        oViewModel.setProperty("/entityName", sEntity);
        oViewModel.setProperty("/id", sId);
        oViewModel.setProperty("/entityPath", "/" + sEntity + "('" + sId + "')");

        // Load field metadata and entity data
        this._loadFieldMetadata(sEntity)
          .then(
            function (aFields) {
              oViewModel.setProperty("/fields", aFields);
              this._buildFormFields(aFields);
              this._bindEntityData(sEntity, sId);
            }.bind(this)
          )
          .catch(
            function (oError) {
              console.error("Failed to load field metadata:", oError);
              this._buildDefaultFields(sEntity);
              this._bindEntityData(sEntity, sId);
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

            // Query sys_field for this entity, ordered by seq_no
            var sPath = "/SysFields";
            var aFilters = [
              new Filter("table_name", FilterOperator.EQ, sEntity),
              new Filter("is_active", FilterOperator.EQ, true),
            ];

            oModel
              .bindList(sPath, null, [new Sorter("seq_no")], aFilters)
              .requestContexts(0, 200)
              .then((aContexts) => {
                var aFields = aContexts.map((oContext) => oContext.getObject());
                resolve(aFields);
              })
              .catch(
                function (oError) {
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
                    var bIsKey = oProperty.$isKey || sKey === "id";
                    var bIsSystem = [
                      "created_at",
                      "updated_at",
                      "created_by",
                      "updated_by",
                      "version",
                      "is_deleted",
                    ].includes(sKey);

                    aFields.push({
                      column_name: sKey,
                      display_name: this._formatColumnName(sKey),
                      data_type: this._mapODataType(oProperty.$Type),
                      seq_no: nSeq,
                      is_displayed: !bIsSystem,
                      is_readonly: bIsKey || bIsSystem,
                      is_mandatory: !oProperty.$Nullable && !bIsKey,
                      field_group: bIsSystem ? "system" : "general",
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
       * Build form fields dynamically
       * @param {Array} aFields - Field metadata array
       * @private
       */
      _buildFormFields: function (aFields) {
        var oGeneralForm = this.byId("generalForm");
        var oDetailsForm = this.byId("detailsForm");

        // Clear existing content
        if (oGeneralForm) {
          oGeneralForm.destroyContent();
        }
        if (oDetailsForm) {
          oDetailsForm.destroyContent();
        }

        // Group fields
        var aGeneralFields = [];
        var aDetailFields = [];

        aFields.forEach(
          function (oField) {
            // Skip system fields (handled separately)
            if (oField.field_group === "system" || this._isSystemField(oField.column_name)) {
              return;
            }

            // Skip if not displayed
            if (oField.is_displayed === false) {
              return;
            }

            // Assign to group
            if (oField.field_group === "details" || oField.seq_no > 100) {
              aDetailFields.push(oField);
            } else {
              aGeneralFields.push(oField);
            }
          }.bind(this)
        );

        // Build general section
        this._addFieldsToForm(oGeneralForm, aGeneralFields);

        // Build details section
        this._addFieldsToForm(oDetailsForm, aDetailFields);

        // Store fields for later use
        this._aFields = aFields;
      },

      /**
       * Check if field is a system field
       * @param {string} sColumnName - Column name
       * @returns {boolean} True if system field
       * @private
       */
      _isSystemField: (sColumnName) => {
        var aSystemFields = [
          "id",
          "created_at",
          "updated_at",
          "created_by",
          "updated_by",
          "version",
          "is_deleted",
        ];
        return aSystemFields.includes(sColumnName);
      },

      /**
       * Add fields to form control
       * @param {sap.ui.layout.form.SimpleForm} oForm - Form control
       * @param {Array} aFields - Field metadata
       * @private
       */
      _addFieldsToForm: function (oForm, aFields) {
        if (!oForm) return;

        aFields.forEach(
          function (oField) {
            // Build custom style from sys_field styling properties
            var oLabelStyle = this._buildFieldStyle(oField, true);
            var oControlStyle = this._buildFieldStyle(oField, false);

            // Add label with styling
            var oLabel = new Label({
              text: oField.display_name || this._formatColumnName(oField.column_name),
              required: oField.is_mandatory,
            });
            if (oLabelStyle) {
              oLabel.addStyleClass(oLabelStyle);
            }
            oForm.addContent(oLabel);

            // Add display control with styling
            var oDisplayControl = this._createDisplayControl(oField);
            if (oControlStyle) {
              oDisplayControl.addStyleClass(oControlStyle);
            }
            oForm.addContent(oDisplayControl);
          }.bind(this)
        );
      },

      /**
       * Build CSS style class from field styling properties
       * @param {object} oField - Field metadata
       * @param {boolean} bIsLabel - True for label, false for control
       * @returns {string|null} CSS class name or null
       * @private
       */
      _buildFieldStyle: function (oField, bIsLabel) {
        var aStyles = [];

        // Apply font color
        if (oField.font_color) {
          aStyles.push("color: " + oField.font_color);
        }

        // Apply background color (only for controls, not labels)
        if (!bIsLabel && oField.background_color) {
          aStyles.push("background-color: " + oField.background_color);
        }

        // Apply font style
        if (oField.font_style) {
          if (oField.font_style.includes("bold")) {
            aStyles.push("font-weight: bold");
          }
          if (oField.font_style.includes("italic")) {
            aStyles.push("font-style: italic");
          }
          if (oField.font_style.includes("underline")) {
            aStyles.push("text-decoration: underline");
          }
        }

        if (aStyles.length === 0) {
          return null;
        }

        // Create custom style class
        var sStyleClass = "customFieldStyle_" + oField.column_name;
        var sStyleDef = "." + sStyleClass + " { " + aStyles.join("; ") + "; }";

        // Add style to document if not already added
        if (!this._aCustomStyles) {
          this._aCustomStyles = [];
        }
        if (!this._aCustomStyles.includes(sStyleClass)) {
          this._aCustomStyles.push(sStyleClass);
          var oStyleElement = document.createElement("style");
          oStyleElement.textContent = sStyleDef;
          document.head.appendChild(oStyleElement);
        }

        return sStyleClass;
      },

      /**
       * Create display/edit control for field
       * @param {object} oField - Field metadata
       * @returns {sap.ui.core.Control} Control instance
       * @private
       */
      _createDisplayControl: function (oField) {
        var sColumnName = oField.column_name;
        var sDataType = oField.data_type || "string";
        var bReadonly = oField.is_readonly;

        // Create composite control that switches between display/edit
        switch (sDataType) {
          case "boolean":
            return new CheckBox({
              selected: "{" + sColumnName + "}",
              enabled: "{= ${view>/editMode} && !" + bReadonly + " }",
            });

          case "text":
          case "longtext":
            return new TextArea({
              value: "{" + sColumnName + "}",
              editable: "{= ${view>/editMode} && !" + bReadonly + " }",
              rows: 4,
              width: "100%",
            });

          case "date":
            return new DatePicker({
              value: {
                path: sColumnName,
                type: new DateType(),
              },
              editable: "{= ${view>/editMode} && !" + bReadonly + " }",
              width: "100%",
            });

          case "timestamp":
            return new DateTimePicker({
              value: {
                path: sColumnName,
                type: new DateTimeType(),
              },
              editable: "{= ${view>/editMode} && !" + bReadonly + " }",
              width: "100%",
            });

          case "integer":
          case "bigint":
            return new Input({
              value: "{" + sColumnName + "}",
              editable: "{= ${view>/editMode} && !" + bReadonly + " }",
              type: "Number",
              width: "100%",
            });

          case "decimal":
          case "double":
          case "money":
            return new Input({
              value: {
                path: sColumnName,
                type: new FloatType({ decimals: 2 }),
              },
              editable: "{= ${view>/editMode} && !" + bReadonly + " }",
              type: "Number",
              width: "100%",
            });

          default:
            // Check for reference (dropdown)
            if (oField.reference_table) {
              return this._createReferenceSelect(oField);
            }

            return new Input({
              value: "{" + sColumnName + "}",
              editable: "{= ${view>/editMode} && !" + bReadonly + " }",
              width: "100%",
              maxLength: oField.field_length || 0,
            });
        }
      },

      /**
       * Create select control for reference field
       * @param {object} oField - Field metadata
       * @returns {sap.m.Select} Select control
       * @private
       */
      _createReferenceSelect: (oField) => {
        var oSelect = new Select({
          selectedKey: "{" + oField.column_name + "}",
          enabled: "{= ${view>/editMode} && !" + oField.is_readonly + " }",
          width: "100%",
          items: {
            path: "/" + oField.reference_table,
            template: new Item({
              key: "{" + (oField.reference_key || "id") + "}",
              text: "{" + (oField.reference_display || "name") + "}",
            }),
          },
        });

        return oSelect;
      },

      /**
       * Build default fields when metadata unavailable
       * @param {string} sEntity - Entity name
       * @private
       */
      _buildDefaultFields: function (sEntity) {
        var aDefaultFields = [
          { column_name: "id", display_name: "ID", data_type: "uuid", is_readonly: true },
          { column_name: "name", display_name: "Name", data_type: "string", is_mandatory: true },
          { column_name: "description", display_name: "Description", data_type: "text" },
        ];

        this._buildFormFields(aDefaultFields);
      },

      /**
       * Bind entity data to view
       * @param {string} sEntity - Entity name
       * @param {string} sId - Entity ID
       * @private
       */
      _bindEntityData: function (sEntity, sId) {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var sPath = "/" + sEntity + "('" + sId + "')";

        // Bind view to entity
        oView.bindElement({
          path: sPath,
          events: {
            dataReceived: function (oEvent) {
              var oData = oEvent.getParameter("data");
              if (oData) {
                // Update view model with entity info
                oViewModel.setProperty("/title", oData.name || oData.id || "Entity Details");
                oViewModel.setProperty("/status", oData.status || "");
                oViewModel.setProperty("/statusState", this._getStatusState(oData.status));

                // Store original data for cancel operation
                oViewModel.setProperty("/originalData", JSON.parse(JSON.stringify(oData)));
              }
              oViewModel.setProperty("/busy", false);
            }.bind(this),
            change: () => {
              oViewModel.setProperty("/busy", false);
            },
          },
        });
      },

      /**
       * Get status state for display
       * @param {string} sStatus - Status value
       * @returns {string} UI5 state
       * @private
       */
      _getStatusState: (sStatus) => {
        if (!sStatus) return "None";

        var sLower = sStatus.toLowerCase();
        if (sLower === "active" || sLower === "approved") {
          return "Success";
        } else if (sLower === "pending" || sLower === "draft") {
          return "Warning";
        } else if (sLower === "inactive" || sLower === "rejected") {
          return "Error";
        }
        return "None";
      },

      /**
       * Format column name for display
       * @param {string} sColumn - Column name
       * @returns {string} Formatted name
       * @private
       */
      _formatColumnName: (sColumn) =>
        sColumn.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),

      /**
       * Format date/time value for display
       * @param {string|Date} vValue - Date value
       * @returns {string} Formatted date/time string
       */
      formatDateTime: (vValue) => {
        if (!vValue) {
          return "";
        }

        var oDate = vValue instanceof Date ? vValue : new Date(vValue);
        if (isNaN(oDate.getTime())) {
          return "";
        }

        var oDateFormat = DateFormat.getDateTimeInstance({
          style: "medium",
        });

        return oDateFormat.format(oDate);
      },

      /**
       * Format date value for display
       * @param {string|Date} vValue - Date value
       * @returns {string} Formatted date string
       */
      formatDate: (vValue) => {
        if (!vValue) {
          return "";
        }

        var oDate = vValue instanceof Date ? vValue : new Date(vValue);
        if (isNaN(oDate.getTime())) {
          return "";
        }

        var oDateFormat = DateFormat.getDateInstance({
          style: "medium",
        });

        return oDateFormat.format(oDate);
      },

      /**
       * Handle edit button press
       */
      onEditPress: function () {
        var oViewModel = this.getView().getModel("view");

        // Store original data
        var oContext = this.getView().getBindingContext();
        if (oContext) {
          oViewModel.setProperty("/originalData", JSON.parse(JSON.stringify(oContext.getObject())));
        }

        oViewModel.setProperty("/editMode", true);
      },

      /**
       * Handle save button press
       */
      onSavePress: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var oModel = this.getOwnerComponent().getModel();
        var oContext = oView.getBindingContext();

        if (!oContext) {
          MessageBox.error("No data to save");
          return;
        }

        // Validate required fields
        if (!this._validateRequiredFields()) {
          return;
        }

        oViewModel.setProperty("/busy", true);

        // Submit changes
        oModel
          .submitBatch("$auto")
          .then(() => {
            oViewModel.setProperty("/editMode", false);
            oViewModel.setProperty("/busy", false);
            MessageToast.show("Changes saved successfully");
          })
          .catch((oError) => {
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to save changes: " + (oError.message || "Unknown error"));
          });
      },

      /**
       * Validate required fields
       * @returns {boolean} True if valid
       * @private
       */
      _validateRequiredFields: function () {
        var aFields = this._aFields || [];
        var oContext = this.getView().getBindingContext();

        if (!oContext) return true;

        var aErrors = [];

        aFields.forEach((oField) => {
          if (oField.is_mandatory) {
            var vValue = oContext.getProperty(oField.column_name);
            if (vValue === null || vValue === undefined || vValue === "") {
              aErrors.push(oField.display_name || oField.column_name);
            }
          }
        });

        if (aErrors.length > 0) {
          MessageBox.error("Please fill in required fields: " + aErrors.join(", "));
          return false;
        }

        return true;
      },

      /**
       * Handle cancel button press
       */
      onCancelPress: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var oModel = this.getOwnerComponent().getModel();

        // Reset changes
        oModel.resetChanges();

        oViewModel.setProperty("/editMode", false);
        MessageToast.show("Changes cancelled");
      },

      /**
       * Handle delete button press
       */
      onDeletePress: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var sEntity = oViewModel.getProperty("/entityName");

        MessageBox.confirm("Are you sure you want to delete this record?", {
          title: "Confirm Delete",
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              this._deleteEntity();
            }
          }.bind(this),
        });
      },

      /**
       * Delete the current entity
       * @private
       */
      _deleteEntity: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var oModel = this.getOwnerComponent().getModel();
        var oContext = oView.getBindingContext();
        var sEntity = oViewModel.getProperty("/entityName");

        if (!oContext) return;

        oViewModel.setProperty("/busy", true);

        // Delete the entity
        oContext
          .delete("$auto")
          .then(
            function () {
              oViewModel.setProperty("/busy", false);
              MessageToast.show("Record deleted successfully");

              // Navigate back to list
              this.getOwnerComponent().getRouter().navTo("list", {
                entity: sEntity,
              });
            }.bind(this)
          )
          .catch((oError) => {
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to delete: " + (oError.message || "Unknown error"));
          });
      },

      /**
       * Handle close button press
       */
      onClosePress: function () {
        var sEntity = this.getView().getModel("view").getProperty("/entityName");
        this.getOwnerComponent().getRouter().navTo("list", {
          entity: sEntity,
        });
      },
    })
);
