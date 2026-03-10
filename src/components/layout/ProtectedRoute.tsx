import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../lib/store';

export function ProtectedRoute() {
    const { user, setUser, setAdminProfile, selectedScenicId, setSelectedScenicId } = useAppStore();

    useEffect(() => {
        // Mock authentication process
        if (!user) {
            const mockUser = {
                id: 'mock-super-admin-id',
                email: 'admin@scenic.com',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString()
            } as any; // Cast as any to fit Supabase User type

            const mockProfile = {
                id: 'mock-super-admin-id',
                email: 'admin@scenic.com',
                role: 'super_admin' as const,
            };

            setUser(mockUser);
            setAdminProfile(mockProfile);

            // Default scenic spot for testing if none is selected
            if (!selectedScenicId) {
                // We'll let Header handle the default selection for super_admin
                // It will select the first available scenic spot automatically
            }
        }
    }, [user, setUser, setAdminProfile, selectedScenicId, setSelectedScenicId]);

    // Since we are mocking, we just render the outlet directly
    return <Outlet />;
}
