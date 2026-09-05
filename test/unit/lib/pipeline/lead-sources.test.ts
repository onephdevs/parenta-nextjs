import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PIPELINE_LEAD_SOURCE,
  formatPipelineLeadSource,
  normalizePipelineLeadSource,
} from '@/lib/pipeline/lead-sources';

describe('pipeline lead sources', () => {
  it('defaults a blank source to Walk-in', () => {
    expect(normalizePipelineLeadSource('')).toBe(DEFAULT_PIPELINE_LEAD_SOURCE);
  });

  it('normalizes website aliases', () => {
    expect(normalizePipelineLeadSource('website hero')).toBe('Website hero');
    expect(formatPipelineLeadSource('Website')).toBe('Website — Contact form');
  });
});
