import { create } from "zustand";

type OnboardingState = {
  businessName: string;
  phone: string;
  tradeType: string;
  logoFile: File | null;
  setBusinessName: (value: string) => void;
  setPhone: (value: string) => void;
  setTradeType: (value: string) => void;
  setLogoFile: (file: File | null) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  businessName: "",
  phone: "",
  tradeType: "",
  logoFile: null,
  setBusinessName: (value) => set({ businessName: value }),
  setPhone: (value) => set({ phone: value }),
  setTradeType: (value) => set({ tradeType: value }),
  setLogoFile: (file) => set({ logoFile: file }),
  reset: () => set({ businessName: "", phone: "", tradeType: "", logoFile: null }),
}));
