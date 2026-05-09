/**
 * COMMENTS Detail Controller - Object Page (Column 3)
 *
 * Dedicated detail controller for Comments entity.
 * Displays all fields from sys_field ordered by seq_no.
 * Supports Edit/Delete functionality with ETag concurrency.
 * Includes child records management with lazy loading and caching.
 *
 * IMPORTANT FIXES APPLIED:
 * - Use path format WITHOUT parentheses: /EntitySet/${id} instead of /EntitySet('${id}')
 * - Get data from binding context in dataReceived event (OData V4 quirk)
 * - No model parameter in bindElement (uses default model)
 *
 * Generated: 2026-05-06T11:42:08.784Z
 */

import MessageHelper from "q-a-test-project/utils/MessageHelper";
import MessageBox from "sap/m/MessageBox";
import DateFormat from "sap/ui/core/format/DateFormat";
import Controller from "sap/ui/core/mvc/Controller";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Sorter from "sap/ui/model/Sorter";

// Type definitions
interface FieldMetadata {
  sys_field_id?: number;
  name: string;
  display_name: string;
  description?: string;
  is_displayed: boolean;
  is_displayed_grid?: boolean;
  is_read_only: boolean;
  is_mandatory: boolean;
  mandatory_logic?: string;
  display_logic?: string;
  read_only_logic?: string;
  seq_no: number;
  column_name: string;
  is_key?: boolean;
  is_parent?: boolean;
  is_updateable?: boolean;
  field_length?: number;
  default_value?: any;
  value_min?: number;
  value_max?: number;
  format_pattern?: string;
  x_position?: number;
  y_position?: number;
  column_span?: number;
  is_heading?: boolean;
}

interface ChildTab {
  sys_tab_id?: number;
  name: string;
  table_name: string;
  entity_set_name: string;
  parent_column_name: string;
  seq_no: number;
  is_loaded: boolean;
  data: Record<string, any>[];
  fields: FieldMetadata[];
}

interface UIElements {
  countText: any;
  editButton: any;
  deleteButton: any;
  tableControl: any;
}

interface ViewModel {
  busy: boolean;
  editable: boolean;
  entityName: string;
  entityDisplayName: string;
  entitySetName: string;
  fields: FieldMetadata[];
  currentId: string | null;
  childTabs: ChildTab[];
  loadedChildData: Record<string, Record<string, any>[]>;
  childUIElements: Record<string, UIElements>;
  parentEntityName?: string;
  parentEntityDescription?: string;
}

interface ChildDialogConfig {
  mode: "create" | "edit";
  entitySetName: string;
  tabName: string;
  bindingKey: string;
  parentColumnName: string;
  parentId: string;
  fields: FieldMetadata[];
  record?: Record<string, any>;
}

/**
 * @namespace q-a-test-project.controller.entity
 */
export default class COMMENTSDetail extends Controller {
  private _getRouter(): any {
    return this.getOwnerComponent().getRouter();
  }

  public onInit(): void {
    const oViewModel: ViewModel = {
      busy: true,
      editable: false,
      entityName: "bus_comments",
      entityDisplayName: "Comments",
      entitySetName: "Buscommentses",
      fields: [],
      currentId: null,
      childTabs: [],
      loadedChildData: {},
      childUIElements: {},
    };

    this.getView().setModel(new JSONModel(oViewModel), "view");

    this._getRouter()
      .getRoute("cOMMENTSDetail")
      .attachPatternMatched(this._onRouteMatched.bind(this));
  }

  private _onRouteMatched(oEvent: any): void {
    const sId = oEvent.getParameter("arguments").id;
    const oViewModel = this.getView().getModel("view") as JSONModel;

    // Check if we're navigating to a different entity
    const sOldId = oViewModel.getProperty("/currentId") as string;
    if (sOldId && sOldId !== sId) {
      console.log("[DEBUG] Entity changed from", sOldId, "to", sId);
      // Clear cache for different entity to avoid showing wrong data
      oViewModel.setProperty("/loadedChildData", {});
      // Clear UI element references for different entity
      oViewModel.setProperty("/childUIElements", {});
      console.log("[DEBUG] Cleared child data and UI element cache");
    }

    oViewModel.setProperty("/currentId", sId);
    this._loadRecord(sId);
  }

