// Scatter Chart for Broadlistening visualization
import Plotly from "./plotly_shim";
import { getClusterColor, INACTIVE_COLOR } from "./colors";
import { escapeHtml } from "./decidim_core_shim";
import { t } from "./i18n";
import { wrapText, wrapTextWithLimit } from "./utils";

interface ScatterChartOptions {
  targetLevel: number;
  selectedClusterId: string | null;
  filteredArgumentIds: Set<string> | null;
  filteredClusterIds: Set<string> | null;
  maxLevel: number | null;
  clusterColorMap?: Map<string, string>;
  clusterById?: Map<string, any>;
  childrenByParent?: Map<string, any[]>;
  clustersByLevel?: Map<number, any[]>;
  argumentsByClusterId?: Map<string, any[]>;
}

export default class ScatterChart {
  container: HTMLElement;
  arguments: any[];
  clusters: any[];
  options: ScatterChartOptions;
  clusterById: Map<string, any>;
  childrenByParent: Map<string, any[]>;
  clustersByLevel: Map<number, any[]>;
  argumentsByClusterId: Map<string, any[]>;

  constructor(container: HTMLElement, data: any, options: Partial<ScatterChartOptions> = {}) {
    this.container = container;
    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];
    this.options = {
      targetLevel: 1,
      selectedClusterId: null,
      filteredArgumentIds: null,
      filteredClusterIds: null,
      maxLevel: null,
      ...options
    } as ScatterChartOptions;

