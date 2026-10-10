import type { CredentialFieldName, CredentialFieldStatus, CredentialVendor } from '@/api';

export const VENDOR_LABELS: Record<CredentialVendor, string> = {
  autotask: 'Autotask',
  datto: 'Datto',
};

/** The vendors in the order the Settings page lists their cards. */
export const VENDORS = Object.keys(VENDOR_LABELS) as CredentialVendor[];

/** Each vendor's fields in the order its card lists them. */
export const VENDOR_FIELDS: Record<CredentialVendor, CredentialFieldName[]> = {
  autotask: [
    'autotask_username',
    'autotask_secret',
    'autotask_integration_code',
    'autotask_base_url',
  ],
  datto: ['datto_api_key', 'datto_api_secret', 'datto_platform'],
};

export const FIELD_LABELS: Record<CredentialFieldName, string> = {
  autotask_username: 'Username',
  autotask_secret: 'Secret',
  autotask_integration_code: 'Integration code',
  autotask_base_url: 'Zone API URL',
  datto_api_key: 'API key',
  datto_api_secret: 'API secret',
  datto_platform: 'Platform',
};

/** The vendor's status entries in card order; a name the server did not list is left out. */
export const vendorFields = (
  fields: CredentialFieldStatus[],
  vendor: CredentialVendor
): CredentialFieldStatus[] =>
  VENDOR_FIELDS[vendor].flatMap((name) => fields.filter((field) => field.name === name));
