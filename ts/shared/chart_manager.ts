// Chart Manager for Broadlistening visualization
// Orchestrates scatter and treemap charts with toolbar controls

import type { BroadlisteningArgument, BroadlisteningCluster, BroadlisteningData } from "./types";
import ScatterChart from "./scatter_chart";
import TreemapChart from "./treemap_chart";
import { CLUSTER_COLORS } from "./colors";
import { icon, escapeHtml } from "./decidim_core_shim";
import { t } from "./i18n";
import Toolbar, { VIEW_MODES, type ViewMode } from "./toolbar";
import SettingsDialog from "./settings_dialog";
import FullscreenModal from "./fullscreen_modal";

interface ChartManagerOptions {
  defaultChart: ViewMode;
  showToolbar: boolean;
}

export default class ChartManager {
  container: HTMLElement;
  data: BroadlisteningData;
  options: ChartManagerOptions;
  arguments: BroadlisteningArgument[];
  clusters: BroadlisteningCluster[];
  clusterById: Map<string, BroadlisteningCluster>;
  childrenByParent: Map<string, BroadlisteningCluster[]>;
  clustersByLevel: Map<number, BroadlisteningCluster[]>;
  clusterColorMap: Map<string, string>;
  argumentsByClusterId: Map<string, BroadlisteningArgument[]>;
  maxLevel: number;
  hasDensityData: boolean;
  viewMode: ViewMode;
  isFullscreen: boolean;
  selectedClusterId?: string;
  treemapLevel: string;
  maxDensity: number;
  minValue: number;
  isDenseGroupEnabled: boolean;
  scatterChart?: ScatterChart;
  treemapChart?: TreemapChart;
  toolbar?: Toolbar;
  settingsDialog?: SettingsDialog;
  fullscreenModal?: FullscreenModal;
  toolbarContainer?: HTMLElement;
  breadcrumbContainer?: HTMLElement;
  chartContainer?: HTMLElement;
  clusterGridContainer?: HTMLElement;
  clusterOverviewSection?: HTMLElement;
  _clusterGridClickHandler?: (e: Event) => void;

  constructor(container: HTMLElement, data: BroadlisteningData, options: Partial<ChartManagerOptions> = {}) {
    this.container = container;
    this.data = data;
    this.options = {
      defaultChart: VIEW_MODES.SCATTER_ALL,
      showToolbar: true,
      ...options
    };

    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];

    // Build cluster indexes for O(1) lookups (shared with ScatterChart)
    this.clusterById = new Map(this.clusters.map(c => [c.id, c]));
    this.childrenByParent = new Map();
    this.clustersByLevel = new Map();
    for (const cluster of this.clusters) {
      const parentId = cluster.parent;
      if (parentId) {
        if (!this.childrenByParent.has(parentId)) {
          this.childrenByParent.set(parentId, []);
        }
        this.childrenByParent.get(parentId)!.push(cluster);
      }
      const level = cluster.level ?? 0;
      if (!this.clustersByLevel.has(level)) {
        this.clustersByLevel.set(level, []);
      }
      this.clustersByLevel.get(level)!.push(cluster);
    }
    // Sort children by value descending
    for (const children of this.childrenByParent.values()) {
      children.sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    // Build color map based on sorted sibling order
    this.clusterColorMap = new Map();
    for (const children of this.childrenByParent.values()) {
      children.forEach((cluster, index) => {
        this.clusterColorMap.set(cluster.id, CLUSTER_COLORS[index % CLUSTER_COLORS.length]);
      });
    }

    // Build argument index by cluster ID for O(1) lookups
    this.argumentsByClusterId = new Map();
    for (const arg of this.arguments) {
      for (const clusterId of (arg.cluster_ids || [])) {
        if (!this.argumentsByClusterId.has(clusterId)) {
          this.argumentsByClusterId.set(clusterId, []);
        }
        this.argumentsByClusterId.get(clusterId)!.push(arg);
      }
    }

    // Calculate max level
    this.maxLevel = Math.max(...this.clusters.map(c => c.level || 0), 0);

    // Check if density filter is available (clusters have density_rank_percentile)
    this.hasDensityData = this.clusters.some(c => typeof c.density_rank_percentile === "number");

    // State
    this.viewMode = VIEW_MODES.SCATTER_ALL;
    this.isFullscreen = false;
    this.treemapLevel = "0";

    // Density filter settings
    this.maxDensity = 0.2; // Top 20% by default
    this.minValue = 5;     // Minimum 5 opinions by default
    this.isDenseGroupEnabled = true;

    // Calculate initial dense group availability
    if (this.hasDensityData) {
      this.updateDenseGroupEnabled();
    }

    this.init();
  }

