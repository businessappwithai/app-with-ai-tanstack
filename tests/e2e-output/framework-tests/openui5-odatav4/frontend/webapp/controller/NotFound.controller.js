/**
 * Not Found Controller
 *
 * Handles navigation when requested page doesn't exist.
 *
 * Generated: 2026-02-09T13:00:26.999Z
 */
sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/routing/History"],
  (Controller, History) =>
    Controller.extend("openui5-odatav4-test-app.controller.NotFound", {
      /**
       * Handle navigation back
       */
      onNavBack: function () {
        var oHistory = History.getInstance();
        var sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          this.getOwnerComponent().getRouter().navTo("master", {}, true);
        }
      },

      /**
       * Handle home link press
       */
      onLinkPress: function () {
        this.getOwnerComponent().getRouter().navTo("master", {}, true);
      },
    })
);
