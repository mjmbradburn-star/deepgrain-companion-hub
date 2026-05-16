import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PageTransition } from "@/components/aioi/PageTransition";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Assess from "./pages/Assess.tsx";
import AssessReport from "./pages/AssessReport.tsx";
import AssessResult from "./pages/AssessResult.tsx";
import AssessScan from "./pages/AssessScan.tsx";
import Privacy from "./pages/Privacy.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageTransition>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/assess" element={<Assess />} />
            <Route path="/assess/scan" element={<AssessScan />} />
            <Route path="/assess/result" element={<AssessResult />} />
            {/* Legacy redirects */}
            <Route path="/assess/start" element={<Navigate to="/assess" replace />} />
            <Route path="/assess/q/:step" element={<Navigate to="/assess/scan" replace />} />
            <Route path="/assess/processing" element={<Navigate to="/assess/scan" replace />} />
            <Route path="/assess/deep/:slug" element={<Navigate to="/assess/r/:slug" replace />} />
            <Route path="/assess/r/:slug" element={<AssessReport />} />
            {/* Old pages retired */}
            <Route path="/ai/overview" element={<Navigate to="/" replace />} />
            <Route path="/pillars" element={<Navigate to="/" replace />} />
            <Route path="/ladder" element={<Navigate to="/" replace />} />
            <Route path="/benchmarks" element={<Navigate to="/" replace />} />
            <Route path="/signin" element={<Navigate to="/assess" replace />} />
            <Route path="/reports" element={<Navigate to="/assess" replace />} />
            <Route path="/unsubscribe" element={<Navigate to="/" replace />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
