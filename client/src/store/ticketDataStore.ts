import { create } from 'zustand';
import type { AgencyValue, TicketDetails } from '@/api';

interface TicketDataState {
  ticketData: TicketDetails | null;
  loading: boolean;
  selectedCompany: AgencyValue | null;
  error: string | null;
  setTicketData: (data: TicketDetails | null) => void;
  setLoading: (loading: boolean) => void;
  setSelectedCompany: (value: AgencyValue | null) => void;
  setError: (error: string | null) => void;
}

const useTicketDataStore = create<TicketDataState>()((set) => ({
  ticketData: null,
  loading: false,
  selectedCompany: null,
  error: null,

  setTicketData: (ticketData) => set({ ticketData }),
  setLoading: (loading) => set({ loading }),
  setSelectedCompany: (selectedCompany) => set({ selectedCompany }),
  setError: (error) => set({ error }),
}));

export default useTicketDataStore;
