import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout() {
    return (
        <div className="min-h-screen bg-transparent text-foreground selection:bg-primary/30 selection:text-primary-50 relative z-0">
            {/* Global background blur overlay - lowered opacity and blur for higher transparency */}
            <div className="fixed inset-0 z-[-1] backdrop-blur-[4px] bg-slate-950/20 pointer-events-none" />
            <Sidebar />
            <div className="pl-64 flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-8 overflow-x-hidden relative">
                    <div className="max-w-7xl mx-auto h-full space-y-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
