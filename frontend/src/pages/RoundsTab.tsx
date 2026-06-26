import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { usePatients } from '@/hooks/use-patients';
import { PatientCard } from '@/components/PatientCard';

export function RoundsTab() {
  const { patients, loading, addPatient, deletePatient } = usePatients();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = patients.filter(p =>
    p.name.includes(search) || p.bed.includes(search)
  );

  return (
    <div>
      {/* Search & Add */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input
            type="text"
            placeholder="搜索患者..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.75rem 0.625rem 2.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '0.625rem 1rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Plus size={16} />
          <span>添加</span>
        </button>
      </div>

      {/* Patient List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(patient => (
          <PatientCard
            key={patient.id}
            patient={patient}
            onDelete={() => deletePatient(patient.id)}
          />
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <AddPatientModal
          onAdd={async (data) => {
            await addPatient(data);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function AddPatientModal({ onAdd, onCancel }: { onAdd: (data: any) => void; onCancel: () => void }) {
  const [bed, setBed] = useState('');
  const [name, setName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  const handleSubmit = () => {
    if (!bed || !name) return;
    onAdd({ bed, name, diagnosis });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '1.5rem',
        width: '100%',
        maxWidth: '32rem',
      }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>添加患者</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>床号</label>
            <input
              type="text"
              value={bed}
              onChange={e => setBed(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>姓名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>诊断</label>
            <input
              type="text"
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px' }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' }}>
            取消
          </button>
          <button onClick={handleSubmit} style={{ padding: '0.5rem 1rem', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
