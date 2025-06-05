import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import Home from "@/pages/Home";
import MapPage from "@/pages/MapPage";
import InvestmentAnalyticsDemo from "@/pages/InvestmentAnalyticsDemo";
import { Favorites } from "@/pages/Favorites";
import { Profile } from "@/pages/Profile";
import { Comparison } from "@/pages/Comparison";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

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
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;