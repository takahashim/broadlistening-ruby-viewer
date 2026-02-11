// Toolbar component for Broadlistening visualization
import { icon, escapeHtml } from "./decidim_core_shim";
import { t } from "./i18n";

// View mode constants (shared with chart_manager.ts)
export const VIEW_MODES = {
  SCATTER_ALL: "scatterAll",
  SCATTER_DENSITY: "scatterDensity",
  TREEMAP: "treemap"
} as const;

export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];

interface ToolbarOptions {
  viewMode: ViewMode;
  hasDensityData: boolean;
  isDenseGroupEnabled: boolean;
  showSettings: boolean;
  showFullscreen: boolean;
  onViewModeChange: ((mode: ViewMode) => void) | null;
  onSettingsClick: (() => void) | null;
  onFullscreenClick: (() => void) | null;
}

/**
 * Toolbar component for view mode switching and actions
 */
export default class Toolbar {
  options: ToolbarOptions;

  constructor(options: Partial<ToolbarOptions> = {}) {
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

  render(): string {
    const { viewMode, hasDensityData, isDenseGroupEnabled, showSettings, showFullscreen } = this.options;

    const densityBtnDisabled = !hasDensityData || !isDenseGroupEnabled;
    const densityBtnTitle = densityBtnDisabled
      ? t("toolbar.density_disabled_title")
      : t("toolbar.density_title");

    const activeClass = (mode: ViewMode) => viewMode === mode ? "blv-active" : "";

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

  bindEvents(container: HTMLElement) {
    const { onViewModeChange, onSettingsClick, onFullscreenClick } = this.options;

    // View mode buttons
    container.querySelectorAll("[data-view-mode]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if ((e.currentTarget as HTMLButtonElement).disabled) return;
        const mode = (e.currentTarget as HTMLElement).dataset.viewMode as ViewMode;
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

  updateState(container: HTMLElement, state: Partial<ToolbarOptions>) {
    const { viewMode, hasDensityData, isDenseGroupEnabled } = { ...this.options, ...state };

    container.querySelectorAll("[data-view-mode]").forEach(btn => {
      const isActive = (btn as HTMLElement).dataset.viewMode === viewMode;
      btn.classList.toggle("blv-active", isActive);

      // Update density button disabled state
      if ((btn as HTMLElement).dataset.viewMode === VIEW_MODES.SCATTER_DENSITY) {
        const isDisabled = !hasDensityData || !isDenseGroupEnabled;
        (btn as HTMLButtonElement).disabled = isDisabled;
        (btn as HTMLElement).title = isDisabled ? t("toolbar.density_disabled_title") : t("toolbar.density_title");
      }
    });

    // Update options for future renders
    Object.assign(this.options, state);
  }
}
