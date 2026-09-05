import { describe, expect, it } from 'vitest';

import {
  DEFAULT_KEY_TERM_FIELDS,
  isKeyTermsSentenceBody,
  keyTermsDisplayBody,
  parseKeyTermFields,
  serializeKeyTermFields,
} from '@/lib/lease-templates/key-terms';

describe('lease key terms', () => {
  it('recognizes the sentence-style clause body', () => {
    expect(
      isKeyTermsSentenceBody('For this tenancy, the monthly rent is {{lease.rentAmount}}.')
    ).toBe(true);
    expect(isKeyTermsSentenceBody('Monthly rent: 8000')).toBe(false);
  });

  it('round-trips JSON field config', () => {
    const json = serializeKeyTermFields(DEFAULT_KEY_TERM_FIELDS);
    expect(parseKeyTermFields(json).map((f) => f.id)).toEqual(
      DEFAULT_KEY_TERM_FIELDS.map((f) => f.id)
    );
  });

  it('renders visible fields as a sentence', () => {
    const body = keyTermsDisplayBody(
      DEFAULT_KEY_TERM_FIELDS.map((f) => ({
        ...f,
        visible: f.id === 'rentAmount' || f.id === 'unit',
      }))
    );
    expect(body).toMatch(/monthly rent is \{\{lease\.rentAmount\}\}/);
    expect(body).toMatch(/Unit \{\{unit\.number\}\}/);
  });
});
