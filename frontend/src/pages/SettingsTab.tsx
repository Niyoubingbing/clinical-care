import { useState } from 'react';
import { Download, Upload, Copy } from 'lucide-react';
import { db } from '@/lib/db';
import { usePatients } from '@/hooks/use-patients';
import { useMemos } from '@/hooks/use-memos';
import { useReminders } from '@/hooks/use-reminders';

export function SettingsTab() {
  const { patients, loadPatients } = usePatients();
  const { memos, loadAll: loadMemos } = useMemos();
  const { reminders, loadAll: loadReminders } = useReminders();
  const [status, setStatus] = useState('');

  const exportData = async () => {
    const data = {
      patients: await db.patients.toArray(),
      memos: await db.memos.toArray(),
      reminders: await db.reminders.toArray(),
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clinical-care-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('导出成功');
  };

  const exportShortText = () => {
    const today = new Date().toISOString().split('T')[0];
    const lines = patients.map(p => {
      const patientMemos = memos.filter(m => m.patientId === p.id && m.date === today);
      const memoText = patientMemos.map(m => m.content).join('; ');
      return `${p.bed} ${p.name} ${p.diagnosis}${memoText ? ` | ${memoText}` : ''}`;
    });
    
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setStatus('已复制到剪贴板');
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const data = JSON.parse(text);
      
      await db.transaction('rw', db.patients, db.memos, db.reminders, async () => {
        await db.patients.clear();
        await db.memos.clear();
        await db.reminders.clear();
        
        await db.patients.bulkAdd(data.patients);
        await db.memos.bulkAdd(data.memos);
        await db.reminders.bulkAdd(data.reminders);
      });
      
      await loadPatients();
      await loadMemos();
      await loadReminders();
      setStatus('导入成功');
    };
    input.click();
  };

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>设置</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Export */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '1rem',
        }}>
          <h4 style={{ marginBottom: '0.5rem', fontWeight: 500 }}>数据管理</h4>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>导出或导入完整数据</p>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={exportData}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Download size={16} />
              <span>导出完整数据</span>
            </button>
            
            <button
              onClick={exportShortText}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#3B82F6',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Copy size={16} />
              <span>导出短文本</span>
            </button>
            
            <button
              onClick={importData}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Upload size={16} />
              <span>导入数据</span>
            </button>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ECFDF5',
            color: '#10B981',
            borderRadius: '8px',
            fontSize: '0.875rem',
          }}>
            {status}
          </div>
        )}

        {/* Stats */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '1rem',
        }}>
          <h4 style={{ marginBottom: '0.5rem', fontWeight: 500 }}>统计信息</h4>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{patients.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>患者</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{memos.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>记录</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{reminders.filter(r => !r.isDone).length}</div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>待办</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
