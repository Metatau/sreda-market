import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { AIChat } from "@/components/AIChat";
import { YandexMetrika } from "@/components/YandexMetrika";
import { CookieConsent } from "@/components/CookieConsent";
import Home from "@/pages/Home";
import MapPage from "@/pages/MapPage";
import InvestmentAnalyticsDemo from "@/pages/InvestmentAnalyticsDemo";
import { Favorites } from "@/pages/Favorites";
import { Profile } from "@/pages/Profile";
import { Comparison } from "@/pages/Comparison";
import AdminPanel from "@/pages/AdminPanel";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import PersonalDataPolicy from "@/pages/PersonalDataPolicy";
import UserAgreement from "@/pages/UserAgreement";
import PublicOffer from "@/pages/PublicOffer";
import PersonalDataConsent from "@/pages/PersonalDataConsent";

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
    <Switch>
      {/* Правовые документы доступны всем без аутентификации */}
      <Route path="/politika-konfidencialnosti/" component={PrivacyPolicy} />
      <Route path="/politika-obrabotki-personalnyh-dannyh/" component={PersonalDataPolicy} />
      <Route path="/polzovatelskoe-soglashenie/" component={UserAgreement} />
      <Route path="/publichnaya-oferta/" component={PublicOffer} />
      <Route path="/soglasie-na-obrabotku-personalnyh-dannyh/" component={PersonalDataConsent} />
      
      {/* Страница входа */}
      <Route path="/login">
        {isAuthenticated ? <Home /> : <Login />}
      </Route>
      
      {/* Защищенные маршруты */}
      {isAuthenticated ? (
        <AuthProvider>
          <Route path="/" component={Home} />
          <Route path="/map" component={MapPage} />
          <Route path="/analytics" component={InvestmentAnalyticsDemo} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/profile" component={Profile} />
          <Route path="/comparison" component={Comparison} />
          <Route path="/admin" component={AdminPanel} />
          <AIChat />
        </AuthProvider>
      ) : (
        <Route>
          <Login />
        </Route>
      )}
      
      {/* 404 страница */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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