  init() {
    if (this.arguments.length === 0) {
      this.container.innerHTML = `<p class="text-gray text-center py-8">${escapeHtml(t("common.no_data"))}</p>`;
      return;
    }

    this.createLayout();
    this.renderChart();

    // Find and store reference to cluster grid and section
    this.clusterGridContainer = document.getElementById("cluster-grid") || undefined;
    this.clusterOverviewSection = document.getElementById("cluster-overview-section") || undefined;

    this.bindClusterCardEvents();
  }

  createLayout() {
    this.container.innerHTML = `
      <div class="w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div data-blv="toolbar" class="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gray-50"></div>
        <div data-blv="breadcrumb" class="hidden px-4 py-2 bg-sky-50 border-b border-sky-200"></div>
        <div data-blv="chart-container" class="w-full"></div>
      </div>
    `;

    this.toolbarContainer = this.container.querySelector('[data-blv="toolbar"]') as HTMLElement | undefined;
    this.breadcrumbContainer = this.container.querySelector('[data-blv="breadcrumb"]') as HTMLElement | undefined;
    this.chartContainer = this.container.querySelector('[data-blv="chart-container"]') as HTMLElement | undefined;

    if (this.options.showToolbar) {
      this.renderToolbar();
    }
  }

  renderToolbar() {
    this.toolbar = new Toolbar({
      viewMode: this.viewMode,
      hasDensityData: this.hasDensityData,
      isDenseGroupEnabled: this.isDenseGroupEnabled,
      showSettings: this.hasDensityData,
      showFullscreen: true,
      onViewModeChange: (mode: ViewMode) => this.switchViewMode(mode),
      onSettingsClick: () => this.openSettingsDialog(),
      onFullscreenClick: () => this.toggleFullscreen()
    });

    this.toolbarContainer!.innerHTML = this.toolbar.render();
    this.toolbar.bindEvents(this.toolbarContainer!);
  }

