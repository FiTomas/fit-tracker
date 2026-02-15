'use client';

import { useState, useEffect } from 'react';

// Types
interface Exercise {
  id: string;
  name: string;
  category: string;
}

interface WorkoutSet {
  reps: number;
  weight: number;
  rir: number; // Reps in Reserve
  completed: boolean;
}

interface WorkoutLog {
  id: string;
  date: string;
  exerciseId: string;
  sets: WorkoutSet[];
}

// Default exercises (for MVP - no database yet)
const DEFAULT_EXERCISES: Exercise[] = [
  { id: '1', name: 'Bench Press', category: 'Hruď' },
  { id: '2', name: 'Squat', category: 'Nohy' },
  { id: '3', name: 'Deadlift', category: 'Záda' },
  { id: '4', name: 'Overhead Press', category: 'Ramena' },
  { id: '5', name: 'Barbell Row', category: 'Záda' },
  { id: '6', name: 'Pull-ups', category: 'Záda' },
  { id: '7', name: 'Dumbbell Curl', category: 'Biceps' },
  { id: '8', name: 'Tricep Pushdown', category: 'Triceps' },
  { id: '9', name: 'Leg Press', category: 'Nohy' },
  { id: '10', name: 'Lat Pulldown', category: 'Záda' },
  { name: 'Incline Bench Press', category: 'Hruď', id: '11' },
  { name: 'Romanian Deadlift', category: 'Nohy', id: '12' },
];

// Get week number
const getWeekNumber = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
};

// Calculate next workout targets (progressive overload)
const calculateNextTargets = (lastSets: WorkoutSet[]): { weight: number; reps: number } => {
  if (!lastSets || lastSets.length === 0) return { weight: 50, reps: 8 };
  
  // Find the best set (most reps with good form - RIR 1-2)
  const completedSets = lastSets.filter(s => s.completed && s.rir <= 2);
  if (completedSets.length === 0) return { weight: lastSets[0].weight, reps: lastSets[0].reps };
  
  const bestSet = completedSets.reduce((a, b) => (a.reps > b.reps || (a.reps === b.reps && a.weight > b.weight) ? a : b));
  
  // Progressive overload: if RIR <= 1, increase weight
  let newWeight = bestSet.weight;
  let newReps = bestSet.reps;
  
  if (bestSet.rir <= 1) {
    // Increase weight by 2.5kg and keep reps
    newWeight = Math.round((bestSet.weight + 2.5) / 2.5) * 2.5;
  } else if (bestSet.rir >= 3) {
    // If too easy (RIR 3+), try to add a rep
    newReps = Math.min(bestSet.reps + 1, 12);
  }
  
  return { weight: newWeight, reps: newReps };
};

