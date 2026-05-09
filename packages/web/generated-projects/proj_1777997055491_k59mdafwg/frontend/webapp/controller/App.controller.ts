/**
 * App Controller - Flexible Column Layout Management
 *
 * Manages the FCL layout transitions and column visibility.
 * Handles navigation state for 3-column layout pattern.
 *
 * Generated: 2026-05-06T11:42:08.765Z
 */

import FlexibleColumnLayoutSemanticHelper from "sap/f/FlexibleColumnLayoutSemanticHelper";
import { LayoutType } from "sap/f/library";
import MessageBox from "sap/m/MessageBox";
import type UI5Event from "sap/ui/base/Event";
import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * App View Model Interface
 */
interface AppViewModel {
  layout: keyof typeof LayoutType;
  previousLayout: keyof typeof LayoutType | null;
  actionButtonsInfo: {
    midColumn: {
      fullScreen: boolean;
    };
    endColumn: {
      fullScreen: boolean;
    };
  };
}

/**
 * App Controller
 */
export default class AppController extends Controller {
  /**
   * Controller initialization
   */
  public onInit(): void {
    // Initialize app view model
    const oAppViewModel: AppViewModel = {
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
    };

    const oModel = new JSONModel(oAppViewModel);
    this.getView()?.setModel(oModel, "appView");

    // Get router and attach route matched handler
    const oRouter = this.getOwnerComponent().getRouter();
    oRouter.attachRouteMatched(this._onRouteMatched, this);

    // Initialize OData model error handler
    this._initODataErrorHandler();
  }

  /**
   * Initialize OData model error handling
   * @private
   */
  private _initODataErrorHandler(): void {
    const oModel = this.getOwnerComponent().getModel();
    if (oModel) {
      oModel.attachRequestFailed((oEvent: UI5Event) => {
        const oParams = oEvent.getParameters();
        this._showServiceError((oParams as any).response);
      });
    }
  }

  /**
   * Show service error message
   * @param {object} oResponse - Error response object
   * @private
   */
  private _showServiceError(oResponse: any): void {
    if (oResponse && oResponse.statusCode !== 404) {
      MessageBox.error(oResponse.message || "An error occurred while loading data", {
        title: "Service Error",
        details: oResponse.responseText || "",
      });
    }
  }

  /**
   * Handle route matched events
   * @param {UI5Event} oEvent - Route matched event
   * @private
   */
  private _onRouteMatched(oEvent: UI5Event): void {
    const sRouteName = oEvent.getParameter("name") as string;
    const oArguments = oEvent.getParameter("arguments") as any;

    // Determine layout based on route
    const sLayout = this._getLayoutForRoute(sRouteName, oArguments);

    // Update layout in model
    this.getView()?.getModel("appView")?.setProperty("/layout", sLayout);
  }

  /**
   * Get appropriate layout for route
   * @param {string} sRouteName - Route name
   * @param {object} oArguments - Route arguments
   * @returns {string} Layout type
   * @private
   */
  private _getLayoutForRoute(sRouteName: string, oArguments?: any): string {
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
  }

  /**
   * Handle FCL state change
   * @param {UI5Event} oEvent - State change event
   */
  public onStateChange(oEvent: UI5Event): void {
    const bIsNavigationArrow = oEvent.getParameter("isNavigationArrow") as boolean;
    const sLayout = oEvent.getParameter("layout") as string;

    // Update layout in model
    this.getView()?.getModel("appView")?.setProperty("/layout", sLayout);

    // Navigate if arrow was clicked
    if (bIsNavigationArrow) {
      this._navigateToLayout(sLayout);
    }
  }

  /**
   * Navigate based on layout change
   * @param {string} sLayout - New layout
   * @private
   */
  private _navigateToLayout(sLayout: string): void {
    const oRouter = this.getOwnerComponent().getRouter();

    switch (sLayout) {
      case LayoutType.OneColumn:
        oRouter.navTo("master");
        break;

      case LayoutType.TwoColumnsMidExpanded: {
        // Navigate to list, preserving entity
        const sEntity = this._getCurrentEntity();
        if (sEntity) {
          oRouter.navTo("list", { entity: sEntity });
        }
        break;
      }
    }
  }

  /**
   * Get current entity from URL
   * @returns {string|null} Current entity name
   * @private
   */
  private _getCurrentEntity(): string | null {
    const oRouter = this.getOwnerComponent().getRouter();
    const oHashChanger = oRouter.getHashChanger();
    const sHash = oHashChanger.getHash() as string;

    // Extract entity from hash
    const aMatch = sHash.match(/^([^/]+)/);
    return aMatch ? aMatch[1] : null;
  }

  /**
   * Get FCL helper for layout calculations
   * @returns {FlexibleColumnLayoutSemanticHelper} FCL helper
   */
  public getFCLHelper(): FlexibleColumnLayoutSemanticHelper {
    const oFCL = this.byId("fcl") as any;
    const oSettings = {
      defaultTwoColumnLayoutType: LayoutType.TwoColumnsMidExpanded,
      defaultThreeColumnLayoutType: LayoutType.ThreeColumnsMidExpanded,
    };

    return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
  }

  /**
   * Navigate to full screen for mid column
   */
  public onMidColumnFullScreen(): void {
    const oModel = this.getView()?.getModel("appView") as JSONModel;
    const sPreviousLayout = oModel.getProperty("/layout");
    oModel.setProperty("/previousLayout", sPreviousLayout);
    oModel.setProperty("/layout", LayoutType.MidColumnFullScreen);
  }

  /**
   * Navigate to full screen for end column
   */
  public onEndColumnFullScreen(): void {
    const oModel = this.getView()?.getModel("appView") as JSONModel;
    const sPreviousLayout = oModel.getProperty("/layout");
    oModel.setProperty("/previousLayout", sPreviousLayout);
    oModel.setProperty("/layout", LayoutType.EndColumnFullScreen);
  }

  /**
   * Exit full screen mode
   */
  public onExitFullScreen(): void {
    const oModel = this.getView()?.getModel("appView") as JSONModel;
    const sPreviousLayout = oModel.getProperty("/previousLayout");
    oModel.setProperty("/layout", sPreviousLayout || LayoutType.ThreeColumnsMidExpanded);
  }

  /**
   * Close detail column
   */
  public onCloseDetailColumn(): void {
    const oRouter = this.getOwnerComponent().getRouter();
    const sEntity = this._getCurrentEntity();

    if (sEntity) {
      oRouter.navTo("list", { entity: sEntity });
    } else {
      oRouter.navTo("master");
    }
  }
}
