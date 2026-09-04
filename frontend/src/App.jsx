import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import DashboardErrorBoundary from './components/DashboardErrorBoundary';
import AppShell from './layouts/AppShell';
import ExplorePage from './pages/ExplorePage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route
              path="/dashboard"
              element={
                <DashboardErrorBoundary>
                  <DashboardPage />
                </DashboardErrorBoundary>
              }
            />
            <Route path="/explore" element={<ExplorePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
