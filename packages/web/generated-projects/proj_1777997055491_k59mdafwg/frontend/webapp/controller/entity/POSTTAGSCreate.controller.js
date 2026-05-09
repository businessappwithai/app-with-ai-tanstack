/**
 * POSTTAGS Create Controller
 *
 * Handles creation of new Post Tags records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-05-06T11:42:08.786Z
 */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  (Controller, JSONModel, MessageToast, MessageBox) =>
    Controller.extend("q-a-test-project.controller.entity.POSTTAGSCreate", {
      onInit: function () {
        var oViewModel = new JSONModel({
          busy: false,
          entityName: "bus_post_tags",
          entityDisplayName: "Post Tags",
          entitySetName: "Busposttagses",
          formData: {},
        });
        this.getView().setModel(oViewModel, "view");

        this.getOwnerComponent()
          .getRouter()
          .getRoute("pOSTTAGSCreate")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function () {
        // Reset form data
        this.getView().getModel("view").setProperty("/formData", {});
      },

      onSavePress: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var oFormData = oViewModel.getProperty("/formData");
        var sEntitySet = oViewModel.getProperty("/entitySetName");

        // Basic validation

        oViewModel.setProperty("/busy", true);

        var oModel = this.getOwnerComponent().getModel();
        var oListBinding = oModel.bindList("/" + sEntitySet);
        var oContext = oListBinding.create(oFormData);

        oContext
          .created()
          .then(
            function () {
              oViewModel.setProperty("/busy", false);
              MessageToast.show("Post Tags created successfully");
              this.onNavBack();
            }.bind(this)
          )
          .catch((oError) => {
            oViewModel.setProperty("/busy", false);
            MessageBox.error("Failed to create: " + (oError.message || "Unknown error"));
          });
      },

      onCancelPress: function () {
        this.onNavBack();
      },

      onNavBack: function () {
        this.getOwnerComponent().getRouter().navTo("pOSTTAGSList");
      },
    })
);
