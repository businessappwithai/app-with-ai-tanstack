/**
 * Create Controller - New Entity Form (Column 3)
 *
 * Dynamically generates form fields from sys_field metadata.
 * Handles validation and creation of new entity records.
 *
 * Generated: 2026-02-09T13:00:26.997Z
 */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/Label",
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
    Label,
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
    Controller.extend("openui5-odatav4-test-app.controller.Create", {
      /**
       * Controller initialization
       */
      onInit: function () {
        // Initialize view model
        var oViewModel = new JSONModel({
          busy: false,
          entityName: "",
          entityDisplayName: "",
          fields: [],
          formData: {},
        });
        this.getView().setModel(oViewModel, "view");

        // Attach route matched handler
        this.getOwnerComponent()
          .getRouter()
          .getRoute("create")
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

        var oViewModel = this.getView().getModel("view");
        oViewModel.setProperty("/busy", true);
        oViewModel.setProperty("/entityName", sEntity);
        oViewModel.setProperty("/entityDisplayName", this._formatEntityName(sEntity));
        oViewModel.setProperty("/formData", {});

        // Load field metadata
        this._loadFieldMetadata(sEntity)
          .then(
            function (aFields) {
              oViewModel.setProperty("/fields", aFields);
              this._buildFormFields(aFields);
              this._initializeFormData(aFields);
              oViewModel.setProperty("/busy", false);
            }.bind(this)
          )
          .catch(
            function (oError) {
              console.error("Failed to load field metadata:", oError);
              this._buildDefaultFields(sEntity);
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

            // Query sys_field for this entity
            var sPath = "/SysFields";
            var aFilters = [
              new Filter("table_name", FilterOperator.EQ, sEntity),
              new Filter("is_active", FilterOperator.EQ, true),
            ];

            oModel
              .bindList(sPath, null, [new Sorter("seq_no")], aFilters)
              .requestContexts(0, 200)
              .then(
                function (aContexts) {
                  var aFields = aContexts.map((oContext) => oContext.getObject());

                  // Filter out system/readonly fields
                  aFields = aFields.filter(
                    function (oField) {
                      return !oField.is_readonly && !this._isSystemField(oField.column_name);
                    }.bind(this)
                  );

                  resolve(aFields);
                }.bind(this)
              )
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
                    var bIsSystem = this._isSystemField(sKey);

                    // Only include editable fields
                    if (!bIsKey && !bIsSystem) {
                      aFields.push({
                        column_name: sKey,
                        display_name: this._formatColumnName(sKey),
                        data_type: this._mapODataType(oProperty.$Type),
                        seq_no: nSeq,
                        is_mandatory: !oProperty.$Nullable,
                      });
                      nSeq += 10;
                    }
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
        var oRequiredForm = this.byId("requiredForm");
        var oOptionalForm = this.byId("optionalForm");

        // Clear existing content
        if (oRequiredForm) {
          oRequiredForm.destroyContent();
        }
        if (oOptionalForm) {
          oOptionalForm.destroyContent();
        }

        // Separate required and optional fields
        var aRequiredFields = [];
        var aOptionalFields = [];

        aFields.forEach((oField) => {
          if (oField.is_mandatory) {
            aRequiredFields.push(oField);
          } else {
            aOptionalFields.push(oField);
          }
        });

        // Build forms
        this._addFieldsToForm(oRequiredForm, aRequiredFields);
        this._addFieldsToForm(oOptionalForm, aOptionalFields);

        // Store fields for validation
        this._aFields = aFields;
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

            // Add input control with styling
            var oInput = this._createInputControl(oField);
            if (oControlStyle) {
              oInput.addStyleClass(oControlStyle);
            }
            oForm.addContent(oInput);
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
        var sStyleClass = "createFieldStyle_" + oField.column_name;
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
       * Create input control for field
       * @param {object} oField - Field metadata
       * @returns {sap.ui.core.Control} Input control
       * @private
       */
      _createInputControl: function (oField) {
        var sColumnName = oField.column_name;
        var sDataType = oField.data_type || "string";
        var sPath = "view>/formData/" + sColumnName;

        switch (sDataType) {
          case "boolean":
            return new CheckBox({
              selected: "{" + sPath + "}",
            });

          case "text":
          case "longtext":
            return new TextArea({
              value: "{" + sPath + "}",
              rows: 4,
              width: "100%",
              required: oField.is_mandatory,
            });

          case "date":
            return new DatePicker({
              value: "{" + sPath + "}",
              valueFormat: "yyyy-MM-dd",
              displayFormat: "medium",
              width: "100%",
              required: oField.is_mandatory,
            });

          case "timestamp":
            return new DateTimePicker({
              value: "{" + sPath + "}",
              width: "100%",
              required: oField.is_mandatory,
            });

          case "integer":
          case "bigint":
            return new Input({
              value: "{" + sPath + "}",
              type: "Number",
              width: "100%",
              required: oField.is_mandatory,
            });

          case "decimal":
          case "double":
          case "money":
            return new Input({
              value: "{" + sPath + "}",
              type: "Number",
              width: "100%",
              required: oField.is_mandatory,
            });

          default:
            // Check for reference (dropdown)
            if (oField.reference_table) {
              return this._createReferenceSelect(oField, sPath);
            }

            return new Input({
              value: "{" + sPath + "}",
              width: "100%",
              maxLength: oField.field_length || 0,
              required: oField.is_mandatory,
            });
        }
      },

      /**
       * Create select control for reference field
       * @param {object} oField - Field metadata
       * @param {string} sPath - Binding path
       * @returns {sap.m.Select} Select control
       * @private
       */
      _createReferenceSelect: (oField, sPath) => {
        var oSelect = new Select({
          selectedKey: "{" + sPath + "}",
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
       * Initialize form data with defaults
       * @param {Array} aFields - Field metadata
       * @private
       */
      _initializeFormData: function (aFields) {
        var oFormData = {};

        aFields.forEach((oField) => {
          var sColumnName = oField.column_name;
          var sDataType = oField.data_type || "string";

          // Set default values based on type
          switch (sDataType) {
            case "boolean":
              oFormData[sColumnName] =
                oField.default_value === "true" || oField.default_value === true;
              break;
            case "integer":
            case "bigint":
              oFormData[sColumnName] = oField.default_value
                ? parseInt(oField.default_value, 10)
                : null;
              break;
            case "decimal":
            case "double":
            case "money":
              oFormData[sColumnName] = oField.default_value
                ? parseFloat(oField.default_value)
                : null;
              break;
            default:
              oFormData[sColumnName] = oField.default_value || "";
          }
        });

        this.getView().getModel("view").setProperty("/formData", oFormData);
      },

      /**
       * Build default fields when metadata unavailable
       * @param {string} sEntity - Entity name
       * @private
       */
      _buildDefaultFields: function (sEntity) {
        var aDefaultFields = [
          { column_name: "name", display_name: "Name", data_type: "string", is_mandatory: true },
          { column_name: "description", display_name: "Description", data_type: "text" },
        ];

        this._buildFormFields(aDefaultFields);
        this._initializeFormData(aDefaultFields);
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
       * Handle save button press
       */
      onSavePress: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var oModel = this.getOwnerComponent().getModel();
        var sEntity = oViewModel.getProperty("/entityName");
        var oFormData = oViewModel.getProperty("/formData");

        // Validate required fields
        if (!this._validateRequiredFields()) {
          return;
        }

        oViewModel.setProperty("/busy", true);

        // Create list binding and add new entry
        var oListBinding = oModel.bindList("/" + sEntity);

        // Clean form data (remove empty strings for optional fields)
        var oCleanData = this._cleanFormData(oFormData);

        // Create the entity
        var oContext = oListBinding.create(oCleanData);

        // Wait for creation to complete
        oContext
          .created()
          .then(
            function () {
              oViewModel.setProperty("/busy", false);
              MessageToast.show("Record created successfully");

              // Get the new ID and navigate to detail
              var sNewId = oContext.getProperty("id");
              this.getOwnerComponent().getRouter().navTo("detail", {
                entity: sEntity,
                id: sNewId,
              });
            }.bind(this)
          )
          .catch((oError) => {
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to create record: " + (oError.message || "Unknown error"));
          });
      },

      /**
       * Clean form data before submission
       * @param {object} oFormData - Raw form data
       * @returns {object} Cleaned form data
       * @private
       */
      _cleanFormData: (oFormData) => {
        var oCleanData = {};

        Object.keys(oFormData).forEach((sKey) => {
          var vValue = oFormData[sKey];

          // Skip empty strings for non-required fields
          if (vValue !== "" && vValue !== null && vValue !== undefined) {
            oCleanData[sKey] = vValue;
          }
        });

        return oCleanData;
      },

      /**
       * Validate required fields
       * @returns {boolean} True if valid
       * @private
       */
      _validateRequiredFields: function () {
        var aFields = this._aFields || [];
        var oFormData = this.getView().getModel("view").getProperty("/formData");
        var aErrors = [];

        aFields.forEach((oField) => {
          if (oField.is_mandatory) {
            var vValue = oFormData[oField.column_name];
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
        var sEntity = this.getView().getModel("view").getProperty("/entityName");

        MessageBox.confirm("Discard changes?", {
          title: "Confirm",
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              this.getOwnerComponent().getRouter().navTo("list", {
                entity: sEntity,
              });
            }
          }.bind(this),
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