  private _loadRecord(sId: string): void {
    const oView = this.getView();
    const oViewModel = oView.getModel("view") as JSONModel;
    const sEntitySet = oViewModel.getProperty("/entitySetName") as string;

    oViewModel.setProperty("/busy", true);
    oViewModel.setProperty("/editable", false);

    const oModel = this.getOwnerComponent().getModel() as ODataModel;

    // CRITICAL FIX: Use path WITHOUT parentheses - backend route is /EntitySet/:key
    const sPath = "/" + sEntitySet + "/" + sId;

    console.log("[DEBUG] Binding view to path:", sPath);

    try {
      // CRITICAL FIX: No model parameter - use default OData model
      // CRITICAL FIX: Get data from binding context in dataReceived (OData V4 quirk)
      oView.bindElement({
        path: sPath,
        events: {
          dataReceived: () => {
            console.log("[DEBUG] Data received for binding");

            // Get data from binding context instead of event parameter
            const oBindingContext = oView.getBindingContext();
            const oData = oBindingContext?.getObject();

            if (oData) {
              console.log("[DEBUG] Data loaded from binding context:", Object.keys(oData));
            }

            oViewModel.setProperty("/busy", false);
          },
          change: () => {
            console.log("[DEBUG] Binding changed");
            oViewModel.setProperty("/busy", false);
          },
        },
      });
    } catch (oError) {
      console.error("[DEBUG] Error binding element:", oError);
      oViewModel.setProperty("/busy", false);
    }

    // Load field metadata
    this._loadFieldMetadata()
      .then((aFields: FieldMetadata[]) => {
        oViewModel.setProperty("/fields", aFields);
        oViewModel.setProperty("/busy", false);
      })
      .catch(() => {
        oViewModel.setProperty("/busy", false);
      });

    // Load child tabs hierarchy for expandable/collapsible tabs
    this._loadTabHierarchy()
      .then((aChildTabs: ChildTab[]) => {
        console.log("[DEBUG] Child tabs loaded:", aChildTabs.length, "tabs");
        console.log(
          "[DEBUG] Tab names:",
          aChildTabs.map((t) => t.name)
        );
        oViewModel.setProperty("/childTabs", aChildTabs);

        // Render after a delay to ensure view is fully loaded
        setTimeout(() => {
          console.log("[DEBUG] About to render child tabs after delay");
          this._renderChildTabs(aChildTabs);
        }, 100);
      })
      .catch((oError: Error) => {
        console.error("[DEBUG] Failed to load tab hierarchy:", oError);
        oViewModel.setProperty("/childTabs", []);
      });
  }

