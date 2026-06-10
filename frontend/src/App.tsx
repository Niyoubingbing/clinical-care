import { useEffect } from "react";
import { BrowserRouter, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { PageTransition } from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import PatientList from "@/pages/PatientList";
import PatientDetail from "@/pages/PatientDetail";
import TodoSummary from "@/pages/TodoSummary";
import DailySummaryPage from "@/pages/DailySummaryPage";
import DataManagement from "@/pages/DataManagement";
import { usePatients } from "@/hooks/use-patients";
import { useMemos } from "@/hooks/use-memos";
import { useReminders } from "@/hooks/use-reminders";

function AppContent() {
  const { loadAll: loadPatients } = usePatients();
  const { loadAll: loadMemos } = useMemos();
  const { runAllReminders } = useReminders();

  useEffect(() => {
    loadPatients();
    loadMemos().then(() => runAllReminders());
  }, []);

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen pb-16">
        <div className="flex-1">
          <AnimatedRoutes>
            <Route
              path="/"
              data-genie-title="Patient List"
              data-genie-key="PatientList"
              element={<PageTransition transition="slide-up"><PatientList /></PageTransition>}
            />
            <Route
              path="/patient/:id"
              data-genie-title="Patient Detail"
              data-genie-key="PatientDetail"
              element={<PageTransition transition="slide-up"><PatientDetail /></PageTransition>}
            />
            <Route
              path="/todos"
              data-genie-title="Todo Summary"
              data-genie-key="TodoSummary"
              element={<PageTransition transition="slide-up"><TodoSummary /></PageTransition>}
            />
            <Route
              path="/summary"
              data-genie-title="Daily Summary"
              data-genie-key="DailySummary"
              element={<PageTransition transition="slide-up"><DailySummaryPage /></PageTransition>}
            />
            <Route
              path="/data"
              data-genie-title="Data Management"
              data-genie-key="DataManagement"
              element={<PageTransition transition="slide-up"><DataManagement /></PageTransition>}
            />
          </AnimatedRoutes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster position="top-center" />
      <AppContent />
    </TooltipProvider>
  );
}

export default App;
