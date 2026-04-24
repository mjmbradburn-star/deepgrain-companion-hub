import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PageTransition } from "@/components/aioi/PageTransition";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Assess from "./pages/Assess.tsx";
import AssessStart from "./pages/AssessStart.tsx";
import AssessQuestion from "./pages/AssessQuestion.tsx";
import AssessProcessing from "./pages/AssessProcessing.tsx";
import AssessReport from "./pages/AssessReport.tsx";
import AssessScan from "./pages/AssessScan.tsx";
import AssessDeep from "./pages/AssessDeep.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import AiOverview from "./pages/AiOverview.tsx";
import Pillars from "./pages/Pillars.tsx";
import Ladder from "./pages/Ladder.tsx";
import Benchmarks from "./pages/Benchmarks.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import SignIn from "./pages/SignIn.tsx";
import MyReports from "./pages/MyReports.tsx";
import DevHeroCta from "./pages/DevHeroCta.tsx";
import Privacy from "./pages/Privacy.tsx";
import DeployReview from "./pages/DeployReview.tsx";
import AdminPlaybookLayout from "./pages/admin/AdminPlaybookLayout.tsx";
import MovesListPage from "./pages/admin/MovesListPage.tsx";
import MoveEditorPage from "./pages/admin/MoveEditorPage.tsx";
import CoveragePage from "./pages/admin/CoveragePage.tsx";
import StalePage from "./pages/admin/StalePage.tsx";
import TestReportPage from "./pages/admin/TestReportPage.tsx";
import { CookieBanner } from "@/components/aioi/CookieBanner";

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
          <Route path="/assess/deep/:slug" element={<AssessDeep />} />
          <Route path="/assess/start" element={<AssessStart />} />
          <Route path="/assess/q/:step" element={<AssessQuestion />} />
          <Route path="/assess/processing" element={<AssessProcessing />} />
          <Route path="/assess/r/:slug" element={<AssessReport />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/ai/overview" element={<AiOverview />} />
          <Route path="/pillars" element={<Pillars />} />
          <Route path="/ladder" element={<Ladder />} />
          <Route path="/benchmarks" element={<Benchmarks />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/reports" element={<MyReports />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/deploy-review" element={<DeployReview />} />
          <Route path="/admin/playbook" element={<AdminPlaybookLayout />}>
            <Route index element={<MovesListPage />} />
            <Route path="coverage" element={<CoveragePage />} />
            <Route path="stale" element={<StalePage />} />
            <Route path="test" element={<TestReportPage />} />
            <Route path="new" element={<MoveEditorPage />} />
            <Route path=":id" element={<MoveEditorPage />} />
          </Route>
          {import.meta.env.DEV && <Route path="/dev/hero-cta" element={<DevHeroCta />} />}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </PageTransition>
        <CookieBanner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
