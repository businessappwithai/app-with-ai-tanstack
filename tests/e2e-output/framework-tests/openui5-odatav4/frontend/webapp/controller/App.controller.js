/**
 * App Controller - Flexible Column Layout Management
 *
 * Manages the FCL layout transitions and column visibility.
 * Handles navigation state for 3-column layout pattern.
 *
 * Generated: 2026-02-09T13:00:26.995Z
 */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/f/library",
    "sap/f/FlexibleColumnLayoutSemanticHelper",
    "sap/m/MessageBox",
  ],
  (Controller, JSONModel, fioriLibrary, FlexibleColumnLayoutSemanticHelper, MessageBox) => {
    // Get LayoutType from library
    var LayoutType = fioriLibrary.LayoutType;

    return Controller.extend("openui5-odatav4-test-app.controller.App", {
      /**
       * Controller initialization
       */
      onInit: function () {
        // Initialize app view model
        var oAppViewModel = new JSONModel({
          layout: LayoutType.OneColumn,
          previousLayout: null,
          actionButtonsInfo: {
            midColumn: {
              fullScreen: false,
            },
            endColumn: {
              fullScreen: false,
            },
          },
        });

        this.getView().setModel(oAppViewModel, "appView");

        // Get router and attach route matched handler
        var oRouter = this.getOwnerComponent().getRouter();
        oRouter.attachRouteMatched(this._onRouteMatched, this);

        // Initialize OData model error handler
        this._initODataErrorHandler();
      },

      /**
       * Initialize OData model error handling
       * @private
       */
      _initODataErrorHandler: function () {
        var oModel = this.getOwnerComponent().getModel();
        if (oModel) {
          oModel.attachRequestFailed(
            function (oEvent) {
              var oParams = oEvent.getParameters();
              this._showServiceError(oParams.response);
            }.bind(this)
          );
        }
      },

      /**
       * Show service error message
       * @param {object} oResponse - Error response object
       * @private
       */
      _showServiceError: (oResponse) => {
        if (oResponse && oResponse.statusCode !== 404) {
          MessageBox.error(oResponse.message || "An error occurred while loading data", {
            title: "Service Error",
            details: oResponse.responseText || "",
          });
        }
      },

      /**
       * Handle route matched events
       * @param {sap.ui.base.Event} oEvent - Route matched event
       * @private
       */
      _onRouteMatched: function (oEvent) {
        var sRouteName = oEvent.getParameter("name");
        var oArguments = oEvent.getParameter("arguments");

        // Determine layout based on route
        var sLayout = this._getLayoutForRoute(sRouteName, oArguments);

        // Update layout in model
        this.getView().getModel("appView").setProperty("/layout", sLayout);
      },

      /**
       * Get appropriate layout for route
       * @param {string} sRouteName - Route name
       * @param {object} oArguments - Route arguments
       * @returns {string} Layout type
       * @private
       */
      _getLayoutForRoute: (sRouteName, oArguments) => {
        switch (sRouteName) {
          case "master":
            return LayoutType.OneColumn;

          case "list":
            return LayoutType.TwoColumnsMidExpanded;

          case "detail":
          case "create":
            return LayoutType.ThreeColumnsMidExpanded;

          default:
            return LayoutType.OneColumn;
        }
      },

      /**
       * Handle FCL state change
       * @param {sap.ui.base.Event} oEvent - State change event
       */
      onStateChange: function (oEvent) {
        var bIsNavigationArrow = oEvent.getParameter("isNavigationArrow");
        var sLayout = oEvent.getParameter("layout");

        // Update layout in model
        this.getView().getModel("appView").setProperty("/layout", sLayout);

        // Navigate if arrow was clicked
        if (bIsNavigationArrow) {
          this._navigateToLayout(sLayout);
        }
      },

      /**
       * Navigate based on layout change
       * @param {string} sLayout - New layout
       * @private
       */
      _navigateToLayout: function (sLayout) {
        var oRouter = this.getOwnerComponent().getRouter();

        switch (sLayout) {
          case LayoutType.OneColumn:
            oRouter.navTo("master");
            break;

          case LayoutType.TwoColumnsMidExpanded: {
            // Navigate to list, preserving entity
            var sEntity = this._getCurrentEntity();
            if (sEntity) {
              oRouter.navTo("list", { entity: sEntity });
            }
            break;
          }
        }
      },

      /**
       * Get current entity from URL
       * @returns {string} Current entity name
       * @private
       */
      _getCurrentEntity: function () {
        var oRouter = this.getOwnerComponent().getRouter();
        var oHashChanger = oRouter.getHashChanger();
        var sHash = oHashChanger.getHash();

        // Extract entity from hash
        var aMatch = sHash.match(/^([^/]+)/);
        return aMatch ? aMatch[1] : null;
      },

      /**
       * Get FCL helper for layout calculations
       * @returns {sap.f.FlexibleColumnLayoutSemanticHelper} FCL helper
       */
      getFCLHelper: function () {
        var oFCL = this.byId("fcl");
        var oSettings = {
          defaultTwoColumnLayoutType: LayoutType.TwoColumnsMidExpanded,
          defaultThreeColumnLayoutType: LayoutType.ThreeColumnsMidExpanded,
        };

        return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
      },

      /**
       * Navigate to full screen for mid column
       */
      onMidColumnFullScreen: function () {
        var oModel = this.getView().getModel("appView");
        oModel.setProperty("/previousLayout", oModel.getProperty("/layout"));
        oModel.setProperty("/layout", LayoutType.MidColumnFullScreen);
      },

      /**
       * Navigate to full screen for end column
       */
      onEndColumnFullScreen: function () {
        var oModel = this.getView().getModel("appView");
        oModel.setProperty("/previousLayout", oModel.getProperty("/layout"));
        oModel.setProperty("/layout", LayoutType.EndColumnFullScreen);
      },

      /**
       * Exit full screen mode
       */
      onExitFullScreen: function () {
        var oModel = this.getView().getModel("appView");
        var sPreviousLayout = oModel.getProperty("/previousLayout");
        oModel.setProperty("/layout", sPreviousLayout || LayoutType.ThreeColumnsMidExpanded);
      },

      /**
       * Close detail column
       */
      onCloseDetailColumn: function () {
        var oRouter = this.getOwnerComponent().getRouter();
        var sEntity = this._getCurrentEntity();

        if (sEntity) {
          oRouter.navTo("list", { entity: sEntity });
        } else {
          oRouter.navTo("master");
        }
      },
    });
  }
);
