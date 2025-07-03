// apps/mobile/src/store/languageStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageStore {
  currentLanguage: string;
  setLanguage: (lang: string) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  currentLanguage: 'en',
  
  setLanguage: async (lang: string) => {
    await AsyncStorage.setItem('preferred_language', lang);
    set({ currentLanguage: lang });
  },
  
  loadLanguage: async () => {
    const saved = await AsyncStorage.getItem('preferred_language');
    if (saved) {
      set({ currentLanguage: saved });
    }
  },
}));