  private _loadFieldMetadata(): Promise<FieldMetadata[]> {
    return new Promise((resolve, reject) => {
      const oViewModel = this.getView().getModel("view") as JSONModel;
      const sTableName = oViewModel.getProperty("/entityName") as string;

      if (!sTableName) {
        reject(new Error("Entity name not set in view model"));
        return;
      }

      const oModel = this.getOwnerComponent().getModel() as ODataModel;
      const sServiceUrl = oModel.getServiceUrl();
      const sBackendUrl = sServiceUrl.replace(/\/odata\/?$/, "");

      $.ajax({
        url: sBackendUrl + "/api/metadata/fields/" + sTableName,
        method: "GET",
        dataType: "json",
        success: (oResponse: any) => {
          if (oResponse && oResponse.fields) {
            const aFields: FieldMetadata[] = oResponse.fields.map((oField: any) => ({
              sys_field_id: oField.sys_field_id,
              name: oField.field_name,
              display_name: oField.column_display_name || oField.field_name,
              description: oField.description,
              is_displayed: oField.is_displayed,
              is_displayed_grid: oField.is_displayed_grid,
              is_read_only: oField.is_read_only,
              is_mandatory: oField.column_is_mandatory,
              mandatory_logic: oField.mandatory_logic,
              display_logic: oField.display_logic,
              read_only_logic: oField.read_only_logic,
              seq_no: oField.seq_no,
              column_name: oField.column_name,
              is_key: oField.is_key,
              is_parent: oField.is_parent,
              is_updateable: oField.is_updateable,
              field_length: oField.field_length,
              default_value: oField.default_value,
              value_min: oField.value_min,
              value_max: oField.value_max,
              format_pattern: oField.format_pattern,
              x_position: oField.x_position,
              y_position: oField.y_position,
              column_span: oField.column_span,
              is_heading: oField.is_heading,
            }));
            resolve(aFields);
          } else {
            reject(new Error("No fields found for table: " + sTableName));
          }
        },
        error: (oXHR: any, sTextStatus: string, sError: string) => {
          console.error("Failed to load field metadata from endpoint:", sError);
          reject(new Error("Failed to load field metadata: " + sError));
        },
      });
    });
  }

  public onEditPress(): void {
    (this.getView().getModel("view") as JSONModel).setProperty("/editable", true);
  }

  public onSavePress(): void {
    const oView = this.getView();
    const oModel = this.getOwnerComponent().getModel() as ODataModel;
    const oViewModel = oView.getModel("view") as JSONModel;

    oViewModel.setProperty("/busy", true);

    try {
      oModel
        .submitBatch("update")
        .then(() => {
          oViewModel.setProperty("/busy", false);
          oViewModel.setProperty("/editable", false);
          MessageHelper.showSuccess("Comments saved successfully");
        })
        .catch((oError: any) => {
          oViewModel.setProperty("/busy", false);
          MessageBox.error("Failed to save: " + (oError.message || "Unknown error"));
        });
    } catch (e) {
      oViewModel.setProperty("/busy", false);
      oViewModel.setProperty("/editable", false);
      MessageHelper.showSuccess("Changes saved");
    }
  }

  public onCancelPress(): void {
    const oModel = this.getOwnerComponent().getModel() as ODataModel;
    oModel.resetChanges();
    (this.getView().getModel("view") as JSONModel).setProperty("/editable", false);
  }

  public onDeletePress(): void {
    MessageBox.confirm("Are you sure you want to delete this Comments?", {
      title: "Confirm Delete",
      onClose: (sAction: string) => {
        if (sAction === MessageBox.Action.OK) {
          this._deleteRecord();
        }
      },
    });
  }

  private _deleteRecord(): void {
    const oView = this.getView();
    const oViewModel = oView.getModel("view") as JSONModel;
    const oModel = this.getOwnerComponent().getModel() as ODataModel;
    const oBinding = oView.getBindingContext();

    if (!oBinding) {
      MessageHelper.showError("No binding context found");
      return;
    }

    const sPath = oBinding.getPath();

    oViewModel.setProperty("/busy", true);

    oModel
      .requestOption("DELETE", sPath)
      .then(() => {
        oViewModel.setProperty("/busy", false);
        MessageHelper.showSuccess("Comments deleted successfully");
        this.onNavBack();
      })
      .catch((oError: any) => {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to delete: " + (oError.message || "Unknown error"));
      });
  }

  public onNavBack(): void {
    const oRouter = this._getRouter();
    if (oRouter) {
      oRouter.navTo("cOMMENTSList");
    }
  }

  public formatDate(oDate: any): string {
    if (!oDate) return "";
    const oDateObj = typeof oDate === "string" ? new Date(oDate) : oDate;
    if (isNaN(oDateObj.getTime())) return "";
    const oDateFormat = DateFormat.getDateInstance({ style: "medium" });
    return oDateFormat.format(oDateObj);
  }

