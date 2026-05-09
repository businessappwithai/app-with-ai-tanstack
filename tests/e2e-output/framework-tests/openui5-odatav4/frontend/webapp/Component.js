/**
 * openui5-odatav4-test-app - UI5 Component
 *
 * Main component for the SAP UI5 application.
 * Configures routing, models, and error handling.
 *
 * Generated: 2026-02-09T13:00:26.988Z
 */
sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/f/library",
    "sap/f/FlexibleColumnLayoutSemanticHelper",
    "sap/m/MessageBox",
  ],
  (UIComponent, Device, JSONModel, fioriLibrary, FlexibleColumnLayoutSemanticHelper, MessageBox) =>
    UIComponent.extend("openui5-odatav4-test-app.Component", {
      metadata: {
        manifest: "json",
      },

      /**
       * Component initialization
       */
      init: function () {
        // Call parent init
        UIComponent.prototype.init.apply(this, arguments);

        // Set device model
        var oDeviceModel = new JSONModel(Device);
        oDeviceModel.setDefaultBindingMode("OneWay");
        this.setModel(oDeviceModel, "device");

        // Initialize router
        this.getRouter().initialize();

        // Error handling
        this._setupErrorHandling();
      },

      /**
       * Setup global error handling
       * @private
       */
      _setupErrorHandling: function () {
        var oModel = this.getModel();

        if (oModel) {
          // Handle metadata loading errors
          oModel
            .getMetaModel()
            .requestObject("/")
            .catch((oError) => {
              console.error("Failed to load OData metadata:", oError);
              MessageBox.error(
                "Failed to connect to the backend service. Please check your connection and try again.",
                {
                  title: "Connection Error",
                }
              );
            });

          // Handle request failures
          oModel.attachRequestFailed((oEvent) => {
            var oParams = oEvent.getParameters();
            var sMessage = "Request failed";

            if (oParams.response) {
              var nStatus = oParams.response.statusCode;

              switch (nStatus) {
                case 401:
                  sMessage = "Authentication required. Please log in.";
                  break;
                case 403:
                  sMessage = "You don't have permission to perform this action.";
                  break;
                case 404:
                  sMessage = "The requested resource was not found.";
                  break;
                case 409:
                  sMessage =
                    "Conflict: The resource has been modified. Please refresh and try again.";
                  break;
                case 500:
                  sMessage = "Server error. Please try again later.";
                  break;
                default:
                  sMessage = oParams.response.message || sMessage;
              }
            }

            console.error("OData request failed:", oParams);
          });
        }
      },

      /**
       * Destroy component
       */
      destroy: function () {
        // Call parent destroy
        UIComponent.prototype.destroy.apply(this, arguments);
      },

      /**
       * Get content density class based on device
       * @returns {string} Content density class
       */
      getContentDensityClass: function () {
        if (!this._sContentDensityClass) {
          if (Device.support.touch) {
            this._sContentDensityClass = "sapUiSizeCozy";
          } else {
            this._sContentDensityClass = "sapUiSizeCompact";
          }
        }
        return this._sContentDensityClass;
      },

      /**
       * Get FCL helper for layout management
       * @returns {sap.f.FlexibleColumnLayoutSemanticHelper} FCL helper
       */
      getFCLHelper: function () {
        var oFCL = this.getRootControl().byId("fcl");

        if (!this._oFCLHelper && oFCL) {
          var oSettings = {
            defaultTwoColumnLayoutType: fioriLibrary.LayoutType.TwoColumnsMidExpanded,
            defaultThreeColumnLayoutType: fioriLibrary.LayoutType.ThreeColumnsMidExpanded,
          };
          this._oFCLHelper = FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
        }

        return this._oFCLHelper;
      },
    })
);
