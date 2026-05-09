/**
 * POSTS Create Controller
 *
 * Handles creation of new Posts records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-05-06T11:42:08.782Z
 */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  (Controller, JSONModel, MessageToast, MessageBox) =>
    Controller.extend("q-a-test-project.controller.entity.POSTSCreate", {
      onInit: function () {
        var oViewModel = new JSONModel({
          busy: false,
          entityName: "bus_posts",
          entityDisplayName: "Posts",
          entitySetName: "Buspostses",
          formData: {},
        });
        this.getView().setModel(oViewModel, "view");

        this.getOwnerComponent()
          .getRouter()
          .getRoute("pOSTSCreate")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function () {
        // Reset form data
        this.getView().getModel("view").setProperty("/formData", {
          title: "",
          content: "",
        });
      },

      onSavePress: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var oFormData = oViewModel.getProperty("/formData");
        var sEntitySet = oViewModel.getProperty("/entitySetName");

        // Basic validation
        if (!oFormData.title && oFormData.title !== 0 && oFormData.title !== false) {
          MessageBox.error("Title is required");
          return;
        }
        if (!oFormData.content && oFormData.content !== 0 && oFormData.content !== false) {
          MessageBox.error("Content is required");
          return;
        }

        oViewModel.setProperty("/busy", true);

        var oModel = this.getOwnerComponent().getModel();
        var oListBinding = oModel.bindList("/" + sEntitySet);
        var oContext = oListBinding.create(oFormData);

        oContext
          .created()
          .then(
            function () {
              oViewModel.setProperty("/busy", false);
              MessageToast.show("Posts created successfully");
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
        this.getOwnerComponent().getRouter().navTo("pOSTSList");
      },
    })
);
