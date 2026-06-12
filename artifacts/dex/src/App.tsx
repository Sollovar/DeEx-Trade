import { Switch, Route, Router as WouterRouter, useSearch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { DesktopTradePage } from "@/desktop/DesktopTradePage";
import { MobileTradePage } from "@/mobile/MobileTradePage";
import { LandingPage } from "@/pages/LandingPage";
import { useMediaQuery } from "@/hooks/use-media-query";

const queryClient = new QueryClient();

function Home() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const search = useSearch();
  const params = new URLSearchParams(search);
  
  if (params.get("app") === "1") {
    return isMobile ? <MobileTradePage /> : <DesktopTradePage />;
  }
  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

