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
  rir: number;
  completed: boolean;
}

interface WorkoutLog {
  id: string;
  date: string;
  exerciseId: string;
  sets: WorkoutSet[];
}

interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

interface CalorieEntry {
  id: string;
  date: string;
  calories: number;
}

// Default exercises
const DEFAULT_EXERCISES: Exercise[] = [
  { id: '1', name: 'Bench Press', category: 'CHEST' },
  { id: '2', name: 'Squat', category: 'LEGS' },
  { id: '3', name: 'Deadlift', category: 'BACK' },
  { id: '4', name: 'Overhead Press', category: 'SHOULDERS' },
  { id: '5', name: 'Barbell Row', category: 'BACK' },
  { id: '6', name: 'Pull-ups', category: 'BACK' },
  { id: '7', name: 'Dumbbell Curl', category: 'BICEPS' },
  { id: '8', name: 'Tricep Pushdown', category: 'TRICEPS' },
  { id: '9', name: 'Leg Press', category: 'LEGS' },
  { id: '10', name: 'Lat Pulldown', category: 'BACK' },
  { id: '11', name: 'Incline Bench Press', category: 'CHEST' },
  { id: '12', name: 'Romanian Deadlift', category: 'LEGS' },
];

const CATEGORY_COLORS: Record<string, string> = {
  CHEST: '#9333ea',
  BACK: '#3b82f6',
  LEGS: '#ef4444',
  SHOULDERS: '#f59e0b',
  BICEPS: '#10b981',
  TRICEPS: '#06b6d4',
};

const getWeekNumber = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
};

