import { useState, useEffect } from 'react';
import { usePatients } from '@/hooks/use-patients';
import { useBloodTest } from '@/hooks/use-blood-test';
import type { BloodTestItem } from '@/types';

export function BloodTestTab() {
  const { patients } = usePatients();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [showAdd, setShowAdd] = useState(false);
  const [newItems, setNewItems] = useState<BloodTestItem[]>([
    { name: 'WBC', value: 0, unit: '10^9/L', normalRange: '4.0-10.0', isAbnormal: false },
    { name: 'RBC', value: 0, unit: '10^12/L', normalRange: '4.0-5.5', isAbnormal: false },
    { name: 'HGB', value: 0, unit: 'g/L', normalRange: '120-160', isAbnormal: false },
    { name: 'PLT', value: 0, unit: '10^9/L', normalRange: '100-300', isAbnormal: false },
  ]);

  const { bloodTests, loadByPatient, addBloodTest, deleteBloodTest } = useBloodTest();

  useEffect(() => {
    if (selectedPatientId) {
      loadByPatient(selectedPatientId);
    }
  }, [selectedPatientId, loadByPatient]);

  const handleAdd = async () => {
    if (!selectedPatientId) return;
    const today = new Date().toISOString().split('T')[0];
    await addBloodTest(selectedPatientId, today, newItems);
    setShowAdd(false);
  };

  const updateItem = (index: number, field: string, value: string | number | boolean) => {
    setNewItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontWeight: 600 }}>查血数据</h3>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid #D1D5DB',
            backgroundColor: 'white',
          }}
        >
          <option value="">选择患者</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.bed} {p.name}</option>
          ))}
        </select>
      </div>

      {selectedPatientId && (
        <>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            添加查血记录
          </button>

          {showAdd && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <h4 style={{ marginBottom: '0.5rem' }}>新增查血记录</h4>
              {newItems.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ width: '60px', fontSize: '0.875rem' }}>{item.name}</span>
                  <input
                    type="number"
                    value={item.value}
                    onChange={(e) => updateItem(index, 'value', parseFloat(e.target.value))}
                    style={{ width: '80px', padding: '0.25rem', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{item.unit}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>({item.normalRange})</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={handleAdd} style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}>保存</button>
                <button onClick={() => setShowAdd(false)} style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}>取消</button>
              </div>
            </div>
          )}

          <div>
            {bloodTests.map(bt => (
              <div key={bt.id} style={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '0.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>{bt.date}</span>
                  <button
                    onClick={() => deleteBloodTest(bt.id, selectedPatientId)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    删除
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {bt.items.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.875rem',
                      color: item.isAbnormal ? '#DC2626' : '#374151',
                    }}>
                      <span>{item.name}</span>
                      <span>{item.value} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
