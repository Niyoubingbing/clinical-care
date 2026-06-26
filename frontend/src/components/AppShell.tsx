import { useState, useEffect, useRef } from 'react';
import { Search, Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/use-theme';
import { RoundsTab } from '@/pages/RoundsTab';
import { TodosTab } from '@/pages/TodosTab';
import { BloodTestTab } from '@/pages/BloodTestTab';
import { SettingsTab } from '@/pages/SettingsTab';
import { useKeyboard } from '@/hooks/use-keyboard';
import { CommandPalette } from '@/components/CommandPalette';

type Tab = 'rounds' | 'todos' | 'blood' | 'settings';

const TABS = [
  { key: 'rounds', label: '查房', icon: 'clipboard' },
  { key: 'todos', label: '待办', icon: 'checklist' },
  { key: 'blood', label: '查血', icon: 'droplet' },
  { key: 'settings', label: '设置', icon: 'cog' },
];

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#3B82F6' : '#6B7280';
  const strokeWidth = active ? 2.2 : 1.8;
  
  if (name === 'clipboard') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    );
  }
  
  if (name === 'checklist') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    );
  }

  if (name === 'droplet') {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    );
  }
  
  // cog icon
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function AppShell() {
  const [tab, setTab] = useState<Tab>('rounds');
  const [showCommand, setShowCommand] = useState(false);
  const { theme, cycle } = useTheme();
  
  const commands = [
    { id: 'tab-rounds', label: '切换到查房', shortcut: 'Ctrl+1', action: () => setTab('rounds') },
    { id: 'tab-todos', label: '切换到待办', shortcut: 'Ctrl+2', action: () => setTab('todos') },
    { id: 'tab-blood', label: '切换到查血', shortcut: 'Ctrl+3', action: () => setTab('blood') },
    { id: 'tab-settings', label: '切换到设置', shortcut: 'Ctrl+4', action: () => setTab('settings') },
    { id: 'theme-toggle', label: '切换主题', shortcut: 'Ctrl+Shift+L', action: cycle },
    { id: 'search', label: '搜索患者', action: () => {
      // Focus search input - would need to implement
      alert('搜索功能开发中');
    }},
  ];
  
  const keyMap = useRef({
    'mod+1': () => setTab('rounds'),
    'mod+2': () => setTab('todos'),
    'mod+3': () => setTab('blood'),
    'mod+4': () => setTab('settings'),
    'mod+shift+l': () => cycle(),
    'mod+k': () => setShowCommand(true),
  });
  
  useKeyboard(keyMap.current);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg, #F5F7FA)', color: 'var(--text-1, #111827)' }}>
      {/* Header */}
      <header style={{
        height: '56px',
        backgroundColor: 'var(--surface-1, #FFFFFF)',
        borderBottom: '1px solid var(--border-light, #E5E7EB)',
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: 600 }}>查房助手</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: tab === t.key ? 'var(--primary-light, #EFF6FF)' : 'transparent',
                color: tab === t.key ? 'var(--primary, #3B82F6)' : 'var(--text-secondary, #6B7280)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <TabIcon name={t.icon} active={tab === t.key} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            onClick={cycle}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary, #6B7280)',
              cursor: 'pointer',
            }}
          >
            {theme === 'light' ? <Sun size={18} /> : theme === 'dark' ? <Moon size={18} /> : <MonitorSmartphone size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {tab === 'rounds' && <RoundsTab />}
        {tab === 'todos' && <TodosTab />}
        {tab === 'blood' && <BloodTestTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommand}
        onClose={() => setShowCommand(false)}
        commands={commands}
      />
    </div>
  );
}
