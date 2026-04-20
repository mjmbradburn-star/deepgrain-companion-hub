import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Assess from "./pages/Assess.tsx";
import AssessStart from "./pages/AssessStart.tsx";
import AssessQuestion from "./pages/AssessQuestion.tsx";
import AssessProcessing from "./pages/AssessProcessing.tsx";
import Pillars from "./pages/Pillars.tsx";
import Ladder from "./pages/Ladder.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/assess" element={<Assess />} />
          <Route path="/assess/start" element={<AssessStart />} />
          <Route path="/assess/q/:step" element={<AssessQuestion />} />
          <Route path="/assess/processing" element={<AssessProcessing />} />
          <Route path="/pillars" element={<Pillars />} />
          <Route path="/ladder" element={<Ladder />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
