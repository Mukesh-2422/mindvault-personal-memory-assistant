import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";

// Pages barrel import
import {
  IntroPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  HomePage,
  NewMemoryPage,
  MemoryViewPage,
  SearchPage,
  TimelinePage,
  CollectionsPage,
  PeoplePage,
  PersonDetailPage,
  VaultPage,
  DeletedPage,
  ProfilePage,
  SettingsPage,
  SettingsProfilePage,
  SettingsSecurityPage,
  SettingsLanguagePage,
  SettingsAppearancePage,
  SettingsAIPage,
  SettingsDataPage,
  SettingsVaultSecurityPage,
  VoiceMemoriesPage,
  VaultResetPage,
} from "./pages";


import "./styles/global.css";

/**
 * ScrollToTop Component
 * Resets global window scroll, HTML/body scroll, and main-content containers
 * on every route transition while preventing browser automatic scroll restoration to the bottom.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const containers = document.querySelectorAll(
      ".main-content, .app, .settings-page, .profile-page, .settings-sub-page, .page-container"
    );
    containers.forEach((el) => {
      if (el) el.scrollTop = 0;
    });
  }, [pathname]);

  return null;
}

function ProtectedRoute({ children }) {
  const { state } = useApp();
  if (!state.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AppRoutes() {
  const { state } = useApp();

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/"
        element={
          state.isAuthenticated ? <Navigate to="/home" replace /> : <IntroPage />
        }
      />
      <Route
        path="/login"
        element={
          state.isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          state.isAuthenticated ? <Navigate to="/home" replace /> : <RegisterPage />
        }
      />
      <Route
        path="/forgot-password"
        element={
          state.isAuthenticated ? <Navigate to="/home" replace /> : <ForgotPasswordPage />
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          state.isAuthenticated ? <Navigate to="/home" replace /> : <ResetPasswordPage />
        }
      />

      {/* Protected */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/new"
        element={
          <ProtectedRoute>
            <NewMemoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/memory/:id"
        element={
          <ProtectedRoute>
            <MemoryViewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeline"
        element={
          <ProtectedRoute>
            <TimelinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collections"
        element={
          <ProtectedRoute>
            <CollectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <PeoplePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/people/:id"
        element={
          <ProtectedRoute>
            <PersonDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault"
        element={
          <ProtectedRoute>
            <VaultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deleted"
        element={
          <ProtectedRoute>
            <DeletedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <SettingsProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/security"
        element={
          <ProtectedRoute>
            <SettingsSecurityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/language"
        element={
          <ProtectedRoute>
            <SettingsLanguagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/appearance"
        element={
          <ProtectedRoute>
            <SettingsAppearancePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/ai"
        element={
          <ProtectedRoute>
            <SettingsAIPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/data"
        element={
          <ProtectedRoute>
            <SettingsDataPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/vault-security"
        element={
          <ProtectedRoute>
            <SettingsVaultSecurityPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/voice-memories"
        element={
          <ProtectedRoute>
            <VoiceMemoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vault-reset/:token"
        element={
          state.isAuthenticated ? <Navigate to="/vault" replace /> : <VaultResetPage />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}



