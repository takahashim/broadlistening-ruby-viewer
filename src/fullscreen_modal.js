// Fullscreen Modal component for Broadlistening visualization
import { icon, escapeHtml } from "./decidim_core_shim";
import { t } from "./i18n";
import Toolbar, { VIEW_MODES } from "./toolbar";

/**
 * Fullscreen modal for chart visualization
 */
export default class FullscreenModal {
  /**
   * @param {Object} options
   * @param {string} options.viewMode - Current view mode
   * @param {boolean} options.hasDensityData - Whether density data is available
   * @param {boolean} options.isDenseGroupEnabled - Whether dense group is enabled
   * @param {Function} options.onViewModeChange - Callback when view mode changes
   * @param {Function} options.onClose - Callback when modal is closed
   * @param {Function} options.renderChart - Callback to render chart in container
   * @param {Function} options.renderBreadcrumb - Callback to render breadcrumb content
   */
  constructor(options = {}) {
    this.options = {
      viewMode: VIEW_MODES.SCATTER_ALL,
      hasDensityData: false,
      isDenseGroupEnabled: true,
      onViewModeChange: null,
      onClose: null,
      renderChart: null,
      renderBreadcrumb: null,
      ...options
    };

    this.modal = null;
    this.isOpen = false;
    this._escapeHandler = null;
    this.toolbar = null;
  }

  /**
   * Open the fullscreen modal
   */
  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    // Create toolbar instance for fullscreen
    this.toolbar = new Toolbar({
      viewMode: this.options.viewMode,
      hasDensityData: this.options.hasDensityData,
      isDenseGroupEnabled: this.options.isDenseGroupEnabled,
      showSettings: false, // Settings not shown in fullscreen header
      showFullscreen: false, // Already in fullscreen
      onViewModeChange: (mode) => {
        if (this.options.onViewModeChange) {
          this.options.onViewModeChange(mode);
        }
        this.updateToolbarState({ viewMode: mode });
      }
    });

    this.modal = document.createElement("div");
    this.modal.className = "fixed inset-0 z-[9999] flex flex-col bg-white";
    this.modal.innerHTML = `
      <div data-blv="fullscreen-header" class="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        ${this.toolbar.render()}
        <button class="flex items-center justify-center w-10 h-10 p-0 bg-transparent border-none rounded-lg cursor-pointer text-gray-500 transition-all duration-150 hover:bg-gray-200 hover:text-gray-900 [&_svg]:w-6 [&_svg]:h-6" data-action="close" title="${escapeHtml(t("common.close"))}">
          ${icon("close-line")}
        </button>
      </div>
      <div data-blv="fullscreen-breadcrumb" class="px-4"></div>
      <div class="flex-1 overflow-hidden p-4">
        <div data-blv="chart-plot" class="w-full h-full"></div>
      </div>
    `;

    document.body.appendChild(this.modal);
    document.body.style.overflow = "hidden";

    this.bindEvents();
    this.renderBreadcrumb();
    this.renderChart();
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (!this.modal) return;

    // Bind toolbar events
    const headerContainer = this.modal.querySelector('[data-blv="fullscreen-header"]');
    this.toolbar.bindEvents(headerContainer);

    // Close button
    this.modal.querySelector("[data-action='close']").addEventListener("click", () => {
      this.close();
    });

    // Escape key
    this._escapeHandler = (e) => {
      if (e.key === "Escape") {
        this.close();
      }
    };
    document.addEventListener("keydown", this._escapeHandler);
  }

  /**
   * Get the chart container element
   * @returns {HTMLElement|null}
   */
  getChartContainer() {
    if (!this.modal) return null;
    return this.modal.querySelector('[data-blv="chart-plot"]');
  }

  /**
   * Get the breadcrumb container element
   * @returns {HTMLElement|null}
   */
  getBreadcrumbContainer() {
    if (!this.modal) return null;
    return this.modal.querySelector('[data-blv="fullscreen-breadcrumb"]');
  }

  /**
   * Render chart using callback
   */
  renderChart() {
    if (!this.modal || !this.options.renderChart) return;
    const container = this.getChartContainer();
    if (container) {
      container.innerHTML = "";
      this.options.renderChart(container);
    }
  }

  /**
   * Render breadcrumb using callback
   */
  renderBreadcrumb() {
    if (!this.modal || !this.options.renderBreadcrumb) return;
    const container = this.getBreadcrumbContainer();
    if (container) {
      this.options.renderBreadcrumb(container);
    }
  }

  /**
   * Update toolbar state
   * @param {Object} state - New state
   */
  updateToolbarState(state) {
    if (!this.modal || !this.toolbar) return;
    const headerContainer = this.modal.querySelector('[data-blv="fullscreen-header"]');
    this.toolbar.updateState(headerContainer, state);
    Object.assign(this.options, state);
  }

  /**
   * Close the modal
   */
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    if (this.modal) {
      document.body.removeChild(this.modal);
      this.modal = null;
    }

    document.body.style.overflow = "";

    if (this._escapeHandler) {
      document.removeEventListener("keydown", this._escapeHandler);
      this._escapeHandler = null;
    }

    if (this.options.onClose) {
      this.options.onClose();
    }
  }
}
