// Toolbar component for Broadlistening visualization
import { icon, escapeHtml } from "./decidim_core_shim";
import { t } from "./i18n";

// View mode constants (shared with chart_manager.js)
export const VIEW_MODES = {
  SCATTER_ALL: "scatterAll",
  SCATTER_DENSITY: "scatterDensity",
  TREEMAP: "treemap"
};

/**
 * Toolbar component for view mode switching and actions
 */
export default class Toolbar {
  /**
   * @param {Object} options
   * @param {string} options.viewMode - Current view mode
   * @param {boolean} options.hasDensityData - Whether density data is available
   * @param {boolean} options.isDenseGroupEnabled - Whether dense group is enabled
   * @param {boolean} options.showSettings - Whether to show settings button
   * @param {boolean} options.showFullscreen - Whether to show fullscreen button
   * @param {Function} options.onViewModeChange - Callback when view mode changes
   * @param {Function} options.onSettingsClick - Callback when settings button clicked
   * @param {Function} options.onFullscreenClick - Callback when fullscreen button clicked
   */
  constructor(options = {}) {
    this.options = {
      viewMode: VIEW_MODES.SCATTER_ALL,
      hasDensityData: false,
      isDenseGroupEnabled: true,
      showSettings: true,
      showFullscreen: true,
      onViewModeChange: null,
      onSettingsClick: null,
      onFullscreenClick: null,
      ...options
    };
  }

  /**
   * Render toolbar HTML
   * @returns {string} HTML string
   */
  render() {
    const { viewMode, hasDensityData, isDenseGroupEnabled, showSettings, showFullscreen } = this.options;

    const densityBtnDisabled = !hasDensityData || !isDenseGroupEnabled;
    const densityBtnTitle = densityBtnDisabled
      ? t("toolbar.density_disabled_title")
      : t("toolbar.density_title");

    const activeClass = (mode) => viewMode === mode ? "blv-active" : "";

    return `
      <div class="inline-flex bg-gray-200 rounded-md p-0.5 gap-0.5">
        <button class="blv-segment-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.8125rem] font-medium text-gray-500 bg-transparent border-none rounded cursor-pointer transition-all duration-150 whitespace-nowrap disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:shrink-0 ${escapeHtml(activeClass(VIEW_MODES.SCATTER_ALL))}"
                data-view-mode="${escapeHtml(VIEW_MODES.SCATTER_ALL)}"
                title="${escapeHtml(t("toolbar.all_title"))}">
          ${icon("bubble-chart-line")}
          <span>${escapeHtml(t("toolbar.all"))}</span>
        </button>
        <button class="blv-segment-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.8125rem] font-medium text-gray-500 bg-transparent border-none rounded cursor-pointer transition-all duration-150 whitespace-nowrap disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:shrink-0 ${escapeHtml(activeClass(VIEW_MODES.SCATTER_DENSITY))}"
                data-view-mode="${escapeHtml(VIEW_MODES.SCATTER_DENSITY)}"
                title="${escapeHtml(densityBtnTitle)}"
                ${densityBtnDisabled ? "disabled" : ""}>
          ${icon("focus-3-line")}
          <span>${escapeHtml(t("toolbar.density"))}</span>
        </button>
        <button class="blv-segment-btn inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.8125rem] font-medium text-gray-500 bg-transparent border-none rounded cursor-pointer transition-all duration-150 whitespace-nowrap disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:shrink-0 ${escapeHtml(activeClass(VIEW_MODES.TREEMAP))}"
                data-view-mode="${escapeHtml(VIEW_MODES.TREEMAP)}"
                title="${escapeHtml(t("toolbar.treemap_title"))}">
          ${icon("layout-grid-line")}
          <span>${escapeHtml(t("toolbar.treemap"))}</span>
        </button>
      </div>
      <div class="flex gap-2">
        ${showSettings && hasDensityData ? `
        <button class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 bg-transparent border border-transparent rounded-md cursor-pointer transition-all duration-150 hover:bg-gray-200 hover:text-gray-700 [&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0"
                data-action="settings"
                title="${escapeHtml(t("toolbar.settings_title"))}">
          ${icon("settings-3-line")}
          <span>${escapeHtml(t("toolbar.settings"))}</span>
        </button>
        ` : ""}
        ${showFullscreen ? `
        <button class="inline-flex items-center gap-1.5 p-2 text-sm font-medium text-gray-500 bg-transparent border border-transparent rounded-md cursor-pointer transition-all duration-150 hover:bg-gray-200 hover:text-gray-700 [&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0 [&_span]:hidden"
                data-action="fullscreen"
                title="${escapeHtml(t("toolbar.fullscreen_title"))}">
          ${icon("fullscreen-line")}
        </button>
        ` : ""}
      </div>
    `;
  }

  /**
   * Bind event listeners to a container
   * @param {HTMLElement} container - Container element with toolbar
   */
  bindEvents(container) {
    const { onViewModeChange, onSettingsClick, onFullscreenClick } = this.options;

    // View mode buttons
    container.querySelectorAll("[data-view-mode]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (e.currentTarget.disabled) return;
        const mode = e.currentTarget.dataset.viewMode;
        if (onViewModeChange) {
          onViewModeChange(mode);
        }
      });
    });

    // Settings button
    const settingsBtn = container.querySelector("[data-action='settings']");
    if (settingsBtn && onSettingsClick) {
      settingsBtn.addEventListener("click", onSettingsClick);
    }

    // Fullscreen button
    const fullscreenBtn = container.querySelector("[data-action='fullscreen']");
    if (fullscreenBtn && onFullscreenClick) {
      fullscreenBtn.addEventListener("click", onFullscreenClick);
    }
  }

  /**
   * Update toolbar state
   * @param {HTMLElement} container - Container element with toolbar
   * @param {Object} state - New state
   * @param {string} state.viewMode - Current view mode
   * @param {boolean} state.hasDensityData - Whether density data is available
   * @param {boolean} state.isDenseGroupEnabled - Whether dense group is enabled
   */
  updateState(container, state) {
    const { viewMode, hasDensityData, isDenseGroupEnabled } = { ...this.options, ...state };

    container.querySelectorAll("[data-view-mode]").forEach(btn => {
      const isActive = btn.dataset.viewMode === viewMode;
      btn.classList.toggle("blv-active", isActive);

      // Update density button disabled state
      if (btn.dataset.viewMode === VIEW_MODES.SCATTER_DENSITY) {
        const isDisabled = !hasDensityData || !isDenseGroupEnabled;
        btn.disabled = isDisabled;
        btn.title = isDisabled ? t("toolbar.density_disabled_title") : t("toolbar.density_title");
      }
    });

    // Update options for future renders
    Object.assign(this.options, state);
  }
}
