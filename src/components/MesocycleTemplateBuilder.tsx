'use client';

import { useState } from 'react';

interface Exercise { id: string; name: string; category: string; }

interface DayConfig {
  dayIndex: number;
  dayName: string;
  workout: string;
  exerciseIds: string[];
  isRestDay: boolean;
}

interface WeekConfig {
  weekNumber: number;
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'DELOAD';
  description: string;
  days: DayConfig[];
}

interface MesocycleTemplate {
  name: string;
  description: string;
  weeks: WeekConfig[];
}

interface Props {
  exercises: Exercise[];
  onSave: (template: MesocycleTemplate) => void;
  onCancel: () => void;
  initialTemplate?: MesocycleTemplate & { id: string; createdAt: string };
}

const DAY_NAMES = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
const PHASE_OPTIONS: Array<'BASE' | 'BUILD' | 'PEAK' | 'DELOAD'> = ['BASE', 'BUILD', 'PEAK', 'DELOAD'];

export default function MesocycleTemplateBuilder({ exercises, onSave, onCancel, initialTemplate }: Props) {
  const [templateName, setTemplateName] = useState(initialTemplate?.name || '');
  const [templateDescription, setTemplateDescription] = useState(initialTemplate?.description || '');
  const [numWeeks, setNumWeeks] = useState(initialTemplate?.weeks.length || 8);
  const [weeks, setWeeks] = useState<WeekConfig[]>(() => {
    if (initialTemplate) return initialTemplate.weeks;
    
    // Initialize with default structure
    return Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      phase: i < 2 ? 'BASE' : i < 5 ? 'BUILD' : i < 7 ? 'PEAK' : 'DELOAD',
      description: '',
      days: DAY_NAMES.map((name, idx) => ({
        dayIndex: idx,
        dayName: name,
        workout: '',
        exerciseIds: [],
        isRestDay: false
      }))
    }));
  });

  const [currentStep, setCurrentStep] = useState<'info' | 'weeks' | 'days'>('info');
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const updateWeek = (weekIndex: number, updates: Partial<WeekConfig>) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex] = { ...newWeeks[weekIndex], ...updates };
    setWeeks(newWeeks);
  };

  const updateDay = (weekIndex: number, dayIndex: number, updates: Partial<DayConfig>) => {
    const newWeeks = [...weeks];
    newWeeks[weekIndex].days[dayIndex] = { 
      ...newWeeks[weekIndex].days[dayIndex], 
      ...updates 
    };
    setWeeks(newWeeks);
  };

  const toggleExerciseForDay = (weekIndex: number, dayIndex: number, exerciseId: string) => {
    const day = weeks[weekIndex].days[dayIndex];
    const newExerciseIds = day.exerciseIds.includes(exerciseId)
      ? day.exerciseIds.filter(id => id !== exerciseId)
      : [...day.exerciseIds, exerciseId];
    updateDay(weekIndex, dayIndex, { exerciseIds: newExerciseIds });
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      alert('Zadej název šablony');
      return;
    }
    onSave({
      name: templateName,
      description: templateDescription,
      weeks: weeks.slice(0, numWeeks)
    });
  };

  const handleNumWeeksChange = (num: number) => {
    setNumWeeks(num);
    if (num > weeks.length) {
      // Add new weeks
      const newWeeks = [...weeks];
      for (let i = weeks.length; i < num; i++) {
        newWeeks.push({
          weekNumber: i + 1,
          phase: 'BUILD',
          description: '',
          days: DAY_NAMES.map((name, idx) => ({
            dayIndex: idx,
            dayName: name,
            workout: '',
            exerciseIds: [],
            isRestDay: false
          }))
        });
      }
      setWeeks(newWeeks);
    }
  };

  // Group exercises by category
  const exercisesByCategory = exercises.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'var(--ios-bg)', 
      zIndex: 1000,
      overflow: 'auto',
      paddingBottom: 'env(safe-area-inset-bottom, 20px)'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(18, 18, 18, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--ios-border)',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <button onClick={onCancel} style={{
          background: 'none',
          border: 'none',
          color: 'var(--ios-blue)',
          fontSize: '16px',
          cursor: 'pointer'
        }}>
          Zrušit
        </button>
        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '600' }}>
          {initialTemplate ? 'Upravit šablonu' : 'Nová šablona'}
        </h2>
        <button onClick={handleSave} style={{
          background: 'none',
          border: 'none',
          color: 'var(--ios-blue)',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          Uložit
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Step Indicator */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px',
          justifyContent: 'center'
        }}>
          {['info', 'weeks', 'days'].map((step) => (
            <div key={step} style={{
              width: currentStep === step ? '32px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: currentStep === step ? 'var(--ios-blue)' : 'var(--ios-bg-tertiary)',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        {/* Step: Info */}
        {currentStep === 'info' && (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px' }}>
              Základní info
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--ios-label-secondary)' }}>
                Název šablony
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="např. PPL 8 týdnů"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--ios-bg-tertiary)',
                  border: '1px solid var(--ios-border)',
                  borderRadius: '10px',
                  color: 'var(--ios-label)',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--ios-label-secondary)' }}>
                Popis (volitelné)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Krátký popis programu..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--ios-bg-tertiary)',
                  border: '1px solid var(--ios-border)',
                  borderRadius: '10px',
                  color: 'var(--ios-label)',
                  fontSize: '16px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--ios-label-secondary)' }}>
                Počet týdnů
              </label>
              <select
                value={numWeeks}
                onChange={(e) => handleNumWeeksChange(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--ios-bg-tertiary)',
                  border: '1px solid var(--ios-border)',
                  borderRadius: '10px',
                  color: 'var(--ios-label)',
                  fontSize: '16px'
                }}
              >
                {[5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n} týdnů</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setCurrentStep('weeks')}
              style={{
                width: '100%',
                padding: '16px',
                background: 'var(--ios-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '17px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Pokračovat →
            </button>
          </div>
        )}

        {/* Step: Weeks Configuration */}
        {currentStep === 'weeks' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px' }}>
              Konfigurace týdnů
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--ios-label-secondary)', marginBottom: '24px' }}>
              Nastav fázi a popis pro každý týden
            </p>

            {weeks.slice(0, numWeeks).map((week, i) => (
              <div key={i} style={{
                background: 'var(--ios-bg-secondary)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px' }}>
                  Týden {week.weekNumber}
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--ios-label-secondary)' }}>
                    Fáze
                  </label>
                  <select
                    value={week.phase}
                    onChange={(e) => updateWeek(i, { phase: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'var(--ios-bg-tertiary)',
                      border: '1px solid var(--ios-border)',
                      borderRadius: '8px',
                      color: 'var(--ios-label)',
                      fontSize: '15px'
                    }}
                  >
                    {PHASE_OPTIONS.map(phase => (
                      <option key={phase} value={phase}>{phase}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--ios-label-secondary)' }}>
                    Popis (např. 4x10 @ 70% 1RM)
                  </label>
                  <input
                    type="text"
                    value={week.description}
                    onChange={(e) => updateWeek(i, { description: e.target.value })}
                    placeholder="4x10 @ 70% 1RM"
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'var(--ios-bg-tertiary)',
                      border: '1px solid var(--ios-border)',
                      borderRadius: '8px',
                      color: 'var(--ios-label)',
                      fontSize: '15px'
                    }}
                  />
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setCurrentStep('info')}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-label)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ← Zpět
              </button>
              <button
                onClick={() => { setCurrentStep('days'); setEditingWeek(0); }}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'var(--ios-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Nastavit dny →
              </button>
            </div>
          </div>
        )}

        {/* Step: Days Configuration */}
        {currentStep === 'days' && editingWeek !== null && (
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
                Týden {weeks[editingWeek].weekNumber} - Denní plán
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {weeks.slice(0, numWeeks).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setEditingWeek(i)}
                    style={{
                      padding: '8px 16px',
                      background: i === editingWeek ? 'var(--ios-blue)' : 'var(--ios-bg-secondary)',
                      color: i === editingWeek ? 'white' : 'var(--ios-label)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    T{i + 1}
                  </button>
                ))}
              </div>
            </div>

            {weeks[editingWeek].days.map((day, dayIdx) => (
              <div key={dayIdx} style={{
                background: 'var(--ios-bg-secondary)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', fontSize: '16px' }}>
                    {day.dayName}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={day.isRestDay}
                      onChange={(e) => updateDay(editingWeek, dayIdx, { isRestDay: e.target.checked })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    Odpočinek
                  </label>
                </div>

                {!day.isRestDay && (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="text"
                        value={day.workout}
                        onChange={(e) => updateDay(editingWeek, dayIdx, { workout: e.target.value })}
                        placeholder="Název tréninku (např. Horní polovina)"
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: 'var(--ios-bg-tertiary)',
                          border: '1px solid var(--ios-border)',
                          borderRadius: '8px',
                          color: 'var(--ios-label)',
                          fontSize: '15px'
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--ios-label-secondary)', marginBottom: '8px' }}>
                        Cvičení ({day.exerciseIds.length} vybráno)
                      </div>
                      {editingDay === dayIdx ? (
                        <div>
                          <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '8px' }}>
                            {Object.entries(exercisesByCategory).map(([category, exs]) => (
                              <div key={category} style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--ios-label-secondary)', marginBottom: '6px' }}>
                                  {category}
                                </div>
                                {exs.map(ex => (
                                  <label key={ex.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px',
                                    gap: '8px',
                                    cursor: 'pointer'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={day.exerciseIds.includes(ex.id)}
                                      onChange={() => toggleExerciseForDay(editingWeek, dayIdx, ex.id)}
                                      style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: '14px' }}>{ex.name}</span>
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => setEditingDay(null)}
                            style={{
                              padding: '8px 16px',
                              background: 'var(--ios-blue)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              cursor: 'pointer'
                            }}
                          >
                            Hotovo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingDay(dayIdx)}
                          style={{
                            padding: '10px 16px',
                            background: 'var(--ios-bg-tertiary)',
                            color: 'var(--ios-label)',
                            border: '1px solid var(--ios-border)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          {day.exerciseIds.length > 0 ? 'Upravit cvičení' : 'Vybrat cvičení'}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => { setCurrentStep('weeks'); setEditingWeek(null); setEditingDay(null); }}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'var(--ios-bg-secondary)',
                  color: 'var(--ios-label)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ← Zpět
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'var(--ios-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✓ Uložit šablonu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
