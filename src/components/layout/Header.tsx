import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../lib/store';
import type { ScenicSpot } from '../../types/database';

export function Header() {
    const [isDark, setIsDark] = useState<boolean>(false);
    const navigate = useNavigate();
    const { selectedScenicId, setSelectedScenicId, user, adminProfile, setUser, setAdminProfile } = useAppStore();

    const { data: scenicSpots = [], isLoading } = useQuery({
        queryKey: ['scenic_spots'],
        queryFn: async () => {
            let query = supabase.from('scenic_spots').select('id, name');
            if (adminProfile?.role === 'scenic_admin' && adminProfile.scenic_id) {
                query = query.eq('id', adminProfile.scenic_id);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data as Pick<ScenicSpot, 'id' | 'name'>[];
        },
        enabled: !!adminProfile
    });

    // Auto-select the first scenic spot if nothing is selected and data is available
    useEffect(() => {
        if (!selectedScenicId && scenicSpots.length > 0) {
            setSelectedScenicId(scenicSpots[0].id);
        }
    }, [scenicSpots, selectedScenicId, setSelectedScenicId]);

    useEffect(() => {
        // Check initial color scheme
        const isDarkMode = document.documentElement.classList.contains('dark') ||
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setIsDark(isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setIsDark((prev) => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return next;
        });
    }, []);

    const handleLogout = () => {
        setUser(null);
        setAdminProfile(null);
        navigate('/login', { replace: true });
    };

    return (
        <header className="h-16 border-b border-white/10 bg-white/5 backdrop-blur-2xl flex items-center justify-end px-6 sticky top-0 z-10 transition-colors duration-200">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 mr-4">
                    <span className="text-sm font-medium text-white/70 whitespace-nowrap">当前景区:</span>
                    <select
                        value={selectedScenicId || ''}
                        onChange={(e) => setSelectedScenicId(e.target.value)}
                        disabled={isLoading || scenicSpots.length === 0}
                        className="flex h-9 w-[200px] rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="" disabled>选择景区</option>
                        {scenicSpots.map((spot) => (
                            <option key={spot.id} value={spot.id}>
                                {spot.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    aria-label="切换深色模式"
                >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                            <span className="text-sm font-bold text-primary-50">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">{user?.email || 'User'}</span>
                            <span className="text-xs text-white/50 tracking-wider">
                                {adminProfile?.role === 'super_admin' ? '超级管理员' : '景区管理员'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-full text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-colors ml-2"
                        title="退出登录"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
