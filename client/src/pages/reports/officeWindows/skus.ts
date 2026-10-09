import type { InstallBreakdownItem, ManualInputs } from '@/api';

// The Microsoft 365 installs are variants of one subscription family, so they
// nest under a single "Office 365" heading rather than standing as unrelated
// products. Perpetual editions (Office LTSC Standard 2024 and friends) have no
// family to sit under and stay as top-level rows.
export const M365_PREFIX = 'Microsoft 365';
export const M365_GROUP_LABEL = 'Office 365';

// Every Office 365 subscription that entitles a user to install the desktop
// apps. Web-and-mobile-only plans are deliberately absent — Business Basic,
// Office 365 E1 and Microsoft 365 F3 all look like Office licences but grant no
// desktop install, so a licence figure against them would not belong here.
//
// The whole list is offered on screen; whichever lines are left blank never
// reach the exported report, so a customer only ever sees what they own.
export const M365_DESKTOP_SKUS = [
  'Microsoft 365 Apps for business',
  'Microsoft 365 Apps for enterprise',
  'Microsoft 365 Business Standard',
  'Microsoft 365 Business Premium',
  'Microsoft 365 E3',
  'Microsoft 365 E5',
  'Microsoft 365 A3',
  'Microsoft 365 A5',
  'Office 365 E3',
  'Office 365 E5',
  'Office 365 A3',
  'Office 365 A5',
];

// Manual values are stored per product. Licenses keeps the bare product name so
// figures entered before the Available column existed still load.
const AVAILABLE_PREFIX = 'available::';
export const availableKey = (productKey: string): string => `${AVAILABLE_PREFIX}${productKey}`;

// Which subscription lines this agency shows, stored alongside the figures so
// the choice follows the agency rather than the browser.
export const VISIBLE_SKUS_KEY = 'officeLicense::visibleSkus';

export interface BundledOfficeRow {
  key: string;
  name: string;
  installs?: number;
  isGroup?: boolean;
  isChild?: boolean;
  devices?: string[];
}

// Office 365 is licensed as one thing and installed as several. The install
// count is therefore a property of the family, not of a subscription: an "Apps
// for business" install can belong to a user licensed under Office 365 E3, so
// pinning installs to a SKU line would assert a match that isn't real. The
// family row carries the total; the SKU rows carry licence figures only.
export const groupOfficeInstalls = (
  items: InstallBreakdownItem[],
  visibleSkus: string[]
): BundledOfficeRow[] => {
  const isVariant = (i: InstallBreakdownItem) => (i.name || '').startsWith(M365_PREFIX);
  const variants = items.filter(isVariant);
  const standalone = items.filter((i) => !isVariant(i));
  const rows: BundledOfficeRow[] = [];
  if (variants.length) {
    rows.push({
      key: M365_GROUP_LABEL,
      name: M365_GROUP_LABEL,
      installs: variants.reduce((sum, i) => sum + (i.installs || 0), 0),
      isGroup: true,
      devices: variants.flatMap((i) => i.devices || []),
    });
    visibleSkus.forEach((sku) => rows.push({ key: sku, name: sku, isChild: true }));
  }
  standalone.forEach((item) => {
    rows.push({ key: item.name, name: item.name, installs: item.installs, devices: item.devices });
  });
  return rows;
};

/** The Available figures, with their namespace prefix stripped back off. */
export const availableValuesOf = (saved: ManualInputs): ManualInputs =>
  Object.fromEntries(
    Object.entries(saved)
      .filter(([key]) => key.startsWith(AVAILABLE_PREFIX))
      .map(([key, value]) => [key.slice(AVAILABLE_PREFIX.length), value])
  );

// An agency that has never been configured shows every subscription; an
// empty saved list means every box was unticked, which is not the same
// thing and must survive the reload.
export const visibleSkusOf = (saved: ManualInputs): string[] => {
  try {
    const parsed: unknown = JSON.parse(saved[VISIBLE_SKUS_KEY] ?? 'null');
    if (Array.isArray(parsed)) return M365_DESKTOP_SKUS.filter((s) => parsed.includes(s));
  } catch {
    /* unreadable: show all */
  }
  return M365_DESKTOP_SKUS;
};

/** Kept in M365_DESKTOP_SKUS order rather than click order, so the table reads the same however the boxes were ticked. */
export const toggleSku = (visible: string[], sku: string): string[] =>
  visible.includes(sku)
    ? visible.filter((s) => s !== sku)
    : M365_DESKTOP_SKUS.filter((s) => s === sku || visible.includes(s));
