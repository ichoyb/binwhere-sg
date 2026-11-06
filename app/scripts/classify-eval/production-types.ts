import type { ClassifyResult, Locale } from '@binwhere/core';
import type { ClassificationExecutionPolicy } from '../../src/lib/ai/provider';

export interface ManifestCase {
  id: string;
  suite: 'text' | 'bcrs';
  mode: 'text' | 'image';
  locale: Locale;
  text?: string;
  image?: {
    sourceId: string;
    path: string;
    sha256: string;
    crop?: { left: number; top: number; width: number; height: number };
  };
}

export interface ProductionManifest {
  schemaVersion: 1;
  digest: string;
  cases: ManifestCase[];
}

export interface WorktreePreflight {
  revision: string;
  trackedChanges: string[];
  lockfiles: Record<string, string>;
  checks: { head: true; trackedChanges: true; lockfiles: true };
}

export interface ProductionContext {
  preflight: WorktreePreflight;
  executionPolicy: ClassificationExecutionPolicy;
}

export interface ProductionSource extends ProductionContext {
  manifestDigest: string;
  modulePaths: Record<string, string>;
  dependencies: { sharp: string; appZod: string; coreZod: string };
  models: { text: string; image: string };
  nodeVersion: string;
  policyFieldsMatch: true;
  dryRun: boolean;
  startedAt: string;
  endedAt: string;
  imagePipeline: { maxSize: number; quality: number };
  preparedImages: Array<{ sourceId: string; sha256: string }>;
  imageIndependence: {
    nearDuplicateSimilarityLimit: number;
    closestPair: { leftSourceId: string; rightSourceId: string; similarity: number } | null;
  };
}

export interface ProductionRawOutput {
  schemaVersion: 1;
  source: ProductionSource;
  results: Array<{
    id: string;
    result: ClassifyResult | null;
    error?: string;
    durationMs: number;
  }>;
  fatalError?: string;
}