const calculateNextTargets = (lastSets: WorkoutSet[]): { weight: number; reps: number } => {
  if (!lastSets || lastSets.length === 0) return { weight: 50, reps: 8 };
  
  const completedSets = lastSets.filter(s => s.completed && s.rir <= 2);
  if (completedSets.length === 0) return { weight: lastSets[0].weight, reps: lastSets[0].reps };
  
  const bestSet = completedSets.reduce((a, b) => (a.reps > b.reps || (a.reps === b.reps && a.weight > b.weight) ? a : b);
  
  let newWeight = bestSet.weight;
  let newReps = bestSet.reps;
  
  if (bestSet.rir <= 1) {
    newWeight = Math.round((bestSet.weight + 2.5) / 2.5) * 2.5;
  } else if (bestSet.rir >= 3) {
    newReps = Math.min(bestSet.reps + 1, 12);
  }
  
  return { weight: newWeight, reps: newReps };
};

export default function Home() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [currentSets, setCurrentSets] = useState<WorkoutSet[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [calorieHistory, setCalorieHistory] = useState<CalorieEntry[]>([]);
  const [view, setView] = useState<'workout' | 'weight' | 'food'>('workout');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  
  // Weight input
  const [newWeight, setNewWeight] = useState('');
  
  // Calorie input
  const [newCalories, setNewCalories] = useState('');

  // Load from localStorage
  useEffect(() => {
    const savedWorkouts = localStorage.getItem('fitTracker_workouts');
    const savedWeight = localStorage.getItem('fitTracker_weight');
    const savedCalories = localStorage.getItem('fitTracker_calories');
    
    if (savedWorkouts) setWorkoutHistory(JSON.parse(savedWorkouts));
    if (savedWeight) setWeightHistory(JSON.parse(savedWeight));
    if (savedCalories) setCalorieHistory(JSON.parse(savedCalories));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('fitTracker_workouts', JSON.stringify(workoutHistory));
    localStorage.setItem('fitTracker_weight', JSON.stringify(weightHistory));
    localStorage.setItem('fitTracker_calories', JSON.stringify(calorieHistory));
  }, [workoutHistory, weightHistory, calorieHistory]);

  const getLastWorkout = (exerciseId: string): WorkoutLog | undefined => {
    return workoutHistory
      .filter(w => w.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  const startWorkout = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    
    const lastWorkout = getLastWorkout(exercise.id);
    const targets = lastWorkout ? calculateNextTargets(lastWorkout.sets) : { weight: 50, reps: 8 };
    
    const initialSets: WorkoutSet[] = [
      { reps: targets.reps, weight: targets.weight, rir: 3, completed: false },
      { reps: targets.reps, weight: targets.weight, rir: 3, completed: false },
      { reps: targets.reps, weight: targets.weight, rir: 3, completed: false },
      { reps: targets.reps, weight: targets.weight, rir: 3, completed: false },
    ];
    
    setCurrentSets(initialSets);
  };

  const updateSet = (index: number, field: keyof WorkoutSet, value: number | boolean) => {
    const newSets = [...currentSets];
    newSets[index] = { ...newSets[index], [field]: value };
    setCurrentSets(newSets);
  };

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
    setSelectedExercise(null);
    setCurrentSets([]);
  };

  const addWeight = () => {
    if (!newWeight || parseFloat(newWeight) <= 0) return;
    const entry: WeightEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      weight: parseFloat(newWeight),
    };
    setWeightHistory([entry, ...weightHistory]);
    setNewWeight('');
  };

  const addCalories = () => {
    if (!newCalories || parseInt(newCalories) <= 0) return;
    const entry: CalorieEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      calories: parseInt(newCalories),
    };
    setCalorieHistory([entry, ...calorieHistory]);
    setNewCalories('');
  };

  const addExercise = () => {
    if (!newExerciseName.trim()) return;
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: newExerciseName,
      category: 'OTHER',
    };
    DEFAULT_EXERCISES.push(newExercise);
    setNewExerciseName('');
    setShowAddExercise(false);
  };

  const exercisesByCategory = DEFAULT_EXERCISES.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
  };

  const todayCalories = calorieHistory
    .filter(e => new Date(e.date).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + e.calories, 0);

  const lastWeight = weightHistory[0]?.weight || 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      paddingBottom: '80px',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            FIT TRACKER
          </h1>
          <p style={{ color: '#666666', margin: '4px 0 0 0', fontSize: '14px' }}>
            {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => setView('weight')}
            style={{
              background: view === 'weight' ? '#1a1a1a' : '#0a0a0a',
              border: view === 'weight' ? '1px solid #333' : '1px solid #1a1a1a',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              HMOTNOST
            </div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {lastWeight > 0 ? `${lastWeight} kg` : '--'}
            </div>
          </button>
          
          <button
            onClick={() => setView('food')}
            style={{
              background: view === 'food' ? '#1a1a1a' : '#0a0a0a',
              border: view === 'food' ? '1px solid #333' : '1px solid #1a1a1a',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              DNES
            </div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: todayCalories > 0 ? '#22c55e' : '#ffffff', marginTop: '4px' }}>
              {todayCalories > 0 ? `${todayCalories} kcal` : '--'}
            </div>
          </button>
        </div>

        {/* Bottom Navigation */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#0a0a0a',
          borderTop: '1px solid #1a1a1a',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-around',
          zIndex: 100,
        }}>
          {[
            { key: 'workout', label: 'TRÉNINK', icon: '🏋️' },
            { key: 'weight', label: 'HMOTNOST', icon: '⚖️' },
            { key: 'food', label: 'KALORIE', icon: '🍎' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as any)}
              style={{
                background: 'none',
                border: 'none',
                color: view === tab.key ? '#22c55e' : '#666666',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* WORKOUT VIEW */}
        {view === 'workout' && (
          <>
            {Object.entries(exercisesByCategory).map(([category, exercises]) => (
              <div key={category} style={{ marginBottom: '16px' }}>
                <h3 style={{ 
                  color: CATEGORY_COLORS[category] || '#666666', 
                  fontSize: '11px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  marginBottom: '8px',
                  fontWeight: 600,
                }}>
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
                          background: '#0a0a0a',
                          border: '1px solid #1a1a1a',
                          borderRadius: '8px',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: '14px', color: '#ffffff' }}>{exercise.name}</span>
                        <span style={{ color: '#666666', fontSize: '12px' }}>{lastWeight} kg</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {showAddExercise ? (
              <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '16px' }}>
                <input
                  type="text"
                  placeholder="Název cviku..."
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    background: '#000',
                    border: '1px solid #333',
                    borderRadius: '6px',
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
                      background: '#22c55e',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      color: '#000',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Přidat
                  </button>
                  <button
                    onClick={() => setShowAddExercise(false)}
                    style={{
                      flex: 1,
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '6px',
                      padding: '10px',
                      color: '#666',
                      cursor: 'pointer',
                    }}
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddExercise(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'none',
                  border: '1px dashed #333',
                  borderRadius: '8px',
                  color: '#666666',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                + Přidat vlastní cvik
              </button>
            )}
          </>
        )}

        {/* WEIGHT VIEW */}
        {view === 'weight' && (
          <div>
            <div style={{ 
              background: '#0a0a0a', 
              borderRadius: '12px', 
              padding: '20px',
              marginBottom: '20px',
            }}>
              <div style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>
                AKTUÁLNÍ HMOTNOST
              </div>
              <div style={{ fontSize: '48px', fontWeight: 700, color: '#ffffff' }}>
                {lastWeight > 0 ? `${lastWeight}` : '--'} 
                <span style={{ fontSize: '20px', color: '#666666', marginLeft: '4px' }}>kg</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="number"
                placeholder="Hmotnost (kg)"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                style={{
                  flex: 1,
                  background: '#0a0a0a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '14px',
                  color: '#fff',
                  fontSize: '16px',
                }}
              />
              <button
                onClick={addWeight}
                style={{
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>

            {/* Weight History */}
            <div>
              <h3 style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>
                HISTORIE
              </h3>
              {weightHistory.length === 0 ? (
                <div style={{ color: '#444444', textAlign: 'center', padding: '20px' }}>
                  Zatím žádný záznam
                </div>
              ) : (
                weightHistory.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      background: '#0a0a0a',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: '#666666', fontSize: '13px' }}>{formatDate(entry.date)}</span>
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{entry.weight} kg</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* FOOD/CALORIES VIEW */}
        {view === 'food' && (
          <div>
            <div style={{ 
              background: '#0a0a0a', 
              borderRadius: '12px', 
              padding: '20px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <div style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>
                DNESNI PŘÍJEM
              </div>
              <div style={{ fontSize: '48px', fontWeight: 700, color: todayCalories > 0 ? '#22c55e' : '#ffffff' }}>
                {todayCalories}
                <span style={{ fontSize: '20px', color: '#666666', marginLeft: '4px' }}>kcal</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="number"
                placeholder="Kalorie"
                value={newCalories}
                onChange={(e) => setNewCalories(e.target.value)}
                style={{
                  flex: 1,
                  background: '#0a0a0a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '14px',
                  color: '#fff',
                  fontSize: '16px',
                }}
              />
              <button
                onClick={addCalories}
                style={{
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px 20px',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>

            {/* Calorie History */}
            <div>
              <h3 style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>
                HISTORIE
              </h3>
              {calorieHistory.length === 0 ? (
                <div style={{ color: '#444444', textAlign: 'center', padding: '20px' }}>
                  Zatím žádný záznam
                </div>
              ) : (
                calorieHistory.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      background: '#0a0a0a',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ color: '#666666', fontSize: '13px' }}>{formatDate(entry.date)}</span>
                    <span style={{ fontWeight: 600, color: '#22c55e' }}>{entry.calories} kcal</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Workout Modal */}
        {selectedExercise && currentSets.length > 0 && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000000',
            zIndex: 200,
            overflow: 'auto',
            padding: '16px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button
                  onClick={() => setSelectedExercise(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#22c55e',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  ← ZPĚT
                </button>
                <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, margin: 0 }}>
                  {selectedExercise.name}
                </h2>
                <div style={{ width: '50px' }} />
              </div>

              {currentSets.map((set, index) => (
                <div
                  key={index}
                  style={{
                    background: set.completed ? 'rgba(34, 197, 94, 0.1)' : '#0a0a0a',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px',
                    border: set.completed ? '1px solid #22c55e' : '1px solid #1a1a1a',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#666666', fontSize: '12px', fontWeight: 600 }}>SET {index + 1}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={set.completed}
                        onChange={(e) => updateSet(index, 'completed', e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: '#22c55e' }}
                      />
                      <span style={{ color: set.completed ? '#22c55e' : '#666666', fontSize: '12px' }}>LOG</span>
                    </label>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#444444', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>
                        KG
                      </label>
                      <input
                        type="number"
                        value={set.weight}
                        onChange={(e) => updateSet(index, 'weight', Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: '#000',
                          border: '1px solid #333',
                          borderRadius: '6px',
                          padding: '12px',
                          color: '#fff',
                          fontSize: '18px',
                          textAlign: 'center',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#444444', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>
                        REPS
                      </label>
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) => updateSet(index, 'reps', Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: '#000',
                          border: '1px solid #333',
                          borderRadius: '6px',
                          padding: '12px',
                          color: '#fff',
                          fontSize: '18px',
                          textAlign: 'center',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#444444', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>
                        RIR
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={set.rir}
                        onChange={(e) => updateSet(index, 'rir', Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: '#000',
                          border: '1px solid #333',
                          borderRadius: '6px',
                          padding: '12px',
                          color: set.rir <= 2 ? '#22c55e' : set.rir <= 3 ? '#eab308' : '#ef4444',
                          fontSize: '18px',
                          textAlign: 'center',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={completeWorkout}
                style={{
                  width: '100%',
                  background: '#22c55e',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#000',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                SAVE WORKOUT
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', color: '#333333', fontSize: '11px' }}>
          💾 Lokální uložiště
        </div>
      </div>
    </div>
  );
}
