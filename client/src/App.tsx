import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ErrorPage } from "@/components/common/ErrorPage";
import { AIChat } from "@/components/AIChat";
import { YandexMetrika } from "@/components/YandexMetrika";
import { setupGlobalErrorHandling } from "@/lib/errorHandling";
import React from "react";
import { CookieConsent } from "@/components/CookieConsent";
import { Suspense, lazy } from "react";

// Lazy load страниц для оптимизации
const Landing = lazy(() => import("@/pages/Landing"));
const Home = lazy(() => import("@/pages/Home"));
const InvestmentAnalyticsDemo = lazy(() => import("@/pages/InvestmentAnalyticsDemo"));
const Insights = lazy(() => import("@/pages/Insights"));
const Favorites = lazy(() => import("@/pages/Favorites").then(module => ({ default: module.Favorites })));
const Profile = lazy(() => import("@/pages/Profile").then(module => ({ default: module.Profile })));

const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const MapTestPage = lazy(() => import("@/pages/MapTestPage"));

const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/not-found"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const PersonalDataPolicy = lazy(() => import("@/pages/PersonalDataPolicy"));
const UserAgreement = lazy(() => import("@/pages/UserAgreement"));
const PublicOffer = lazy(() => import("@/pages/PublicOffer"));
const PersonalDataConsent = lazy(() => import("@/pages/PersonalDataConsent"));

function Router() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <Switch>
        {/* Правовые документы доступны всем без аутентификации */}
        <Route path="/politika-konfidencialnosti/" component={PrivacyPolicy} />
        <Route path="/politika-obrabotki-personalnyh-dannyh/" component={PersonalDataPolicy} />
        <Route path="/polzovatelskoe-soglashenie/" component={UserAgreement} />
        <Route path="/publichnaya-oferta/" component={PublicOffer} />
        <Route path="/soglasie-na-obrabotku-personalnyh-dannyh/" component={PersonalDataConsent} />
        
        {/* Страница входа */}
        <Route path="/login">
          {isAuthenticated ? <InvestmentAnalyticsDemo /> : <Login />}
        </Route>
        
        {/* Защищенные маршруты */}
        {isAuthenticated ? (
          <AuthProvider>
            <ErrorBoundary fallback={<ErrorPage title="Ошибка страницы" />}>
              <Route path="/" component={Home} />
              <Route path="/demo" component={InvestmentAnalyticsDemo} />
              <Route path="/insights" component={Insights} />
              <Route path="/favorites" component={Favorites} />
              <Route path="/profile" component={Profile} />
              <Route path="/admin" component={AdminPanel} />
              <Route path="/map-test" component={MapTestPage} />
              <AIChat />
            </ErrorBoundary>
          </AuthProvider>
        ) : (
          <Route path="/" component={Landing} />
        )}
        
        {/* 404 страница */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Инициализация глобальной обработки ошибок
  React.useEffect(() => {
    setupGlobalErrorHandling();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <YandexMetrika />
          <Router />
          <CookieConsent />
          <Toaster />
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;