import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import type { AdminProfile } from '../types/database';

interface AppState {
    selectedScenicId: string | null;
    setSelectedScenicId: (id: string | null) => void;
    user: User | null;
    setUser: (user: User | null) => void;
    adminProfile: AdminProfile | null;
    setAdminProfile: (profile: AdminProfile | null) => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            selectedScenicId: null,
            setSelectedScenicId: (id) => set({ selectedScenicId: id }),
            user: null,
            setUser: (user) => set({ user }),
            adminProfile: null,
            setAdminProfile: (profile) => set({ adminProfile: profile }),
        }),
        {
            name: 'scenic-app-storage', // name of the item in the storage (must be unique)
            partialize: (state) => ({ selectedScenicId: state.selectedScenicId }), // Only persist selectedScenicId
        }
    )
);
