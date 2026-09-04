import type { ClassifyRequest, ClassifyResult } from '@binwhere/core';

/** Re-export domain classify types from @binwhere/core */
export type { ClassifyResult, ClassifyRequest } from '@binwhere/core';
export { ClassifyResultSchema, ClassifyResultShapeSchema } from '@binwhere/core';

/**
 * Provider interface for classification — server-side only.
 *
 * Kept here rather than in @binwhere/core because no client implements it and
 * because AbortSignal is a platform global that core is compiled without.
 */
export interface ClassifyProvider {
  name: string;
  /**
   * `signal` lets the caller enforce its own deadline. A provider that ignores it
   * leaves the upstream request running after the caller has stopped waiting.
   */
  classify(request: ClassifyRequest, signal?: AbortSignal): Promise<ClassifyResult>;
}
