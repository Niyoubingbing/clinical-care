import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import RoundView from "@/pages/RoundView";
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
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
      <RoundView />
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster position="top-center" richColors closeButton />
      <AppContent />
    </TooltipProvider>
  );
}

export default App;
