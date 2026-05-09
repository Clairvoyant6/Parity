// src/types/analysis.ts
// TypeScript types matching backend JSON shapes exactly

export interface GroupMetric {
  group_name: string;
  approval_rate: number;
  count: number;
}

export interface EqualizedOddsMetric {
  true_positive_rate_difference: number;
  false_positive_rate_difference: number;
}

export interface PredictiveParityMetric {
  positive_predictive_value_difference: number;
}

export interface BiasMetrics {
  bias_risk_score: number;           // 0–100
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  disparate_impact_ratio: number;    // threshold >0.8
  demographic_parity_difference: number; // threshold <0.2
  equalized_odds?: EqualizedOddsMetric;
  predictive_parity?: PredictiveParityMetric;
  model_accuracy: number;
  group_metrics: Record<string, GroupMetric[]>;
  feature_importance: Array<{ feature: string; shap_value: number }> | Record<string, number>;
  proxy_flags: Array<{
    feature: string;
    sensitive_attribute: string;
    correlation?: number;
    risk_level: 'HIGH' | 'MEDIUM';
    detection_method: string;
  }>;
  explanation: string;
  citations: string[];
  sources: string[];
  // Extra fields from the backend compute_bias_metrics
  disparate_impact_avg?: number;
  demographic_parity_avg?: number;
  dataset_size?: number;
  processed_size?: number;
  sensitive_attributes_analyzed?: string[];
}

export interface AnalyzeResponse {
  status: 'success' | 'error';
  analysis_id?: string;
  filename: string;
  target_column: string;
  sensitive_columns: string[];
  domain: string;
  persistence?: {
    saved: boolean;
    warning: string | null;
  };
  results: BiasMetrics;
}

export interface PreviewResponse {
  columns: string[];
  shape: { rows: number; cols: number };
  preview: Record<string, unknown>[];
}

export interface WhatIfResponse {
  changed_feature: string;
  original_value: string;
  new_value: string;
  original_risk_score: number;
  modified_risk_score: number;
  impact: 'IMPROVED' | 'WORSENED';
  original_metrics: BiasMetrics;
  modified_metrics: BiasMetrics;
}

export interface DemoDatasetCatalogItem {
  name: string;
  description: string;
  domain: string;
  file: string;
  suggested_target?: string;
  suggested_sensitive?: string[];
}

export interface DemoDatasetCatalogResponse {
  datasets: Array<{
    name: string;
    description: string;
    domain: string;
    file?: string;
    filename?: string;
    suggested_target?: string;
    suggested_target_column?: string;
    suggested_sensitive?: string | string[];
    suggested_sensitive_columns?: string[];
  }>;
}
