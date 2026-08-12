export interface PipelineLeadSourceOption {
  value: string;
  label: string;
}

/** Lead source values stored on pipeline_cards.source */
export const PIPELINE_LEAD_SOURCES: PipelineLeadSourceOption[] = [
  { value: 'Walk-in', label: 'Walk-in' },
  { value: 'Website hero', label: 'Website — Hero banner' },
  { value: 'Website', label: 'Website — Contact form' },
  { value: 'FB Ad', label: 'FB Ad' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Other', label: 'Other' },
];

export const DEFAULT_PIPELINE_LEAD_SOURCE = 'Walk-in';

export function normalizePipelineLeadSource(
  source: string | null | undefined
): string {
  const trimmed = source?.trim();
  if (!trimmed) return DEFAULT_PIPELINE_LEAD_SOURCE;

  const exact = PIPELINE_LEAD_SOURCES.find((option) => option.value === trimmed);
  if (exact) return exact.value;

  const lower = trimmed.toLowerCase();
  if (lower === 'website hero' || lower === 'website — hero banner') {
    return 'Website hero';
  }
  if (lower === 'website' || lower === 'website — contact form') {
    return 'Website';
  }

  return trimmed;
}

export function formatPipelineLeadSource(
  source: string | null | undefined
): string {
  const normalized = normalizePipelineLeadSource(source);
  const option = PIPELINE_LEAD_SOURCES.find((item) => item.value === normalized);
  return option?.label || normalized;
}
