import { useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Image as ImageIcon, Map, CalendarDays, Building2, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../lib/store';

const navItems = [
    { name: '景区管理', path: '/scenic-spots', icon: Building2 },
    { name: '景点管理', path: '/attractions', icon: MapPin },
    { name: '景点图片', path: '/images', icon: ImageIcon },
    { name: '游览路线', path: '/tour-routes', icon: Map },
    { name: '活动管理', path: '/events', icon: CalendarDays },
];

// Map routes to their corresponding query table names
const routeToTable: Record<string, string> = {
    '/scenic-spots': 'scenic_spots',
    '/attractions': 'attractions',
    '/images': 'attraction_images',
    '/tour-routes': 'tour_routes',
    '/events': 'events',
};

const routeToQueryKey: Record<string, string> = {
    '/scenic-spots': 'scenic_spots',
    '/attractions': 'attractions',
    '/images': 'attraction_images',
    '/tour-routes': 'tour_routes',
    '/events': 'events',
};

export function Sidebar() {
    const { adminProfile, selectedScenicId } = useAppStore();
    const queryClient = useQueryClient();

    const handlePrefetch = useCallback((path: string) => {
        const table = routeToTable[path];
        const queryKey = routeToQueryKey[path];
        if (!table || !queryKey) return;

        // For scenic_spots, no scenic_id filter needed
        if (path === '/scenic-spots') {
            queryClient.prefetchQuery({
                queryKey: [queryKey],
                queryFn: async () => {
                    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
                    if (error) throw error;
                    return data;
                },
            });
        } else if (selectedScenicId) {
            queryClient.prefetchQuery({
                queryKey: [queryKey, selectedScenicId],
                queryFn: async () => {
                    const { data, error } = await supabase.from(table)
                        .select('*')
                        .eq('scenic_id', selectedScenicId)
                        .order('created_at', { ascending: false });
                    if (error) throw error;
                    return data;
                },
            });
        }
    }, [queryClient, selectedScenicId]);

    const filteredNavItems = navItems.filter(item => {
        if (item.path === '/scenic-spots' && adminProfile?.role !== 'super_admin') {
            return false;
        }
        return true;
    });

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col z-10 transition-colors duration-200">
            <div className="flex h-16 items-center px-6 border-b border-white/10">
                <LayoutDashboard className="h-6 w-6 text-primary mr-3" />
                <span className="font-semibold text-lg tracking-tight">景区管理后台</span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onMouseEnter={() => handlePrefetch(item.path)}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                                    isActive
                                        ? 'bg-primary/20 text-primary-50 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-primary/30'
                                        : 'text-white/60 hover:bg-white/10 hover:text-white hover:translate-x-1'
                                )
                            }
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {item.name}
                        </NavLink>
                    );
                })}
            </div>

            <div className="p-4 border-t border-white/10">
                <div className="text-xs text-white/40 text-center tracking-widest uppercase">
                    &copy; {new Date().getFullYear()} ASTRA SYSTEM
                </div>
            </div>
        </aside>
    );
}