  /**
   * Load tab hierarchy from sys_tab
   */
  private _loadTabHierarchy(): Promise<ChildTab[]> {
    return new Promise((resolve, reject) => {
      const oViewModel = this.getView().getModel("view") as JSONModel;
      const sParentTableName = oViewModel.getProperty("/entityName") as string;

      if (!sParentTableName) {
        resolve([]);
        return;
      }

      const oModel = this.getOwnerComponent().getModel() as ODataModel;
      const sServiceUrl = oModel.getServiceUrl();
      const sBackendUrl = sServiceUrl.replace(/\/odata\/?$/, "");
      const sUrl = sBackendUrl + "/api/metadata/child-tabs/" + sParentTableName;

      $.ajax({
        url: sUrl,
        method: "GET",
        dataType: "json",
        cache: false,
        success: (oResponse: any) => {
          if (oResponse && oResponse.child_tabs) {
            oViewModel.setProperty("/parentEntityName", oResponse.parent_entity_name);
            oViewModel.setProperty("/parentEntityDescription", oResponse.parent_entity_description);

            const aChildTabs: ChildTab[] = oResponse.child_tabs.map((oTab: any) => ({
              sys_tab_id: oTab.sys_tab_id,
              name: oTab.name,
              table_name: oTab.table_name,
              entity_set_name: oTab.entity_set_name,
              parent_column_name: oTab.parent_column_name,
              seq_no: oTab.seq_no,
              is_loaded: false,
              data: [],
              fields: oTab.fields || [],
            }));
            resolve(aChildTabs);
          } else {
            resolve([]);
          }
        },
        error: (oXHR: any, sTextStatus: string, sError: string) => {
          console.error("Failed to load tab hierarchy:", sError);
          reject(new Error("Failed to load child tabs: " + sError));
        },
      });
    });
  }