export default function Home() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [currentSets, setCurrentSets] = useState<WorkoutSet[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([]);
  const [view, setView] = useState<'exercises' | 'workout' | 'history'>('exercises');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fitTracker_history');
    if (saved) {
      setWorkoutHistory(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('fitTracker_history', JSON.stringify(workoutHistory));
  }, [workoutHistory]);

  // Get last workout for selected exercise
  const getLastWorkout = (exerciseId: string): WorkoutLog | undefined => {
    return workoutHistory
      .filter(w => w.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  // Start workout for exercise
  const startWorkout = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    
    const lastWorkout = getLastWorkout(exercise.id);
    const targets = lastWorkout ? calculateNextTargets(lastWorkout.sets) : { weight: 50, reps: 8 };
    
    // Create 3-4 working sets
    const initialSets: WorkoutSet[] = [
      { reps: targets.reps, weight: targets.weight, rir: 3, completed: false },
      { reps: targets.reps, weight: targets.weight, rir: 3, completed: false },
      { reps: targets.reps, weight: targets.weight, rir: 3, completed: false },
      { reps: targets.reps, weight: targets.weight, rir: 3, completed: false },
    ];
    
    setCurrentSets(initialSets);
    setView('workout');
  };

  // Update a set
  const updateSet = (index: number, field: keyof WorkoutSet, value: number | boolean) => {
    const newSets = [...currentSets];
    newSets[index] = { ...newSets[index], [field]: value };
    setCurrentSets(newSets);
  };

  // Complete workout
  const completeWorkout = () => {
    if (!selectedExercise) return;
    
    const completedSets = currentSets.filter(s => s.completed);
    if (completedSets.length === 0) return;
    
    const newLog: WorkoutLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      exerciseId: selectedExercise.id,
      sets: completedSets,
    };
    
    setWorkoutHistory([newLog, ...workoutHistory]);
    setView('exercises');
    setSelectedExercise(null);
    setCurrentSets([]);
  };

  // Add custom exercise
  const addExercise = () => {
    if (!newExerciseName.trim()) return;
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: newExerciseName,
      category: 'Ostatní',
    };
    DEFAULT_EXERCISES.push(newExercise);
    setNewExerciseName('');
    setShowAddExercise(false);
  };

  // Group exercises by category
  const exercisesByCategory = DEFAULT_EXERCISES.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #1a3d2e 0%, #0f2a1f 100%)',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      fontSize: '13px',
      color: '#ffffff',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#a8e6cf' }}>
            💪 Fit Tracker
          </h1>
          <p style={{ color: '#7cb69d', margin: '8px 0 0 0' }}>
            Progresivní overload • {getWeekNumber(new Date())}. týden
          </p>
        </div>

        {/* Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '20px',
          justifyContent: 'center',
        }}>
          {[
            { key: 'exercises', label: '🏋️ Cviky', icon: '🏋️' },
            { key: 'workout', label: '⚡ Trénink', icon: '⚡' },
            { key: 'history', label: '📊 Historie', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as any)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: view === tab.key ? 'rgba(168, 230, 207, 0.2)' : 'rgba(255,255,255,0.05)',
                color: view === tab.key ? '#a8e6cf' : '#7cb69d',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Exercises View */}
        {view === 'exercises' && (
          <div>
            {Object.entries(exercisesByCategory).map(([category, exercises]) => (
              <div key={category} style={{ marginBottom: '16px' }}>
                <h3 style={{ color: '#7cb69d', fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {category}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {exercises.map((exercise) => {
                    const lastWorkout = getLastWorkout(exercise.id);
                    const lastDate = lastWorkout ? formatDate(lastWorkout.date) : 'Nikdy';
                    const lastWeight = lastWorkout?.sets[0]?.weight || '-';
                    
                    return (
                      <button
                        key={exercise.id}
                        onClick={() => startWorkout(exercise)}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500, fontSize: '15px' }}>{exercise.name}</span>
                          <span style={{ color: '#a8e6cf', fontSize: '12px' }}>▶</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '4px', color: '#7cb69d', fontSize: '12px' }}>
                          <span>📅 {lastDate}</span>
                          <span>🏋️ {lastWeight} kg</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Add Exercise Button */}
            {showAddExercise ? (
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '16px',
                marginTop: '16px',
              }}>
                <input
                  type="text"
                  placeholder="Název cviku..."
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(168, 230, 207, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '14px',
                    marginBottom: '12px',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={addExercise}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(90deg, #4caf50, #2e7d32)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Přidat
                  </button>
                  <button
                    onClick={() => setShowAddExercise(false)}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#7cb69d',
                      cursor: 'pointer',
                    }}
                  >
                    ❌ Zrušit
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddExercise(true)}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px dashed rgba(168, 230, 207, 0.3)',
                  borderRadius: '12px',
                  color: '#7cb69d',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                + Přidat vlastní cvik
              </button>
            )}
          </div>
        )}

        {/* Workout View */}
        {view === 'workout' && selectedExercise && (
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: '#a8e6cf', fontSize: '18px', margin: 0 }}>
                  {selectedExercise.name}
                </h2>
                <button
                  onClick={() => setView('exercises')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7cb69d',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  ← Zpět
                </button>
              </div>

              {/* Sets */}
              {currentSets.map((set, index) => (
                <div
                  key={index}
                  style={{
                    background: set.completed ? 'rgba(76, 175, 80, 0.2)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                    border: set.completed ? '1px solid #4caf50' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#7cb69d', fontSize: '12px' }}>SET {index + 1}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={set.completed}
                        onChange={(e) => updateSet(index, 'completed', e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: '#4caf50' }}
                      />
                      <span style={{ color: set.completed ? '#4caf50' : '#7cb69d', fontSize: '12px' }}>
                        Hotovo
                      </span>
                    </label>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#7cb69d', fontSize: '11px', marginBottom: '4px' }}>
                        Váha (kg)
                      </label>
                      <input
                        type="number"
                        value={set.weight}
                        onChange={(e) => updateSet(index, 'weight', Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: '#fff',
                          fontSize: '16px',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#7cb69d', fontSize: '11px', marginBottom: '4px' }}>
                        Reps
                      </label>
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) => updateSet(index, 'reps', Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: '#fff',
                          fontSize: '16px',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#7cb69d', fontSize: '11px', marginBottom: '4px' }}>
                        RIR (0-5)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={set.rir}
                        onChange={(e) => updateSet(index, 'rir', Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: set.rir <= 2 ? '#4caf50' : set.rir <= 3 ? '#ffeb3b' : '#ff5722',
                          fontSize: '16px',
                          textAlign: 'center',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Complete Button */}
              <button
                onClick={completeWorkout}
                style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #4caf50, #2e7d32)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '8px',
                  boxShadow: '0 4px 14px rgba(76, 175, 80, 0.4)',
                }}
              >
                ✅ Uložit trénink
              </button>
            </div>

            {/* RIR Guide */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '11px',
              color: '#7cb69d',
            }}>
              <strong>📊 RIR (Reps In Reserve):</strong><br/>
              0 = Maximum, 1-2 = Těžké (ideální), 3 = Střední, 4-5 = Lehké
            </div>
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div>
            {workoutHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#7cb69d',
              }}>
                📊 Zatím žádný trénink<br/>
                <span style={{ fontSize: '12px' }}>Začni prvním cvičením!</span>
              </div>
            ) : (
              Object.entries(
                workoutHistory.reduce((acc, log) => {
                  const date = formatDate(log.date);
                  if (!acc[date]) acc[date] = [];
                  acc[date].push(log);
                  return acc;
                }, {} as Record<string, WorkoutLog[]>)
              ).map(([date, logs]) => (
                <div key={date} style={{ marginBottom: '16px' }}>
                  <h3 style={{ color: '#7cb69d', fontSize: '12px', marginBottom: '8px' }}>{date}</h3>
                  {logs.map((log) => {
                    const exercise = DEFAULT_EXERCISES.find(e => e.id === log.exerciseId);
                    const totalVolume = log.sets.reduce((sum, s) => sum + (s.completed ? s.weight * s.reps : 0), 0);
                    const bestSet = log.sets.filter(s => s.completed).reduce((a, b) => 
                      a.weight > b.weight ? a : b, { weight: 0, reps: 0 });
                    
                    return (
                      <div
                        key={log.id}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '8px',
                        }}
                      >
                        <div style={{ fontWeight: 500, marginBottom: '8px' }}>{exercise?.name}</div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#7cb69d' }}>
                          <span>🏋️ {bestSet.weight} kg × {bestSet.reps}</span>
                          <span>📊 {totalVolume} kg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', color: '#5d8a70', fontSize: '11px' }}>
          💾 Data se ukládají lokálně v prohlížeči
        </div>
      </div>
    </div>
  );
}
