/**
 * Not Found Controller
 *
 * Handles navigation when requested page doesn't exist.
 *
 * Generated: 2026-05-06T11:42:08.769Z
 */
sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/routing/History"],
  (Controller, History) =>
    Controller.extend("q-a-test-project.controller.NotFound", {
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
