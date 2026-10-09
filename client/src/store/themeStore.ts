import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggleMode: () => void;
}

const STORAGE_KEY = 'themeMode';

const getInitialMode = (): ThemeMode => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const useThemeStore = create<ThemeState>()((set) => ({
  mode: getInitialMode(),
  toggleMode: () =>
    set((state) => {
      const mode: ThemeMode = state.mode === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* storage unavailable: the choice lasts for this session only */
      }
      return { mode };
    }),
}));

export default useThemeStore;
