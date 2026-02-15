'use client';

import { useState, useEffect } from 'react';

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

interface MealEntry {
  id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Mesocycle {
  week: number;
  type: 'BASE' | 'BUILD' | 'PEAK' | 'DELOAD';
  description: string;
}

const MESOCYCLE: Mesocycle[] = [
  { week: 1, type: 'BASE', description: '4x10 @ 70% 1RM' },
  { week: 2, type: 'BASE', description: '4x10 @ 72.5% 1RM' },
  { week: 3, type: 'BUILD', description: '4x8 @ 75% 1RM' },
  { week: 4, type: 'BUILD', description: '4x8 @ 77.5% 1RM' },
  { week: 5, type: 'BUILD', description: '4x6 @ 80% 1RM' },
  { week: 6, type: 'PEAK', description: '4x5 @ 85% 1RM' },
  { week: 7, type: 'PEAK', description: '3x3 @ 90% 1RM' },
  { week: 8, type: 'DELOAD', description: '3x10 @ 50% 1RM' },
];

const CATEGORY_COLORS: Record<string, string> = {
  CHEST: '#9333ea',
  BACK: '#3b82f6',
  LEGS: '#ef4444',
  SHOULDERS: '#f59e0b',
  BICEPS: '#10b981',
  TRICEPS: '#06b6d4',
  OTHER: '#666666',
};

let exercisesList: Exercise[] = [
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
];

const getWeekNumber = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
};

const getMesocycleWeek = (): Mesocycle => {
  const weekNum = getWeekNumber(new Date()) % 8;
  return MESOCYCLE[weekNum === 0 ? 7 : weekNum - 1];
};

