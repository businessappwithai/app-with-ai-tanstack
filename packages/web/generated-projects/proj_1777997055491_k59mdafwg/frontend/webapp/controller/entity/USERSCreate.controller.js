/**
 * USERS Create Controller
 *
 * Handles creation of new Users records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-05-06T11:42:08.778Z
 */
sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  (Controller, JSONModel, MessageToast, MessageBox) =>
    Controller.extend("q-a-test-project.controller.entity.USERSCreate", {
      onInit: function () {
        var oViewModel = new JSONModel({
          busy: false,
          entityName: "bus_users",
          entityDisplayName: "Users",
          entitySetName: "Bususerses",
          formData: {},
        });
        this.getView().setModel(oViewModel, "view");

        this.getOwnerComponent()
          .getRouter()
          .getRoute("uSERSCreate")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function () {
        // Reset form data
        this.getView().getModel("view").setProperty("/formData", {
          username: "",
          email: "",
          password_hash: "",
        });
      },

      onSavePress: function () {
        var oView = this.getView();
        var oViewModel = oView.getModel("view");
        var oFormData = oViewModel.getProperty("/formData");
        var sEntitySet = oViewModel.getProperty("/entitySetName");

        // Basic validation
        if (!oFormData.username && oFormData.username !== 0 && oFormData.username !== false) {
          MessageBox.error("Username is required");
          return;
        }
        if (!oFormData.email && oFormData.email !== 0 && oFormData.email !== false) {
          MessageBox.error("Email is required");
          return;
        }
        if (
          !oFormData.password_hash &&
          oFormData.password_hash !== 0 &&
          oFormData.password_hash !== false
        ) {
          MessageBox.error("Password Hash is required");
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
              MessageToast.show("Users created successfully");
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
        this.getOwnerComponent().getRouter().navTo("uSERSList");
      },
    })
);
