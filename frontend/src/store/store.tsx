import { create } from 'zustand';

interface NoteStore {
    isEditEnabled: boolean;
    setIsEditEnabled: (enabled: boolean) => void;
    enableEdit: () => void;
    disableEdit: () => void;
}

export const useStore = create<NoteStore>((set) => ({
    isEditEnabled: false,
    setIsEditEnabled: (enabled) => set({ isEditEnabled: enabled }),
    enableEdit: () => set({ isEditEnabled: true }),
    disableEdit: () => set({ isEditEnabled: false }),
}));

export default useStore;