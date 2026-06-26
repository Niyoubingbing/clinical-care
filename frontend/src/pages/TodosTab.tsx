import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePatients } from '@/hooks/use-patients';
import { useMemos } from '@/hooks/use-memos';

export function TodosTab() {
  const { patients } = usePatients();
  const { memos, addMemo, deleteMemo } = useMemos();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>待办事项</h3>
      
      {/* Patient Selector */}
      <div style={{ marginBottom: '1rem' }}>
        <select
          value={selectedPatient || ''}
          onChange={e => setSelectedPatient(e.target.value || null)}
          style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
        >
          <option value="">全部患者</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.bed}床 - {p.name}</option>
          ))}
        </select>
      </div>

      {/* Memo List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {memos
          .filter(m => !selectedPatient || m.patientId === selectedPatient)
          .map(memo => {
            const patient = patients.find(p => p.id === memo.patientId);
            return (
              <div
                key={memo.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>{patient?.bed}床 {patient?.name}</span>
                  <button
                    onClick={() => deleteMemo(memo.id)}
                    style={{ padding: '0.25rem 0.5rem', border: 'none', backgroundColor: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    删除
                  </button>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>{memo.content}</div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>{memo.date}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
