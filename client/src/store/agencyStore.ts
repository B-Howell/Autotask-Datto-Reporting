import { create } from 'zustand';
import { agenciesApi } from '@/api';
import type { Agency } from '@/api';

interface AgencyState {
  agencies: Agency[];
  loaded: boolean;
  fetchAgencies: () => Promise<void>;
  addAgency: (agency: Agency) => Promise<void>;
  removeAgency: (id: number) => Promise<void>;
}

// The agency list lives on the server so additions are shared across every
// browser; this store is a cache of it.
const useAgencyStore = create<AgencyState>()((set) => ({
  agencies: [],
  loaded: false,

  fetchAgencies: async () => {
    try {
      set({ agencies: await agenciesApi.fetchAgencies(), loaded: true });
    } catch (err) {
      console.error('Failed to load agencies:', err);
      set({ loaded: true });
    }
  },

  addAgency: async (agency) => {
    try {
      set({ agencies: await agenciesApi.createAgency(agency) });
    } catch (err) {
      console.error('Failed to add agency:', err);
    }
  },

  removeAgency: async (id) => {
    try {
      set({ agencies: await agenciesApi.deleteAgency(id) });
    } catch (err) {
      console.error('Failed to remove agency:', err);
    }
  },
}));

export default useAgencyStore;
