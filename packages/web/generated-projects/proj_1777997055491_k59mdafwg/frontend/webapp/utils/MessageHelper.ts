/**
 * MessageHelper - Professional Message Toast Utility
 *
 * Provides centralized message toast functionality with proper configuration
 * and consistent behavior across the application.
 *
 * Usage:
 *   MessageHelper.showSuccess("Record saved successfully");
 *   MessageHelper.showError("Error saving record");
 *   MessageHelper.showInfo("Loading data...");
 *   MessageHelper.showWarning("Please check your input");
 */
import MessageToast from "sap/m/MessageToast";
import Popup from "sap/ui/core/Popup";

interface MessageConfig {
  duration?: number;
  width?: string;
  closeOnBrowserNavigation?: boolean;
  my?: Popup.Dock;
  at?: Popup.Dock;
}

const MessageHelper = {
  /**
   * Default configuration for all message toasts
   * Using proper sap.ui.core.Popup.Dock enum values
   */
  _getDefaultConfig(): MessageConfig {
    return {
      duration: 3000, // 3 seconds
      width: "15em", // Responsive width
      closeOnBrowserNavigation: true,
      my: Popup.Dock.CenterBottom,
      at: Popup.Dock.CenterBottom,
    };
  },

  /**
   * Show success message (green)
   * @param sMessage - Message text to display
   * @param iDuration - Optional duration in milliseconds
   */
  showSuccess(sMessage: string, iDuration?: number): void {
    if (!sMessage) {
      return;
    }
    const oConfig: MessageConfig = this._getDefaultConfig();
    if (iDuration) {
      oConfig.duration = iDuration;
    }
    MessageToast.show(sMessage, oConfig);
  },

  /**
   * Show error message (red)
   * @param sMessage - Error message to display
   * @param iDuration - Optional duration in milliseconds
   */
  showError(sMessage: string, iDuration?: number): void {
    if (!sMessage) {
      return;
    }
    const oConfig: MessageConfig = this._getDefaultConfig();
    if (iDuration) {
      oConfig.duration = iDuration;
    }
    // Use longer duration for errors
    oConfig.duration = (oConfig.duration || 3000) * 1.5;
    MessageToast.show(sMessage, oConfig);
  },

  /**
   * Show info message (blue)
   * @param sMessage - Info message to display
   * @param iDuration - Optional duration in milliseconds
   */
  showInfo(sMessage: string, iDuration?: number): void {
    if (!sMessage) {
      return;
    }
    const oConfig: MessageConfig = this._getDefaultConfig();
    if (iDuration) {
      oConfig.duration = iDuration;
    }
    MessageToast.show(sMessage, oConfig);
  },

  /**
   * Show warning message (yellow)
   * @param sMessage - Warning message to display
   * @param iDuration - Optional duration in milliseconds
   */
  showWarning(sMessage: string, iDuration?: number): void {
    if (!sMessage) {
      return;
    }
    const oConfig: MessageConfig = this._getDefaultConfig();
    if (iDuration) {
      oConfig.duration = iDuration;
    }
    MessageToast.show(sMessage, oConfig);
  },

  /**
   * Show message with custom options
   * @param sMessage - Message text to display
   * @param oCustomConfig - Custom configuration options
   */
  show(sMessage: string, oCustomConfig?: MessageConfig): void {
    if (!sMessage) {
      return;
    }
    const oConfig: MessageConfig = this._getDefaultConfig();
    if (oCustomConfig) {
      // Merge custom config with defaults
      Object.assign(oConfig, oCustomConfig);
    }
    MessageToast.show(sMessage, oConfig);
  },
};

export default MessageHelper;
