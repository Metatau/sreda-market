import React, { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

// Lazy load heavy components for better performance
const Home = lazy(() => import("@/pages/Home"));
const MapPage = lazy(() => import("@/pages/MapPage"));
const InvestmentAnalyticsDemo = lazy(() => import("@/pages/InvestmentAnalyticsDemo"));
const Favorites = lazy(() => import("@/pages/Favorites").then(module => ({ default: module.Favorites })));
const Profile = lazy(() => import("@/pages/Profile").then(module => ({ default: module.Profile })));
const Comparison = lazy(() => import("@/pages/Comparison").then(module => ({ default: module.Comparison })));

function Router() {
  const { isAuthenticated, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/map" component={MapPage} />
          <Route path="/analytics" component={InvestmentAnalyticsDemo} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/profile" component={Profile} />
          <Route path="/comparison" component={Comparison} />
          <Route path="/login" component={Login} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AuthProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <Router />
          <Toaster />
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;