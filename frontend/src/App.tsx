import { useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { usePatients } from './hooks/use-patients';
import { useMemos } from './hooks/use-memos';
import { useReminders } from './hooks/use-reminders';
import { useTheme } from './hooks/use-theme';

function AppContent() {
  const { loadAll: loadPatients } = usePatients();
  const { loadAll: loadMemos } = useMemos();
  const { runAllReminders } = useReminders();
  useTheme();

  useEffect(() => {
    loadPatients();
    loadMemos().then(() => runAllReminders());
  }, []);

  return <AppShell />;
}

export default function App() {
  return <AppContent />;
}
