import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout/Shell";
import Home from "@/pages/home";
import History from "@/pages/history";
import SettingsPage from "@/pages/settings";
import StreamPage from "@/pages/stream";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/stream" component={StreamPage} />
        <Route path="/history" component={History} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
