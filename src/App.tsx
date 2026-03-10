import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ScenicSpotsPage } from './pages/ScenicSpots';
import { AttractionsPage } from './pages/Attractions';
import { AttractionImagesPage } from './pages/AttractionImages';
import { TourRoutesPage } from './pages/TourRoutes';
import { EventsPage } from './pages/Events';
import { LoginPage } from './pages/Login';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5分钟内视为新鲜，不重新请求
      gcTime: 24 * 60 * 60 * 1000,    // 24小时内存留缓存，配合持久化
      refetchOnWindowFocus: false,     // 窗口聚焦不重新请求
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/scenic-spots" replace />} />
              <Route path="scenic-spots" element={<ScenicSpotsPage />} />
              <Route path="attractions" element={<AttractionsPage />} />
              <Route path="images" element={<AttractionImagesPage />} />
              <Route path="tour-routes" element={<TourRoutesPage />} />
              <Route path="events" element={<EventsPage />} />
              {/* Other routes will be added here */}
              <Route path="*" element={<div>404 页面未找到</div>} />
            </Route>
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </PersistQueryClientProvider>
  );
}

export default App;
