import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import { RequireAuth } from '@/components/RequireAuth';
import { AuthProvider } from '@/context/AuthContext';
import { HomePage } from '@/pages/HomePage';
import { LandingPage } from '@/pages/LandingPage';
import { ListDetailPage } from '@/pages/ListDetailPage';
import { ListsPage } from '@/pages/ListsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/lists" element={<ListsPage />} />
              <Route path="/lists/:listId" element={<ListDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
