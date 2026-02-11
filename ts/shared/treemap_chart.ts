// Treemap Chart for Broadlistening visualization
import Plotly from "./plotly_shim";
import { escapeHtml } from "./decidim_core_shim";
import { t } from "./i18n";
import { wrapText } from "./utils";

// Pastel color palette for treemap (matches cluster-view)
const TREEMAP_COLORS = [
  "#b3daa1", // light green
  "#f5c5d7", // light pink
  "#d5e5f0", // light blue
  "#fbecc0", // light yellow
  "#80b8ca", // teal
  "#dabeed", // light purple
  "#fad1af", // peach
  "#fbb09d", // coral
  "#a6e3ae", // mint
  "#f1e4d6"  // cream
];

interface TreemapChartOptions {
  level: string;
  onLevelChange: ((level: string) => void) | null;
  filteredArgumentIds: Set<string> | null;
  filteredClusterIds: Set<string> | null;
}

export default class TreemapChart {
  container: HTMLElement;
  arguments: any[];
  clusters: any[];
  options: TreemapChartOptions;
  maxLevel: number;

  constructor(container: HTMLElement, data: any, options: Partial<TreemapChartOptions> = {}) {
    this.container = container;
    this.arguments = data.arguments || [];
    this.clusters = data.clusters || [];
    this.options = {
      level: "0",
      onLevelChange: null,
      filteredArgumentIds: null,
      filteredClusterIds: null,
      ...options
    };

    this.maxLevel = Math.max(...this.clusters.map((c: any) => c.level || 0), 0);
  }

  render() {
    if (this.clusters.length === 0) {
      this.container.innerHTML = `<p class="text-gray text-center py-8">${escapeHtml(t("common.no_data"))}</p>`;
      return;
    }

    const treemapData = this.buildTreemapData();
    const layout = this.buildLayout();
    const config = {
      responsive: true,
      displayModeBar: false,
      locale: "ja"
    };

    Plotly.newPlot(this.container as any, [treemapData], layout, config).then(() => {
      (this.container as any).on("plotly_click", (event: any) => {
        if (event.points && event.points[0]) {
          const clickedId = event.points[0].data.ids[event.points[0].pointNumber];
          if (clickedId && this.options.onLevelChange) {
            this.options.onLevelChange(clickedId.toString());
          }
        }
      });

      (this.container as any).on("plotly_hover", () => this.darkenPathbar());
      (this.container as any).on("plotly_unhover", () => this.darkenPathbar());
      this.darkenPathbar();
    });
  }

  buildTreemapData() {
    const { level, filteredArgumentIds, filteredClusterIds } = this.options;
    const isArgumentFiltering = !!filteredArgumentIds;
    const isClusterFiltering = !!filteredClusterIds;

    const clusterNodes = this.clusters.map((cluster: any, index: number) => {
      const isFiltered = isClusterFiltering &&
                         cluster.level === this.maxLevel &&
                         !filteredClusterIds!.has(cluster.id);

      return {
        id: cluster.id,
        label: cluster.label,
        parent: index === 0 ? "" : cluster.parent,
        value: cluster.value || 0,
        takeaway: cluster.takeaway || "",
        filtered: isFiltered
      };
    });

    const argumentNodes = this.arguments.map((arg: any) => {
      const parentClusterId = arg.cluster_ids[arg.cluster_ids.length - 1];

      let isFiltered = false;
      if (isArgumentFiltering && !filteredArgumentIds!.has(arg.arg_id)) {
        isFiltered = true;
      }
      if (isClusterFiltering) {
        const deepestClusterId = arg.cluster_ids.find((id: string) => id.startsWith(`${this.maxLevel}_`));
        if (deepestClusterId && !filteredClusterIds!.has(deepestClusterId)) {
          isFiltered = true;
        }
      }

      return {
        id: arg.arg_id,
        label: arg.argument,
        parent: parentClusterId,
        value: 1,
        takeaway: "",
        filtered: isFiltered
      };
    });

    const allNodes = [...clusterNodes, ...argumentNodes];

    return {
      type: "treemap",
      ids: allNodes.map(n => n.id),
      labels: allNodes.map(n => {
        const maxChars = n.id === level ? 50 : 15;
        return wrapText(escapeHtml(n.label), maxChars);
      }),
      parents: allNodes.map(n => n.parent),
      values: allNodes.map(n => n.filtered ? 0 : n.value),
      customdata: allNodes.map(n => {
        if (n.filtered) return "";
        return wrapText(escapeHtml(n.takeaway), 15);
      }),
      level: level,
      branchvalues: "total",
      marker: {
        colors: allNodes.map(n => n.filtered ? "#cccccc" : ""),
        line: {
          width: 1,
          color: "white"
        }
      },
      hoverinfo: "text",
      hovertemplate: "%{customdata}<extra></extra>",
      hoverlabel: {
        align: "left"
      },
      texttemplate: t("treemap.text_template"),
      textfont: {
        size: 14
      },
      insidetextfont: {
        size: 14
      },
      maxdepth: 2,
      pathbar: {
        thickness: 32,
        textfont: {
          size: 14
        }
      }
    };
  }

  buildLayout() {
    return {
      margin: { l: 10, r: 10, b: 10, t: 30 },
      colorway: TREEMAP_COLORS
    };
  }

  darkenPathbar() {
    const panels = this.container.querySelectorAll(".treemap > .slice > .surface");
    const lastPanel = panels[panels.length - 1];
    const leafColor = this.getElementColor(lastPanel);

    if (panels.length > 1) {
      this.darkenElement(panels[0], leafColor);
    }

    const pathbars = this.container.querySelectorAll(".treemap > .pathbar > .surface");
    for (const pathbar of pathbars) {
      this.darkenElement(pathbar, leafColor);
    }
  }

  getElementColor(elem: Element): string {
    if (!elem) return "";
    try {
      const style = elem.getAttribute("style") || "";
      const match = style.match(/fill:\s*(rgb\([^)]+\))/);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  }

  darkenElement(elem: Element, originalColor: string) {
    if (!elem || !originalColor) return;

    const currentColor = this.getElementColor(elem);
    if (currentColor !== originalColor) return;

    const darkenedColor = originalColor.replace(
      /rgb\((\d+),\s*(\d+),\s*(\d+)\)/,
      (_match: string, r: string, g: string, b: string) => {
        const darken = (val: string) => Math.max(0, parseInt(val) - 30);
        return `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
      }
    );

    const style = elem.getAttribute("style") || "";
    const newStyle = style.replace(originalColor, darkenedColor);
    elem.setAttribute("style", newStyle);
  }

  update(newOptions: Partial<TreemapChartOptions>) {
    this.options = { ...this.options, ...newOptions };

    const treemapData = this.buildTreemapData();
    const layout = this.buildLayout();

    Plotly.react(this.container as any, [treemapData], layout).then(() => {
      this.darkenPathbar();
    });
  }

  destroy() {
    Plotly.purge(this.container as any);
  }
}
