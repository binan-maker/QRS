import { create } from "zustand";

interface UIState {
  globalLoading: boolean;
  toastMessage: string | null;
  toastType: "success" | "error" | "info" | null;
  activeModal: string | null;
  setGlobalLoading: (v: boolean) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  hideToast: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  globalLoading: false,
  toastMessage: null,
  toastType: null,
  activeModal: null,
  setGlobalLoading: (v) => set({ globalLoading: v }),
  showToast: (message, type = "info") => set({ toastMessage: message, toastType: type }),
  hideToast: () => set({ toastMessage: null, toastType: null }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));

export const selectGlobalLoading = (s: UIState) => s.globalLoading;
export const selectToast = (s: UIState) => ({ message: s.toastMessage, type: s.toastType });
export const selectActiveModal = (s: UIState) => s.activeModal;
