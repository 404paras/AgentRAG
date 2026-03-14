import { create } from 'zustand';

interface NoteStore {
    isEditEnabled: boolean;
    enableEdit: () => void;
    disableEdit: () => void;
}

export const useStore = create<NoteStore>((set) => ({
    isEditEnabled: false,
    enableEdit: () => set({ isEditEnabled: true }),
    disableEdit: () => set({ isEditEnabled: false }),
}));

export default useStore;