import { useMemo, useRef, useState } from 'react';
import { manualInputsApi } from '@/api';
import type { ManualInputs } from '@/api';
import { REPORT_TYPE } from './reportRows';
import {
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
 *
 * The state is the saved map exactly as the server holds it, so the export
 * input is built from the same shape whether the figures come from this hook
 * or straight from the API.
 */
const useManualInputs = () => {
  const [agencyKey, setAgencyKey] = useState<string | null>(null);
  const [values, setValues] = useState<ManualInputs>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Product names for Office vs OS don't collide, so one map backs both
  // tables; each cell reads its own product name. The derived values key on
  // the entries they depend on, not the whole map, so a licence keystroke
  // leaves their references alone and the grouped Office rows stay put.
  const availableJson = JSON.stringify(availableValuesOf(values));
  const officeAvailable = useMemo(() => JSON.parse(availableJson) as ManualInputs, [availableJson]);
  // An agency that has never been configured shows every subscription.
  const savedSkus = values[VISIBLE_SKUS_KEY];
  const visibleSkus = useMemo(
    () => visibleSkusOf(savedSkus === undefined ? {} : { [VISIBLE_SKUS_KEY]: savedSkus }),
    [savedSkus]
  );

  const save = (fieldKey: string, value: string) => {
    if (!agencyKey) return;
    clearTimeout(saveTimers.current[fieldKey]);
    saveTimers.current[fieldKey] = setTimeout(() => {
      manualInputsApi
        .saveManualInput(agencyKey, REPORT_TYPE, fieldKey, value)
        .catch((err: unknown) => console.error('Failed to save license value', err));
    }, SAVE_DELAY_MS);
  };

  const set = (fieldKey: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
    save(fieldKey, value);
  };

  /** Replace whatever is on screen with this agency's saved values. */
  const loadFor = (key: string) => {
    setAgencyKey(key);
    setValues({});
    manualInputsApi
      .fetchManualInputs(key, REPORT_TYPE)
      .then((saved) => setValues(saved || {}))
      .catch((err: unknown) => console.error('Failed to load license values', err));
  };

  const setVisibleSkus = (next: string[]) => set(VISIBLE_SKUS_KEY, JSON.stringify(next));

  return {
    agencyKey,
    /** The saved map: licence counts by product, Available counts and the plan list. */
    values,
    officeAvailable,
    visibleSkus,
    loadFor,
    setOfficeLicense: set,
    setOfficeAvailable: (name: string, value: string) => set(availableKey(name), value),
    setOsLicense: set,
    setVisibleSkus,
    toggleSku: (sku: string) => setVisibleSkus(toggleSku(visibleSkus, sku)),
  };
};

export default useManualInputs;