    // Use pre-built indexes if provided, otherwise build them
    if (this.options.clusterById) {
      this.clusterById = this.options.clusterById;
      this.childrenByParent = this.options.childrenByParent!;
      this.clustersByLevel = this.options.clustersByLevel!;
      this.argumentsByClusterId = this.options.argumentsByClusterId!;
    } else {
      this.clusterById = new Map();
      this.childrenByParent = new Map();
      this.clustersByLevel = new Map();
      this.argumentsByClusterId = new Map();
      this.buildIndexes();
    }
  }

  buildIndexes() {
    this.clusterById = new Map(this.clusters.map(c => [c.id, c]));
    this.childrenByParent = new Map();
    this.clustersByLevel = new Map();
    for (const cluster of this.clusters) {
      if (cluster.parent) {
        if (!this.childrenByParent.has(cluster.parent)) {
          this.childrenByParent.set(cluster.parent, []);
        }
        this.childrenByParent.get(cluster.parent)!.push(cluster);
      }
      const level = cluster.level ?? 0;
      if (!this.clustersByLevel.has(level)) {
        this.clustersByLevel.set(level, []);
      }
      this.clustersByLevel.get(level)!.push(cluster);
    }

    this.argumentsByClusterId = new Map();
    for (const arg of this.arguments) {
      for (const clusterId of (arg.cluster_ids || [])) {
        if (!this.argumentsByClusterId.has(clusterId)) {
          this.argumentsByClusterId.set(clusterId, []);
        }
        this.argumentsByClusterId.get(clusterId)!.push(arg);
      }
    }
  }

  render() {
    if (this.arguments.length === 0) {
      this.container.innerHTML = `<p class="text-gray text-center py-8">${escapeHtml(t("common.no_data"))}</p>`;
      return;
    }

    const trace = this.buildTrace();
    const layout = this.buildLayout();
    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "resetScale2d", "toImage", "zoom2d", "pan2d"],
      displaylogo: false,
      scrollZoom: true
    };

    Plotly.newPlot(this.container as any, [trace], layout, config);
  }

  buildTrace() {
    const colors = this.getPointColors();

    return {
      x: this.arguments.map((a: any) => a.x),
      y: this.arguments.map((a: any) => a.y),
      mode: "markers",
      type: "scattergl",
      marker: {
        color: colors,
        size: 8,
        opacity: 0.7
      },
      text: this.arguments.map((a: any) => this.formatHoverText(a)),
      hoverinfo: "text",
      hovertemplate: "%{text}<extra></extra>",
      hoverlabel: {
        align: "left",
        bgcolor: "white",
        bordercolor: "#ccc",
        font: { size: 12, family: "sans-serif" }
      }
    };
  }

  buildLayout() {
    const annotations = this.getClusterAnnotations();

    return {
      showlegend: false,
      hovermode: "closest",
      dragmode: "pan",
      xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        title: ""
      },
      yaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        title: ""
      },
      margin: { l: 10, r: 10, t: 10, b: 10 },
      annotations: annotations,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)"
    };
  }

  getClusterIdAtLevel(clusterIds: string[], level: number): string | undefined {
    return clusterIds.find(id => id.startsWith(`${level}_`));
  }

  getPointColors(): string[] {
    const { targetLevel, selectedClusterId, filteredArgumentIds, filteredClusterIds, maxLevel, clusterColorMap } = this.options;
    const colorOf = (id: string) => clusterColorMap?.get(id) || getClusterColor(id);

    // Pre-compute child cluster IDs for selected cluster (if any)
    let childIds: Set<string> | null = null;
    if (selectedClusterId) {
      const childClusters = this.childrenByParent.get(selectedClusterId) || [];
      childIds = new Set(childClusters.map(c => c.id));
    }

    return this.arguments.map(arg => {
      if (filteredArgumentIds && !filteredArgumentIds.has(arg.arg_id)) {
        return INACTIVE_COLOR;
      }

      const clusterIds = arg.cluster_ids || [];

      if (filteredClusterIds && maxLevel !== null) {
        const deepestClusterId = this.getClusterIdAtLevel(clusterIds, maxLevel);
        if (!deepestClusterId || !filteredClusterIds.has(deepestClusterId)) {
          return INACTIVE_COLOR;
        }
        return colorOf(deepestClusterId);
      }

      if (selectedClusterId && childIds) {
        const childId = clusterIds.find((id: string) => childIds!.has(id));
        if (childId) {
          return colorOf(childId);
        }
        return INACTIVE_COLOR;
      }

      const clusterId = this.getClusterIdAtLevel(clusterIds, targetLevel);
      if (!clusterId) {
        return INACTIVE_COLOR;
      }

      return colorOf(clusterId);
    });
  }

  calculateCentroid(points: any[]): { x: number; y: number } | null {
    if (points.length === 0) return null;
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  getClusterAnnotations() {
    const { targetLevel, selectedClusterId, filteredClusterIds, maxLevel } = this.options;

    let clustersToShow: any[];

    if (filteredClusterIds && maxLevel !== null) {
      const maxLevelClusters = this.clustersByLevel.get(maxLevel) || [];
      clustersToShow = maxLevelClusters.filter(c => filteredClusterIds.has(c.id));
    } else if (selectedClusterId) {
      clustersToShow = this.childrenByParent.get(selectedClusterId) || [];
    } else {
      clustersToShow = this.clustersByLevel.get(targetLevel) || [];
    }

    return clustersToShow
      .filter(cluster => {
        const points = this.argumentsByClusterId.get(cluster.id);
        return points && points.length > 0;
      })
      .map(cluster => {
        const points = this.argumentsByClusterId.get(cluster.id)!;
        const centroid = this.calculateCentroid(points);

        if (!centroid) return null;

        return {
          x: centroid.x,
          y: centroid.y,
          text: wrapText(cluster.label, 16),
          showarrow: false,
          font: {
            size: 11,
            color: "#333",
            family: "sans-serif"
          },
          bgcolor: "rgba(255, 255, 255, 0.85)",
          borderpad: 4,
          borderwidth: 0
        };
      })
      .filter(a => a !== null);
  }

  formatHoverText(argument: any): string {
    const lines: string[] = [];

    const text = escapeHtml(argument.argument || "");
    const wrapped = wrapTextWithLimit(text, 30);
    lines.push(wrapped);

    const { selectedClusterId, targetLevel, filteredClusterIds, maxLevel } = this.options;

    if (filteredClusterIds && maxLevel !== null) {
      const clusterId = this.getClusterIdAtLevel(argument.cluster_ids || [], maxLevel);
      if (clusterId) {
        const cluster = this.clusterById.get(clusterId);
        if (cluster) {
          lines.push(`<b>[${escapeHtml(cluster.label)}]</b>`);
        }
      }
    } else if (selectedClusterId) {
      const childClusters = this.childrenByParent.get(selectedClusterId) || [];
      const childIds = new Set(childClusters.map(c => c.id));
      const clusterIds = argument.cluster_ids || [];
      const childId = clusterIds.find((id: string) => childIds.has(id));
      if (childId) {
        const cluster = this.clusterById.get(childId);
        if (cluster) {
          lines.push(`<b>[${escapeHtml(cluster.label)}]</b>`);
        }
      }
    } else {
      const clusterIds = argument.cluster_ids || [];
      const clusterId = this.getClusterIdAtLevel(clusterIds, targetLevel);
      if (clusterId) {
        const cluster = this.clusterById.get(clusterId);
        if (cluster) {
          lines.push(`<b>[${escapeHtml(cluster.label)}]</b>`);
        }
      }
    }

    return lines.join("<br>");
  }

  update(newOptions: Partial<ScatterChartOptions>) {
    this.options = { ...this.options, ...newOptions };

    if (this.arguments.length === 0) {
      return;
    }

    const trace = this.buildTrace();
    const layout = this.buildLayout();

    Plotly.react(this.container as any, [trace], layout);
  }

  destroy() {
    Plotly.purge(this.container as any);
  }
}
