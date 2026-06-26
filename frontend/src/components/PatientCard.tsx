import type { Patient } from '@/types';

interface PatientCardProps {
  patient: Patient;
  onDelete: () => void;
}

export function PatientCard({ patient, onDelete }: PatientCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      padding: '1rem',
      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ 
            backgroundColor: '#EFF6FF', 
            color: '#3B82F6', 
            padding: '0.125rem 0.5rem', 
            borderRadius: '6px', 
            fontSize: '0.75rem', 
            fontWeight: 600 
          }}>
            {patient.bed}床
          </span>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{patient.name}</span>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{patient.diagnosis}</div>
      </div>
      
      <button
        onClick={onDelete}
        style={{
          padding: '0.5rem',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#6B7280',
          cursor: 'pointer',
          borderRadius: '8px',
        }}
      >
        删除
      </button>
    </div>
  );
}
