import type { CredentialFieldName, CredentialFieldStatus, CredentialValues } from '@/api';

/** The trimmed, non-blank entries: what a test or save sends, since blank means "keep". */
export const typedValues = (values: CredentialValues): CredentialValues => {
  const typed: CredentialValues = {};
  for (const [name, value] of Object.entries(values) as [CredentialFieldName, string][]) {
    const trimmed = value.trim();
    if (trimmed) typed[name] = trimmed;
  }
  return typed;
};

/**
 * The field carrying the most recent test among `fields`, or null when none was tested.
 * Timestamps are ISO strings from one server, so they compare as text; a tie keeps the
 * field listed first.
 */
export const latestTest = (fields: CredentialFieldStatus[]): CredentialFieldStatus | null =>
  fields.reduce<CredentialFieldStatus | null>((latest, field) => {
    if (!field.last_tested_at) return latest;
    if (!latest?.last_tested_at || field.last_tested_at > latest.last_tested_at) return field;
    return latest;
  }, null);