const calculateNextTargets = (lastSets: WorkoutSet[]): { weight: number; reps: number } => {
  if (!lastSets || lastSets.length === 0) return { weight: 50, reps: 8 };
  const completedSets = lastSets.filter(s => s.completed && s.rir <= 2);
  if (completedSets.length === 0) return { weight: lastSets[0].weight, reps: lastSets[0].reps };
  const bestSet = completedSets.reduce((a, b) => (a.reps > b.reps || (a.reps === b.reps && a.weight > b.weight) ? a : b), completedSets[0]);
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
  const [mealHistory, setMealHistory] = useState<MealEntry[]>([]);
  const [view, setView] = useState<'workout' | 'weight' | 'food'>('workout');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [mealCarbs, setMealCarbs] = useState('');
  const [mealFat, setMealFat] = useState('');

  useEffect(() => {
    const savedWorkouts = localStorage.getItem('fitTracker_workouts');
    const savedWeight = localStorage.getItem('fitTracker_weight');
    const savedMeals = localStorage.getItem('fitTracker_meals');
    const savedExercises = localStorage.getItem('fitTracker_exercises');
    if (savedWorkouts) setWorkoutHistory(JSON.parse(savedWorkouts));
    if (savedWeight) setWeightHistory(JSON.parse(savedWeight));
    if (savedMeals) setMealHistory(JSON.parse(savedMeals));
    if (savedExercises) exercisesList = JSON.parse(savedExercises);
  }, []);

  useEffect(() => {
    localStorage.setItem('fitTracker_workouts', JSON.stringify(workoutHistory));
    localStorage.setItem('fitTracker_weight', JSON.stringify(weightHistory));
    localStorage.setItem('fitTracker_meals', JSON.stringify(mealHistory));
    localStorage.setItem('fitTracker_exercises', JSON.stringify(exercisesList));
  }, [workoutHistory, weightHistory, mealHistory]);

  const getLastWorkout = (exerciseId: string): WorkoutLog | undefined => {
    return workoutHistory.filter(w => w.exerciseId === exerciseId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  const startWorkout = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    const lastWorkout = getLastWorkout(exercise.id);
    const targets = lastWorkout ? calculateNextTargets(lastWorkout.sets) : { weight: 50, reps: 8 };
    const initialSets = [
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
    const newLog: WorkoutLog = { id: Date.now().toString(), date: new Date().toISOString(), exerciseId: selectedExercise.id, sets: completedSets };
    setWorkoutHistory([newLog, ...workoutHistory]);
    setSelectedExercise(null);
    setCurrentSets([]);
  };

  const addWeight = () => {
    if (!newWeight || parseFloat(newWeight) <= 0) return;
    const entry: WeightEntry = { id: Date.now().toString(), date: new Date().toISOString(), weight: parseFloat(newWeight) };
    setWeightHistory([entry, ...weightHistory]);
    setNewWeight('');
  };

  const addMeal = () => {
    if (!mealName.trim() || !mealCalories) return;
    const entry: MealEntry = { id: Date.now().toString(), date: new Date().toISOString(), name: mealName, calories: parseInt(mealCalories) || 0, protein: parseInt(mealProtein) || 0, carbs: parseInt(mealCarbs) || 0, fat: parseInt(mealFat) || 0 };
    setMealHistory([entry, ...mealHistory]);
    setMealName(''); setMealCalories(''); setMealProtein(''); setMealCarbs(''); setMealFat('');
  };

  const deleteExercise = (id: string) => {
    exercisesList = exercisesList.filter(e => e.id !== id);
    setView('workout');
  };

  const addExercise = () => {
    if (!newExerciseName.trim()) return;
    exercisesList.push({ id: Date.now().toString(), name: newExerciseName, category: 'OTHER' });
    setNewExerciseName('');
    setShowAddExercise(false);
  };

  const deleteMeal = (id: string) => {
    setMealHistory(mealHistory.filter(m => m.id !== id));
  };

  const exercisesByCategory = exercisesList.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const todayMeals = mealHistory.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
  const todayTotals = { calories: todayMeals.reduce((sum, m) => sum + m.calories, 0), protein: todayMeals.reduce((sum, m) => sum + m.protein, 0), carbs: todayMeals.reduce((sum, m) => sum + m.carbs, 0), fat: todayMeals.reduce((sum, m) => sum + m.fat, 0) };
  const lastWeight = weightHistory[0]?.weight || 0;
  const meso = getMesocycleWeek();

  return (
    <div style={{ minHeight: '100vh', background: '#000000', padding: '16px', fontFamily: '-apple-system, sans-serif', fontSize: '13px', color: '#ffffff', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>FIT TRACKER</h1>
        <p style={{ color: '#666666', margin: '4px 0 20px 0' }}>{new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

        <div style={{ background: meso.type === 'DELOAD' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)', border: `1px solid ${meso.type === 'DELOAD' ? '#eab308' : '#3b82f6'}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
          <span style={{ color: meso.type === 'DELOAD' ? '#eab308' : '#3b82f6', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{meso.type === 'DELOAD' ? '🔥 DELOAD WEEK' : `WEEK ${meso.week}`}</span>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{meso.description}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <button onClick={() => setView('weight')} style={{ background: view === 'weight' ? '#1a1a1a' : '#0a0a0a', border: view === 'weight' ? '1px solid #333' : '1px solid #1a1a1a', borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ color: '#666666', fontSize: '10px', textTransform: 'uppercase' }}>HMOTNOST</div>
            <div style={{ fontSize: '22px', fontWeight: 600 }}>{lastWeight > 0 ? `${lastWeight} kg` : '--'}</div>
          </button>
          <button onClick={() => setView('food')} style={{ background: view === 'food' ? '#1a1a1a' : '#0a0a0a', border: view === 'food' ? '1px solid #333' : '1px solid #1a1a1a', borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ color: '#666666', fontSize: '10px', textTransform: 'uppercase' }}>DNES</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: todayTotals.calories > 0 ? '#22c55e' : '#ffffff' }}>{todayTotals.calories > 0 ? `${todayTotals.calories} kcal` : '--'}</div>
          </button>
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a0a0a', borderTop: '1px solid #1a1a1a', padding: '12px 16px', display: 'flex', justifyContent: 'space-around', zIndex: 100 }}>
          {[{ key: 'workout', label: 'TRÉNINK', icon: '🏋️' }, { key: 'weight', label: 'HMOTNOST', icon: '⚖️' }, { key: 'food', label: 'KALORIE', icon: '🍎' }].map((tab) => (
            <button key={tab.key} onClick={() => setView(tab.key as any)} style={{ background: 'none', border: 'none', color: view === tab.key ? '#22c55e' : '#666666', cursor: 'pointer', fontSize: '10px', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {view === 'workout' && (
          <>
            {Object.entries(exercisesByCategory).map(([category, exercises]) => (
              <div key={category} style={{ marginBottom: '16px' }}>
                <h3 style={{ color: CATEGORY_COLORS[category] || '#666666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>{category}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {exercises.map((exercise) => (
                    <div key={exercise.id} style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => startWorkout(exercise)} style={{ flex: 1, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '14px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{exercise.name}</span>
                        <span style={{ color: '#666666', fontSize: '12px' }}>{getLastWorkout(exercise.id)?.sets[0]?.weight || '-'} kg</span>
                      </button>
                      <button onClick={() => deleteExercise(exercise.id)} style={{ background: '#1a0000', border: '1px solid #330000', borderRadius: '8px', padding: '14px 12px', cursor: 'pointer', color: '#ff4444', fontSize: '16px' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {showAddExercise ? (
              <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '16px' }}>
                <input type="text" placeholder="Název cviku..." value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} autoFocus style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: '#fff', fontSize: '14px', marginBottom: '12px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={addExercise} style={{ flex: 1, background: '#22c55e', border: 'none', borderRadius: '6px', padding: '10px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>Přidat</button>
                  <button onClick={() => setShowAddExercise(false)} style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#666', cursor: 'pointer' }}>Zrušit</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddExercise(true)} style={{ width: '100%', padding: '14px', background: 'none', border: '1px dashed #333', borderRadius: '8px', color: '#666666', cursor: 'pointer', fontSize: '13px' }}>+ Přidat vlastní cvik</button>
            )}
          </>
        )}

        {view === 'weight' && (
          <div>
            <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>AKTUÁLNÍ HMOTNOST</div>
              <div style={{ fontSize: '48px', fontWeight: 700 }}>{lastWeight > 0 ? lastWeight : '--'}<span style={{ fontSize: '20px', color: '#666666', marginLeft: '4px' }}>kg</span></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input type="number" placeholder="Hmotnost (kg)" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} style={{ flex: 1, background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '14px', color: '#fff', fontSize: '16px' }} />
              <button onClick={addWeight} style={{ background: '#22c55e', border: 'none', borderRadius: '8px', padding: '14px 20px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>+</button>
            </div>
            <h3 style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>HISTORIE</h3>
            {weightHistory.slice(0, 10).map((entry) => (
              <div key={entry.id} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666666', fontSize: '13px' }}>{formatDate(entry.date)}</span>
                <span style={{ fontWeight: 600 }}>{entry.weight} kg</span>
              </div>
            ))}
          </div>
        )}

        {view === 'food' && (
          <div>
            <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '16px' }}>DNESNI PŘÍJEM</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: todayTotals.calories > 0 ? '#22c55e' : '#ffffff' }}>{todayTotals.calories}<span style={{ fontSize: '16px', color: '#666666', marginLeft: '4px' }}>kcal</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#666666', fontSize: '10px', textTransform: 'uppercase' }}>Bílkoviny</div><div style={{ color: '#ef4444', fontWeight: 600 }}>{todayTotals.protein}g</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#666666', fontSize: '10px', textTransform: 'uppercase' }}>Sacharidy</div><div style={{ color: '#3b82f6', fontWeight: 600 }}>{todayTotals.carbs}g</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#666666', fontSize: '10px', textTransform: 'uppercase' }}>Tuky</div><div style={{ color: '#eab308', fontWeight: 600 }}>{todayTotals.fat}g</div></div>
              </div>
            </div>

            <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>PŘIDAT JÍDLO</div>
              <input type="text" placeholder="Název jídla" value={mealName} onChange={(e) => setMealName(e.target.value)} style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: '#fff', fontSize: '14px', marginBottom: '12px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <input type="number" placeholder="kcal" value={mealCalories} onChange={(e) => setMealCalories(e.target.value)} style={{ background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#22c55e', fontSize: '14px', textAlign: 'center' }} />
                <input type="number" placeholder="B" value={mealProtein} onChange={(e) => setMealProtein(e.target.value)} style={{ background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#ef4444', fontSize: '14px', textAlign: 'center' }} />
                <input type="number" placeholder="S" value={mealCarbs} onChange={(e) => setMealCarbs(e.target.value)} style={{ background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#3b82f6', fontSize: '14px', textAlign: 'center' }} />
                <input type="number" placeholder="T" value={mealFat} onChange={(e) => setMealFat(e.target.value)} style={{ background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#eab308', fontSize: '14px', textAlign: 'center' }} />
              </div>
              <button onClick={addMeal} style={{ width: '100%', background: '#22c55e', border: 'none', borderRadius: '8px', padding: '12px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>Přidat jídlo</button>
            </div>

            <h3 style={{ color: '#666666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>DNES</h3>
            {todayMeals.map((meal) => (
              <div key={meal.id} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{meal.name}</div>
                  <div style={{ fontSize: '11px', color: '#666666' }}>
                    <span style={{ color: '#22c55e' }}>{meal.calories} kcal</span> • <span style={{ color: '#ef4444' }}>{meal.protein}g B</span> • <span style={{ color: '#3b82f6' }}>{meal.carbs}g S</span> • <span style={{ color: '#eab308' }}>{meal.fat}g T</span>
                  </div>
                </div>
                <button onClick={() => deleteMeal(meal.id)} style={{ background: 'none', border: 'none', color: '#444444', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {selectedExercise && currentSets.length > 0 && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000000', zIndex: 200, overflow: 'auto', padding: '16px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => setSelectedExercise(null)} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>← ZPĚT</button>
                <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600 }}>{selectedExercise.name}</h2>
                <div style={{ width: '50px' }} />
              </div>
              {currentSets.map((set, index) => (
                <div key={index} style={{ background: set.completed ? 'rgba(34, 197, 94, 0.1)' : '#0a0a0a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: set.completed ? '1px solid #22c55e' : '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#666666', fontSize: '12px', fontWeight: 600 }}>SET {index + 1}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={set.completed} onChange={(e) => updateSet(index, 'completed', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#22c55e' }} />
                      <span style={{ color: set.completed ? '#22c55e' : '#666666', fontSize: '12px' }}>LOG</span>
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#444444', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>KG</label>
                      <input type="number" value={set.weight} onChange={(e) => updateSet(index, 'weight', Number(e.target.value))} style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: '#fff', fontSize: '18px', textAlign: 'center', fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#444444', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>REPS</label>
                      <input type="number" value={set.reps} onChange={(e) => updateSet(index, 'reps', Number(e.target.value))} style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: '#fff', fontSize: '18px', textAlign: 'center', fontWeight: 600 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#444444', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>RIR</label>
                      <input type="number" min="0" max="5" value={set.rir} onChange={(e) => updateSet(index, 'rir', Number(e.target.value))} style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: set.rir <= 2 ? '#22c55e' : set.rir <= 3 ? '#eab308' : '#ef4444', fontSize: '18px', textAlign: 'center', fontWeight: 600 }} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={completeWorkout} style={{ width: '100%', background: '#22c55e', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}>SAVE WORKOUT</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