  renderBreadcrumb() {
    const isScatterMode = this.viewMode === VIEW_MODES.SCATTER_ALL || this.viewMode === VIEW_MODES.SCATTER_DENSITY;
    if (!this.selectedClusterId || !isScatterMode) {
      this.breadcrumbContainer!.innerHTML = "";
      this.breadcrumbContainer!.style.display = "none";
      return;
    }

    const path = this.buildClusterPath(this.selectedClusterId);
    if (path.length === 0) {
      this.breadcrumbContainer!.innerHTML = "";
      this.breadcrumbContainer!.style.display = "none";
      return;
    }

    this.breadcrumbContainer!.style.display = "block";
    this.breadcrumbContainer!.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-medium text-sky-700">${escapeHtml(t("breadcrumb.viewing"))}</span>
        <nav class="flex items-center gap-1 flex-wrap">
          <a class="text-sm cursor-pointer text-sky-600 underline hover:text-sky-800" data-cluster-id="">
            ${escapeHtml(t("breadcrumb.all"))}
          </a>
          ${path.map((cluster, index) => `
            <span class="flex items-center text-slate-400 [&_svg]:w-3.5 [&_svg]:h-3.5">${icon("arrow-right-s-line")}</span>
            ${index === path.length - 1
              ? `<span class="text-sm font-semibold text-slate-800">${escapeHtml(cluster.label)}</span>`
              : `<a class="text-sm cursor-pointer text-sky-600 underline hover:text-sky-800" data-cluster-id="${escapeHtml(cluster.id)}">${escapeHtml(cluster.label)}</a>`
            }
          `).join("")}
        </nav>
      </div>
    `;

    // Add click handlers for breadcrumb navigation
    this.breadcrumbContainer!.querySelectorAll("[data-cluster-id]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const clusterId = (e.currentTarget as HTMLElement).dataset.clusterId;
        this.navigateToCluster(clusterId || undefined);
      });
    });
  }

  renderBreadcrumbInto(container: HTMLElement) {
    const isScatterAllMode = this.viewMode === VIEW_MODES.SCATTER_ALL;

    if (!this.selectedClusterId || !isScatterAllMode) {
      container.innerHTML = "";
      return;
    }

    const path = this.buildClusterPath(this.selectedClusterId);
    if (path.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap py-2">
        <span class="text-xs font-medium text-sky-700">${escapeHtml(t("breadcrumb.viewing"))}</span>
        <nav class="flex items-center gap-1 flex-wrap">
          <a class="text-sm cursor-pointer text-sky-600 underline hover:text-sky-800" data-cluster-id="">
            ${escapeHtml(t("breadcrumb.all"))}
          </a>
          ${path.map((cluster, index) => `
            <span class="flex items-center text-slate-400 [&_svg]:w-3.5 [&_svg]:h-3.5">${icon("arrow-right-s-line")}</span>
            ${index === path.length - 1
              ? `<span class="text-sm font-semibold text-slate-800">${escapeHtml(cluster.label)}</span>`
              : `<a class="text-sm cursor-pointer text-sky-600 underline hover:text-sky-800" data-cluster-id="${escapeHtml(cluster.id)}">${escapeHtml(cluster.label)}</a>`
            }
          `).join("")}
        </nav>
      </div>
    `;

    // Add click handlers
    container.querySelectorAll("[data-cluster-id]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const clusterId = (e.currentTarget as HTMLElement).dataset.clusterId;
        this.selectedClusterId = clusterId || undefined;
        if (this.fullscreenModal) {
          this.fullscreenModal.renderBreadcrumb();
          this.fullscreenModal.renderChart();
        }
        this.renderClusterGrid();
      });
    });
  }

  buildClusterPath(clusterId: string): BroadlisteningCluster[] {
    const path: BroadlisteningCluster[] = [];
    let currentId: string | undefined = clusterId;

    while (currentId && currentId !== "0") {
      const cluster = this.clusterById.get(currentId);
      if (cluster) {
        path.unshift(cluster);
        currentId = cluster.parent || undefined;
      } else {
        break;
      }
    }

    return path;
  }

  updateToolbarState() {
    if (this.toolbar) {
      this.toolbar.updateState(this.toolbarContainer!, {
        viewMode: this.viewMode,
        hasDensityData: this.hasDensityData,
        isDenseGroupEnabled: this.isDenseGroupEnabled
      });
    }
  }

  switchViewMode(mode: ViewMode) {
    if (this.viewMode === mode) return;

    this.viewMode = mode;
    // Reset cluster selection when switching to treemap
    if (mode === VIEW_MODES.TREEMAP) {
      this.selectedClusterId = undefined;
      this.renderClusterGrid();
    }
    this.updateToolbarState();
    this.renderBreadcrumb();
    this.renderChart();
  }

  navigateToCluster(clusterId?: string) {
    this.selectedClusterId = clusterId;
    this.renderBreadcrumb();
    this.renderChart();
    this.renderClusterGrid();
  }

  renderClusterGrid() {
    if (!this.clusterGridContainer) return;

    let clustersToShow: BroadlisteningCluster[];
    if (this.selectedClusterId) {
      clustersToShow = this.getChildClusters(this.selectedClusterId);
    } else {
      clustersToShow = this.getTopLevelClusters();
    }

    this.clusterGridContainer.innerHTML = clustersToShow.map((cluster, index) => {
      const color = CLUSTER_COLORS[index % CLUSTER_COLORS.length];
      const hasChildren = this.getChildClusters(cluster.id).length > 0;
      const cursorClass = hasChildren ? "cursor-pointer" : "";
      const valueCount = cluster.value || 0;

      return `
        <div class="card p-4 hover:shadow-md transition-shadow ${escapeHtml(cursorClass)}"
             style="border-left: 4px solid ${escapeHtml(color)};"
             data-cluster-id="${escapeHtml(cluster.id)}"
             ${hasChildren ? `title="${escapeHtml(t("cluster.click_to_expand"))}"` : ""}>
          <div class="flex items-center gap-3 mb-2">
            <span class="inline-block w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${escapeHtml(color)};"></span>
            <span class="font-semibold text-sm line-clamp-2">${escapeHtml(cluster.label)}</span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style="background-color: ${escapeHtml(color)}20; color: ${escapeHtml(color)};">
              ${escapeHtml(t("common.opinions_count", { count: valueCount }))}
            </span>
          </div>
          ${cluster.takeaway ? `<p class="text-gray-2 text-sm line-clamp-3">${escapeHtml(cluster.takeaway)}</p>` : ""}
        </div>
      `;
    }).join("");

    this.renderClusterGridBreadcrumb();
    this.bindClusterCardEvents();
  }

  renderClusterGridBreadcrumb() {
    if (!this.clusterOverviewSection) return;

    const existingBreadcrumb = this.clusterOverviewSection.querySelector('[data-blv="cluster-breadcrumb"]');
    if (existingBreadcrumb) {
      existingBreadcrumb.remove();
    }

    if (!this.selectedClusterId) return;

    const path = this.buildClusterPath(this.selectedClusterId);
    if (path.length === 0) return;

    const breadcrumbEl = document.createElement("div");
    breadcrumbEl.dataset.blv = "cluster-breadcrumb";
    breadcrumbEl.className = "mb-4 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200";
    breadcrumbEl.innerHTML = `
      <nav class="flex items-center flex-wrap gap-1">
        <a class="text-sm cursor-pointer text-sky-600 underline hover:text-sky-800" data-navigate-cluster="">
          ${escapeHtml(t("breadcrumb.all"))}
        </a>
        ${path.map((c, index) => `
          <span class="flex items-center text-slate-400 [&_svg]:w-3.5 [&_svg]:h-3.5">${icon("arrow-right-s-line")}</span>
          ${index === path.length - 1
            ? `<span class="text-sm font-semibold text-slate-800">${escapeHtml(c.label)}</span>`
            : `<a class="text-sm cursor-pointer text-sky-600 underline hover:text-sky-800" data-navigate-cluster="${escapeHtml(c.id)}">${escapeHtml(c.label)}</a>`
          }
        `).join("")}
      </nav>
    `;

    this.clusterGridContainer!.parentNode!.insertBefore(breadcrumbEl, this.clusterGridContainer!);

    breadcrumbEl.querySelectorAll("[data-navigate-cluster]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const clusterId = (e.currentTarget as HTMLElement).dataset.navigateCluster;
        this.navigateToCluster(clusterId || undefined);
        this.renderBreadcrumb();
      });
    });
  }

  renderChart() {
    if (this.scatterChart) {
      this.scatterChart.destroy();
      this.scatterChart = undefined;
    }
    if (this.treemapChart) {
      this.treemapChart.destroy();
      this.treemapChart = undefined;
    }

    this.chartContainer!.innerHTML = '<div data-blv="chart-plot" class="w-full h-[350px] md:h-[500px]"></div>';
    const plotContainer = this.chartContainer!.querySelector('[data-blv="chart-plot"]') as HTMLElement;

    this.renderChartInto(plotContainer);
  }

  renderChartInto(container: HTMLElement) {
    if (this.viewMode === VIEW_MODES.SCATTER_ALL) {
      const chart = new ScatterChart(container, this.data, {
        selectedClusterId: this.selectedClusterId,
        targetLevel: 1,
        clusterColorMap: this.clusterColorMap,
        clusterById: this.clusterById,
        childrenByParent: this.childrenByParent,
        clustersByLevel: this.clustersByLevel,
        argumentsByClusterId: this.argumentsByClusterId
      });
      chart.render();

      if (container === this.chartContainer?.querySelector('[data-blv="chart-plot"]')) {
        this.scatterChart = chart;
      }
    } else if (this.viewMode === VIEW_MODES.SCATTER_DENSITY) {
      const { filteredClusterIds } = this.getDenseClusters();

      const chart = new ScatterChart(container, this.data, {
        targetLevel: this.maxLevel,
        filteredClusterIds: filteredClusterIds,
        maxLevel: this.maxLevel,
        clusterColorMap: this.clusterColorMap,
        clusterById: this.clusterById,
        childrenByParent: this.childrenByParent,
        clustersByLevel: this.clustersByLevel,
        argumentsByClusterId: this.argumentsByClusterId
      });
      chart.render();

      if (container === this.chartContainer?.querySelector('[data-blv="chart-plot"]')) {
        this.scatterChart = chart;
      }
    } else if (this.viewMode === VIEW_MODES.TREEMAP) {
      const chart = new TreemapChart(container, this.data, {
        level: this.treemapLevel,
        onLevelChange: (level: string) => {
          this.treemapLevel = level;
        }
      });
      chart.render();

      if (container === this.chartContainer?.querySelector('[data-blv="chart-plot"]')) {
        this.treemapChart = chart;
      }
    }
  }

  toggleFullscreen() {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  enterFullscreen() {
    this.isFullscreen = true;

    this.fullscreenModal = new FullscreenModal({
      viewMode: this.viewMode,
      hasDensityData: this.hasDensityData,
      isDenseGroupEnabled: this.isDenseGroupEnabled,
      onViewModeChange: (mode: ViewMode) => {
        this.viewMode = mode;
        if (mode === VIEW_MODES.TREEMAP) {
          this.selectedClusterId = undefined;
        }
        this.fullscreenModal!.updateToolbarState({ viewMode: mode });
        this.fullscreenModal!.renderBreadcrumb();
        this.fullscreenModal!.renderChart();
      },
      onClose: () => {
        this.exitFullscreen();
      },
      renderChart: (container: HTMLElement) => {
        this.renderChartInto(container);
      },
      renderBreadcrumb: (container: HTMLElement) => {
        this.renderBreadcrumbInto(container);
      }
    });

    this.fullscreenModal.open();
  }

  exitFullscreen() {
    this.isFullscreen = false;

    if (this.fullscreenModal) {
      this.fullscreenModal.close();
      this.fullscreenModal = undefined;
    }

    this.updateToolbarState();
    this.renderBreadcrumb();
    this.renderChart();
    this.renderClusterGrid();
  }

  bindClusterCardEvents() {
    if (!this.clusterGridContainer) return;

    if (this._clusterGridClickHandler) {
      this.clusterGridContainer.removeEventListener("click", this._clusterGridClickHandler);
    }

    this._clusterGridClickHandler = (e: Event) => {
      const card = (e.target as HTMLElement).closest("[data-cluster-id]") as HTMLElement | null;
      if (!card) return;

      const clusterId = card.dataset.clusterId;
      if (clusterId && this.getChildClusters(clusterId).length > 0) {
        e.preventDefault();
        this.handleClusterCardClick(clusterId);
      }
    };

    this.clusterGridContainer.addEventListener("click", this._clusterGridClickHandler);
  }

  handleClusterCardClick(clusterId: string) {
    const children = this.getChildClusters(clusterId);

    if (children.length > 0) {
      if (this.viewMode === VIEW_MODES.TREEMAP) {
        this.viewMode = VIEW_MODES.SCATTER_ALL;
        this.updateToolbarState();
      }
      this.navigateToCluster(clusterId);
    }
  }

  getChildClusters(parentId: string): BroadlisteningCluster[] {
    return this.childrenByParent.get(parentId) || [];
  }

  getTopLevelClusters(): BroadlisteningCluster[] {
    return this.childrenByParent.get("0") || [];
  }

  getDenseClusters() {
    if (!this.hasDensityData) {
      return { filtered: [] as BroadlisteningCluster[], filteredClusterIds: new Set<string>(), isEmpty: true };
    }

    const deepestLevelClusters = this.clustersByLevel.get(this.maxLevel) || [];
    const filteredDeepestLevelClusters = deepestLevelClusters
      .filter(c => (c.density_rank_percentile ?? 1) <= this.maxDensity)
      .filter(c => (c.value || 0) >= this.minValue);

    const filteredClusterIds = new Set(filteredDeepestLevelClusters.map(c => c.id));

    const filtered: BroadlisteningCluster[] = [
      ...this.clusters.filter(c => c.level !== this.maxLevel),
      ...filteredDeepestLevelClusters
    ];

    return {
      filtered,
      filteredClusterIds,
      isEmpty: filteredDeepestLevelClusters.length === 0
    };
  }

  updateDenseGroupEnabled() {
    const { isEmpty } = this.getDenseClusters();
    this.isDenseGroupEnabled = !isEmpty;

    if (this.viewMode === VIEW_MODES.SCATTER_DENSITY && isEmpty) {
      this.viewMode = VIEW_MODES.SCATTER_ALL;
    }
  }

  openSettingsDialog() {
    this.settingsDialog = new SettingsDialog({
      maxDensity: this.maxDensity,
      minValue: this.minValue,
      onApply: (settings) => {
        this.maxDensity = settings.maxDensity;
        this.minValue = settings.minValue;

        this.updateDenseGroupEnabled();
        this.updateToolbarState();

        if (this.fullscreenModal) {
          this.fullscreenModal.updateToolbarState({
            isDenseGroupEnabled: this.isDenseGroupEnabled
          });
        }

        if (this.viewMode === VIEW_MODES.SCATTER_DENSITY) {
          this.renderChart();
          if (this.fullscreenModal) {
            this.fullscreenModal.renderChart();
          }
        }
      },
      onClose: () => {
        this.settingsDialog = undefined;
      }
    });

    this.settingsDialog.open();
  }

  destroy() {
    if (this.scatterChart) { this.scatterChart.destroy(); this.scatterChart = undefined; }
    if (this.treemapChart) { this.treemapChart.destroy(); this.treemapChart = undefined; }
    if (this.fullscreenModal) { this.fullscreenModal.close(); this.fullscreenModal = undefined; }
    if (this.settingsDialog) { this.settingsDialog.close(); this.settingsDialog = undefined; }
    if (this.clusterGridContainer && this._clusterGridClickHandler) {
      this.clusterGridContainer.removeEventListener("click", this._clusterGridClickHandler);
      this._clusterGridClickHandler = undefined;
    }
    if (this.container) this.container.innerHTML = "";
    this.toolbarContainer = undefined;
    this.breadcrumbContainer = undefined;
    this.chartContainer = undefined;
    this.clusterGridContainer = undefined;
    this.clusterOverviewSection = undefined;
    this.toolbar = undefined;
  }
}
