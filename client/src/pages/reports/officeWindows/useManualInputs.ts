import { useRef, useState } from 'react';
import { manualInputsApi } from '@/api';
import type { ManualInputs } from '@/api';
import { REPORT_TYPE } from './reportRows';
import {
  M365_DESKTOP_SKUS,
  VISIBLE_SKUS_KEY,
  availableKey,
  availableValuesOf,
  toggleSku,
  visibleSkusOf,
} from './skus';

const SAVE_DELAY_MS = 600;

/**
 * The licence figures and SKU choice typed against one agency. Every edit is
 * saved per field after a short pause, scoped to the agency whose values are
 * on screen so one agency's numbers never bleed into another.
 */
const useManualInputs = () => {
  const [agencyKey, setAgencyKey] = useState<string | null>(null);
  const [officeLicenses, setOfficeLicenses] = useState<ManualInputs>({});
  const [officeAvailable, setOfficeAvailable] = useState<ManualInputs>({});
  const [osLicenses, setOsLicenses] = useState<ManualInputs>({});
  // An agency that has never been configured shows every subscription.
  const [visibleSkus, setVisibleSkusState] = useState<string[]>(M365_DESKTOP_SKUS);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const save = (fieldKey: string, value: string) => {
    if (!agencyKey) return;
    clearTimeout(saveTimers.current[fieldKey]);
    saveTimers.current[fieldKey] = setTimeout(() => {
      manualInputsApi
        .saveManualInput(agencyKey, REPORT_TYPE, fieldKey, value)
        .catch((err: unknown) => console.error('Failed to save license value', err));
    }, SAVE_DELAY_MS);
  };

  // Product names for Office vs OS don't collide, so the same saved map backs
  // both tables; each cell reads its own product name.
  const applySaved = (saved: ManualInputs) => {
    setOfficeLicenses(saved);
    setOsLicenses(saved);
    setOfficeAvailable(availableValuesOf(saved));
    setVisibleSkusState(visibleSkusOf(saved));
  };

  /** Replace whatever is on screen with this agency's saved values. */
  const loadFor = (key: string) => {
    setAgencyKey(key);
    setOfficeLicenses({});
    setOfficeAvailable({});
    setOsLicenses({});
    setVisibleSkusState(M365_DESKTOP_SKUS);
    manualInputsApi
      .fetchManualInputs(key, REPORT_TYPE)
      .then((saved) => applySaved(saved || {}))
      .catch((err: unknown) => console.error('Failed to load license values', err));
  };

  const setOfficeLicense = (name: string, value: string) => {
    setOfficeLicenses((prev) => ({ ...prev, [name]: value }));
    save(name, value);
  };
  const setOfficeAvailableFor = (name: string, value: string) => {
    setOfficeAvailable((prev) => ({ ...prev, [name]: value }));
    save(availableKey(name), value);
  };
  const setOsLicense = (name: string, value: string) => {
    setOsLicenses((prev) => ({ ...prev, [name]: value }));
    save(name, value);
  };
  const setVisibleSkus = (next: string[]) => {
    setVisibleSkusState(next);
    save(VISIBLE_SKUS_KEY, JSON.stringify(next));
  };

  return {
    agencyKey,
    officeLicenses,
    officeAvailable,
    osLicenses,
    visibleSkus,
    loadFor,
    setOfficeLicense,
    setOfficeAvailable: setOfficeAvailableFor,
    setOsLicense,
    setVisibleSkus,
    toggleSku: (sku: string) => setVisibleSkus(toggleSku(visibleSkus, sku)),
  };
};

export default useManualInputs;
