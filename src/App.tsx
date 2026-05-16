import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteNav } from "@/components/aioi/SiteNav";
import { SiteFooter } from "@/components/aioi/SiteFooter";
import { PageTransition } from "@/components/aioi/PageTransition";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Assess from "./pages/Assess.tsx";
import AssessResult from "./pages/AssessResult.tsx";
import AssessScan from "./pages/AssessScan.tsx";
import Privacy from "./pages/Privacy.tsx";
import SignIn from "./pages/SignIn.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import MyReports from "./pages/MyReports.tsx";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <PageTransition />
      <SiteNav />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/assess" element={<Assess />} />
        <Route path="/assess/scan" element={<AssessScan />} />
        <Route path="/assess/result" element={<AssessResult />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reports" element={<MyReports />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SiteFooter />
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