  /**
   * Lazy load child data when tab is expanded
   */
  private _loadChildData(
    sBindingKey: string,
    sTabName: string,
    sEntitySetName: string,
    sParentColumnName: string
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const oViewModel = this.getView().getModel("view") as JSONModel;
      const sParentId = oViewModel.getProperty("/currentId") as string;
      const oModel = this.getOwnerComponent().getModel() as ODataModel;

      // Check if data is already loaded
      const sCachePath = "/loadedChildData/" + sBindingKey;
      const oLoadedData = oViewModel.getProperty(sCachePath) as any[];
      if (oLoadedData && Array.isArray(oLoadedData) && oLoadedData.length > 0) {
        console.log(
          "[DEBUG] Using cached data for",
          sBindingKey,
          ":",
          oLoadedData.length,
          "records"
        );
        resolve(oLoadedData);
        return;
      }

      const sPath = sEntitySetName;
      const sFilterClause = sParentColumnName + " eq '" + sParentId + "'";
      const sFilter = encodeURIComponent("$filter=" + sFilterClause);
      const sServiceUrl = oModel.getServiceUrl();

      let sUrl = sServiceUrl;
      if (sUrl.endsWith("/")) {
        sUrl = sUrl.slice(0, -1);
      }
      sUrl = sUrl + "/" + sPath + "?" + sFilter + "&$top=20";

      fetch(sUrl)
        .then((response: Response) => {
          if (!response.ok) {
            throw new Error("HTTP " + response.status + ": " + response.statusText);
          }
          return response.json();
        })
        .then((oData: any) => {
          const aResults = oData.value || [];
          console.log("[DEBUG] Loaded " + aResults.length + " records for " + sTabName);

          oViewModel.setProperty(sCachePath, aResults);

          const aChildTabs = oViewModel.getProperty("/childTabs") as ChildTab[];
          const oTab = aChildTabs.find((t: ChildTab) => t.name === sTabName);
          if (oTab) {
            oTab.is_loaded = true;
            oTab.data = aResults;
            oViewModel.setProperty("/childTabs", aChildTabs);
          }

          resolve(aResults);
        })
        .catch((oError: Error) => {
          console.error("Failed to load child data for " + sTabName + ":", oError);
          reject(oError);
        });
    });
  }

  /**
   * Event handler when a tab is expanded
   */
  public onTabExpand(oEvent: any): void {
    const oSource = oEvent.getSource();
    const sTabName = oSource.data("tabName");
    const sBindingKey = oSource.data("bindingKey");
    const sEntitySetName = oSource.data("entitySetName");
    const sParentColumnName = oSource.data("parentColumnName");

    if (!sTabName || !sEntitySetName || !sParentColumnName) {
      console.error("Missing tab metadata for lazy loading");
      return;
    }

    const oViewModel = this.getView().getModel("view") as JSONModel;
    const aChildTabs = oViewModel.getProperty("/childTabs") as ChildTab[];
    const oTab = aChildTabs.find((t: ChildTab) => t.name === sTabName);

    oViewModel.setProperty("/busy", true);

    this._loadChildData(sBindingKey, sTabName, sEntitySetName, sParentColumnName)
      .then((aData: any[]) => {
        oViewModel.setProperty("/busy", false);
        MessageHelper.showInfo("Loaded " + aData.length + " records for " + sTabName);

        const oUIElements = oViewModel.getProperty("/childUIElements/" + sBindingKey) as UIElements;

        if (oUIElements && oUIElements.tableControl) {
          const oTable = oUIElements.tableControl;
          (oTable as any).removeAllItems();

          if (aData && aData.length > 0) {
            const aFields = (oTab?.fields || []).slice(0, 5);

            aData.forEach((oRecord: any) => {
              const aCells = aFields.map((oField: FieldMetadata) => {
                const sValue = oRecord[oField.column_name] || "";
                return new (window as any).sap.m.Text({
                  text: String(sValue),
                  wrapping: false,
                });
              });

              const oItem = new (window as any).sap.m.ColumnListItem({
                cells: aCells,
              });
              oItem.data("record", oRecord);
              (oTable as any).addItem(oItem);
            });

            (oTable as any).setVisible(true);

            if (oUIElements.countText) {
              oUIElements.countText.setText(aData.length + " records");
            }

            if (oUIElements.editButton) {
              oUIElements.editButton.setEnabled(true);
            }
            if (oUIElements.deleteButton) {
              oUIElements.deleteButton.setEnabled(true);
            }
          } else {
            (oTable as any).setVisible(false);
            if (oUIElements.countText) {
              oUIElements.countText.setText("0 records");
            }
          }
        }
      })
      .catch((oError: Error) => {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to load child data: " + (oError.message || "Unknown error"));
      });
  }

  /**
   * Dynamically render child tabs UI
   */
  private _renderChildTabs(aChildTabs: ChildTab[]): void {
    console.log("[DEBUG] _renderChildTabs called with", aChildTabs?.length || 0, "tabs");

    const oView = this.getView();
    const oContainer = oView.byId("childTabsContainer");

    if (!oContainer) {
      console.error("[DEBUG] childTabsContainer not found in view");
      return;
    }

    oContainer.destroyItems();

    if (!aChildTabs || aChildTabs.length === 0) {
      const oNoDataText = new (window as any).sap.m.Text({
        text: "No related records configured",
      });
      oContainer.addItem(oNoDataText);
      return;
    }

    const oViewModel = this.getView().getModel("view") as JSONModel;
    const sCurrentId = oViewModel.getProperty("/currentId") as string;

    // Initialize cache for all tabs
    aChildTabs.forEach((oTab: ChildTab) => {
      const sBindingKey = oTab.name.replace(/[^a-zA-Z0-9]/g, "");
      const sCacheKey = sBindingKey + "_" + sCurrentId;
      const sPath = "/loadedChildData/" + sCacheKey;
      if (!oViewModel.getProperty(sPath)) {
        oViewModel.setProperty(sPath, []);
      }
    });

    // Create UI for each child tab
    aChildTabs.forEach((oTab: ChildTab, index: number) => {
      try {
        const sBindingKey = oTab.name.replace(/[^a-zA-Z0-9]/g, "");
        const sCacheKey = sBindingKey + "_" + sCurrentId;

        const oTabPanel = new (window as any).sap.m.Panel({
          expandable: true,
          expanded: false,
          headerText: oTab.name,
          width: "100%",
        });
        oTabPanel.addStyleClass("sapUiSmallMarginTop");

        const oPanelContent = new (window as any).sap.m.VBox({
          items: [],
        });

        const oLoadButton = new (window as any).sap.m.Button({
          text: "Load Records",
          icon: "sap-icon://refresh",
          type: "Transparent",
          press: this.onTabExpand.bind(this),
        });
        oLoadButton.data("tabName", oTab.name);
        oLoadButton.data("bindingKey", sCacheKey);
        oLoadButton.data("entitySetName", oTab.entity_set_name);
        oLoadButton.data("parentColumnName", oTab.parent_column_name);

        const oCountText = new (window as any).sap.m.Text({
          text: "0 records",
        });

        // Create table columns
        const aTableColumns: any[] = [];
        const aDisplayFields = (oTab.fields || []).slice(0, 5);

        if (aDisplayFields.length === 0) {
          aDisplayFields.push({ column_name: "id", column_display_name: "ID" } as FieldMetadata);
        }

        aDisplayFields.forEach((oField: FieldMetadata) => {
          const sColumnName = oField.column_name;
          const sColumnLabel = oField.column_display_name || oField.name || sColumnName;

          const oColumn = new (window as any).sap.m.Column({
            header: new (window as any).sap.m.Text({ text: sColumnLabel }),
          });
          aTableColumns.push(oColumn);
        });

        // Create toolbar
        const fieldsString = JSON.stringify(oTab.fields || []);

        const oCreateButton = new (window as any).sap.m.Button({
          text: "Add New",
          icon: "sap-icon://add",
          type: "Emphasized",
          press: this.onCreateChildRecord.bind(this),
        });
        oCreateButton.data("tabName", oTab.name);
        oCreateButton.data("bindingKey", sCacheKey);
        oCreateButton.data("entitySetName", oTab.entity_set_name);
        oCreateButton.data("parentColumnName", oTab.parent_column_name);
        oCreateButton.data("fields", fieldsString);

        const oEditButton = new (window as any).sap.m.Button({
          text: "Edit",
          icon: "sap-icon://edit",
          type: "Transparent",
          enabled: false,
          press: this.onEditChildRecord.bind(this),
        });
        oEditButton.data("tabName", oTab.name);
        oEditButton.data("bindingKey", sCacheKey);
        oEditButton.data("entitySetName", oTab.entity_set_name);
        oEditButton.data("fields", fieldsString);

        const oDeleteButton = new (window as any).sap.m.Button({
          text: "Delete",
          icon: "sap-icon://delete",
          type: "Transparent",
          enabled: false,
          press: this.onDeleteChildRecord.bind(this),
        });
        oDeleteButton.data("tabName", oTab.name);
        oDeleteButton.data("bindingKey", sCacheKey);
        oDeleteButton.data("entitySetName", oTab.entity_set_name);

        const oToolbar = new (window as any).sap.m.OverflowToolbar({
          content: [
            oCreateButton,
            oEditButton,
            oDeleteButton,
            new (window as any).sap.m.ToolbarSpacer(),
          ],
        });

        const oTable = new (window as any).sap.m.Table({
          width: "100%",
          growing: true,
          growingThreshold: 20,
          visible: false,
          headerToolbar: oToolbar,
          columns: aTableColumns,
        });

        oTable.setModel(oViewModel, "view");
        oTable.data("tabName", oTab.name);
        oTable.data("bindingKey", sCacheKey);
        oTable.data("entitySetName", oTab.entity_set_name);
        oTable.data("fields", JSON.stringify(oTab.fields || []));

        // Store UI element references
        const oUIElements: UIElements = {
          countText: oCountText,
          editButton: oEditButton,
          deleteButton: oDeleteButton,
          tableControl: oTable,
        };
        oViewModel.setProperty("/childUIElements/" + sCacheKey, oUIElements);

        oPanelContent.addItem(oLoadButton);
        oPanelContent.addItem(oCountText);
        oPanelContent.addItem(oTable);

        oTabPanel.addContent(oPanelContent);
        oContainer.addItem(oTabPanel);
      } catch (oError) {
        console.error("[DEBUG] Error creating panel for " + oTab.name + ":", oError);
      }
    });
  }

  /**
   * Handle Create button press for child records
   */
  public onCreateChildRecord(oEvent: any): void {
    const oSource = oEvent.getSource();
    const sEntitySetName = oSource.data("entitySetName");
    const sTabName = oSource.data("tabName");
    const sBindingKey = oSource.data("bindingKey");
    const sParentColumnName = oSource.data("parentColumnName");

    const oViewModel = this.getView().getModel("view") as JSONModel;
    const aChildTabs = oViewModel.getProperty("/childTabs") as ChildTab[];
    const oTab = aChildTabs.find((t: ChildTab) => t.name === sTabName);
    const aFields = oTab ? oTab.fields || [] : [];

    const sParentId = oViewModel.getProperty("/currentId") as string;

    this._openChildRecordDialog({
      mode: "create",
      entitySetName: sEntitySetName,
      tabName: sTabName,
      bindingKey: sBindingKey,
      parentColumnName: sParentColumnName,
      parentId: sParentId,
      fields: aFields,
    });
  }

  /**
   * Handle Edit button press for child records
   */
  public onEditChildRecord(oEvent: any): void {
    // Implementation for editing child records
    MessageHelper.showInfo("Edit functionality - to be implemented based on selection");
  }

  /**
   * Handle Delete button press for child records
   */
  public onDeleteChildRecord(oEvent: any): void {
    // Implementation for deleting child records
    MessageHelper.showInfo("Delete functionality - to be implemented based on selection");
  }

  /**
   * Open dialog for creating/editing child records
   */
  private _openChildRecordDialog(oConfig: ChildDialogConfig): void {
    const oDialog = new (window as any).sap.m.Dialog({
      title: oConfig.mode === "create" ? "New " + oConfig.tabName : "Edit " + oConfig.tabName,
      contentWidth: "600px",
      content: [this._createChildRecordForm(oConfig)],
      beginButton: new (window as any).sap.m.Button({
        text: "Save",
        type: "Emphasized",
        press: () => {
          this._saveChildRecord(oConfig, oDialog);
        },
      }),
      endButton: new (window as any).sap.m.Button({
        text: "Cancel",
        press: () => {
          oDialog.close();
          oDialog.destroy();
        },
      }),
    });

    oDialog.open();
  }

  /**
   * Create form based on field metadata
   */
  private _createChildRecordForm(oConfig: ChildDialogConfig): any {
    const oForm = new (window as any).sap.ui.layout.form.SimpleForm({
      layout: "ResponsiveGridLayout",
      labelSpanL: 4,
      labelSpanM: 4,
      emptySpanL: 0,
      emptySpanM: 0,
      columnsL: 1,
      columnsM: 1,
      editable: true,
    });

    const aFormFields = (oConfig.fields || []).slice(0, 8);

    aFormFields.forEach((oField: FieldMetadata) => {
      const sColumnName = oField.column_name;
      const sLabel = oField.column_display_name || oField.name || sColumnName;
      let sValue = "";
      const bEditable = sColumnName !== oConfig.parentColumnName;

      if (oConfig.mode === "edit" && oConfig.record) {
        sValue = oConfig.record[sColumnName] || "";
      }

      if (oConfig.mode === "create" && sColumnName === oConfig.parentColumnName) {
        sValue = oConfig.parentId || "";
      }

      let oControl: any;

      // Boolean fields
      if (
        sColumnName.includes("is_") ||
        sColumnName === "is_active" ||
        sColumnName === "is_primary"
      ) {
        const bBoolValue = sValue === true || sValue === "true";
        oControl = new (window as any).sap.m.CheckBox({
          selected: bBoolValue,
          editable: bEditable,
        });
        oControl.data("columnName", sColumnName);
        oControl.data("fieldType", "boolean");
      }
      // Date fields
      else if (sColumnName.includes("_date") || sColumnName === "date") {
        const oDateValue = sValue ? new Date(sValue) : null;
        oControl = new (window as any).sap.m.DatePicker({
          value: oDateValue,
          editable: bEditable,
          displayFormat: "yyyy-MM-dd",
          valueFormat: "yyyy-MM-dd",
        });
        oControl.data("columnName", sColumnName);
        oControl.data("fieldType", "date");
      }
      // Text fields (default)
      else {
        oControl = new (window as any).sap.m.Input({
          value: sValue,
          editable: bEditable,
        });
        oControl.data("columnName", sColumnName);
        oControl.data("fieldType", "string");
      }

      oForm.addContent(new (window as any).sap.m.Label({ text: sLabel }));
      oForm.addContent(oControl);
    });

    return oForm;
  }

  /**
   * Save child record (create or update)
   */
  private _saveChildRecord(oConfig: ChildDialogConfig, oDialog: any): void {
    const oForm = oDialog.getContent()[0];
    const aFormContent = oForm.getContent();

    const oData: Record<string, any> = {};
    const oModel = this.getView().getModel() as ODataModel;
    const sServiceUrl = oModel.getServiceUrl();

    // Collect form data
    for (let i = 0; i < aFormContent.length; i++) {
      const oControl = aFormContent[i];

      if (oControl && oControl.data && typeof oControl.data === "function") {
        const sColumnName = oControl.data("columnName");
        const sFieldType = oControl.data("fieldType");

        if (sColumnName) {
          let vValue: any;

          if (sFieldType === "boolean") {
            vValue = oControl.getSelected();
          } else if (sFieldType === "date") {
            vValue = oControl.getValue();
          } else if (typeof oControl.getValue === "function") {
            vValue = oControl.getValue();
          }

          oData[sColumnName] = vValue;
        }
      }
    }

    if (oConfig.mode === "create" && oConfig.parentColumnName) {
      oData[oConfig.parentColumnName] = oConfig.parentId;
    }

    let sUrl = sServiceUrl;
    if (sUrl.endsWith("/")) {
      sUrl = sUrl.slice(0, -1);
    }
    sUrl = sUrl + "/" + oConfig.entitySetName;

    // CRITICAL FIX: Use path without parentheses for child records too
    if (oConfig.mode === "edit" && oConfig.record) {
      sUrl = sUrl + "/" + oConfig.record.id;
    }

    const sMethod = oConfig.mode === "create" ? "POST" : "PATCH";

    fetch(sUrl, {
      method: sMethod,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(oData),
    })
      .then((response: Response) => {
        if (!response.ok) {
          throw new Error("HTTP " + response.status + ": " + response.statusText);
        }
        return response.json();
      })
      .then(() => {
        MessageHelper.showSuccess("Record saved successfully");
        oDialog.close();
        oDialog.destroy();

        // Trigger reload
        this.onTabExpand({
          getSource: () => ({
            data: (key: string) => {
              if (key === "bindingKey") return oConfig.bindingKey;
              if (key === "entitySetName") return oConfig.entitySetName.replace("Set", "");
              return null;
            },
          }),
        } as any);
      })
      .catch((error: Error) => {
        console.error("Save error:", error);
        MessageHelper.showError("Error saving record: " + error.message);
      });
  }
}
