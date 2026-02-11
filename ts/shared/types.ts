// Shared type definitions for Broadlistening visualization data

/** A single argument (opinion/comment) with its coordinates and cluster assignments */
export interface BroadlisteningArgument {
  arg_id: string;
  argument: string;
  x: number;
  y: number;
  cluster_ids: string[];
}

/** A cluster node in the hierarchical cluster tree */
export interface BroadlisteningCluster {
  id: string;
  label: string;
  parent: string;
  level: number;
  value: number;
  takeaway: string;
  density_rank_percentile?: number;
}

/** Top-level data structure from Broadlistening analysis JSON */
export interface BroadlisteningData {
  arguments: BroadlisteningArgument[];
  clusters: BroadlisteningCluster[];
  overview?: string;
  comment_num?: number;
  config?: {
    comment_num?: number;
  };
}

/** Nested i18n message structure */
export interface I18nMessages {
  [key: string]: string | I18nMessages;
}
