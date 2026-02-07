import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import TargetListPage from '@/pages/targets/TargetListPage';
import TargetCreatePage from '@/pages/targets/TargetCreatePage';
import TargetDetailPage from '@/pages/targets/TargetDetailPage';
import ScanListPage from '@/pages/scans/ScanListPage';
import ScanResultsPage from '@/pages/scans/ScanResultsPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/targets" element={<ProtectedRoute><TargetListPage /></ProtectedRoute>} />
      <Route path="/targets/new" element={<ProtectedRoute><TargetCreatePage /></ProtectedRoute>} />
      <Route path="/targets/:id" element={<ProtectedRoute><TargetDetailPage /></ProtectedRoute>} />
      <Route path="/scans" element={<ProtectedRoute><ScanListPage /></ProtectedRoute>} />
      <Route path="/scans/:id" element={<ProtectedRoute><ScanResultsPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
