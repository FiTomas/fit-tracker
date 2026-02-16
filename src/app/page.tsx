'use client';

import { useState, useEffect, useMemo } from 'react';

interface Exercise { id: string; name: string; category: string; }
interface WorkoutSet { reps: number; weight: number; rir: number; completed: boolean; }
interface WorkoutLog { id: string; date: string; exerciseId: string; sets: WorkoutSet[]; }
interface WeightEntry { id: string; date: string; weight: number; }
interface MealEntry { id: string; date: string; name: string; calories: number; protein: number; carbs: number; fat: number; }
interface Mesocycle { week: number; type: 'BASE' | 'BUILD' | 'PEAK' | 'DELOAD'; description: string; }
interface SavedMeal { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; }

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

const MESO_DAYS = [
  { day: "Pondělí", workout: "Horní polovina" },
  { day: "Úterý", workout: "Spodní polovina" },
  { day: "Středa", workout: "Odpočinek" },
  { day: "Čtvrtek", workout: "Horní polovina" },
  { day: "Pátek", workout: "Spodní polovina" },
  { day: "Sobota", workout: "Odpočinek / Dlouhý běh" },
  { day: "Neděle", workout: "DELOAD - Lehký pohyb" },
];

const WEEK_EXERCISES: Record<number, string[]> = {
  1: ['Squat', 'Bench Press', 'Barbell Row', 'Overhead Press'],
  2: ['Squat', 'Bench Press', 'Pull-ups', 'Dumbbell Curl'],
  3: ['Deadlift', 'Overhead Press', 'Lat Pulldown', 'Tricep Pushdown'],
  4: ['Squat', 'Bench Press', 'Barbell Row', 'Leg Press'],
  5: ['Deadlift', 'Pull-ups', 'Dumbbell Curl', 'Tricep Pushdown'],
  6: ['Squat', 'Bench Press', 'Overhead Press', 'Barbell Row'],
  7: ['Deadlift', 'Squat', 'Bench Press', 'Pull-ups'],
  8: ['Squat', 'Bench Press', 'Row', 'Curl'],
};

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
];

const getWeekNumber = (date: Date): number => { const start = new Date(date.getFullYear(), 0, 1); const diff = date.getTime() - start.getTime(); return Math.ceil((diff + start.getDay() * 86400000) / 604800000); };
const getMesocycleWeek = (): Mesocycle => { const w = getWeekNumber(new Date()) % 8; return MESOCYCLE[w === 0 ? 7 : w - 1]; };
const calcTargets = (ls: WorkoutSet[]): { weight: number; reps: number } => {
  if (!ls || ls.length === 0) return { weight: 50, reps: 8 };
  const cs = ls.filter(s => s.completed && s.rir <= 2);
  if (cs.length === 0) return { weight: ls[0].weight, reps: ls[0].reps };
  const bs = cs.reduce((a, b) => a.reps > b.reps || (a.reps === b.reps && a.weight > b.weight) ? a : b, cs[0]);
  return { weight: bs.rir <= 1 ? Math.round((bs.weight + 2.5) / 2.5) * 2.5 : bs.weight, reps: bs.rir >= 3 ? Math.min(bs.reps + 1, 12) : bs.reps };
};

export default function Home() {
  const [selEx, setSelEx] = useState<Exercise | null>(null);
  const [curSets, setCurSets] = useState<WorkoutSet[]>([]);
  const [wHist, setWHist] = useState<WorkoutLog[]>([]);
  const [wght, setWght] = useState<WeightEntry[]>([]);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [exercisesList, setExercisesList] = useState<Exercise[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_EXERCISES;
    const saved = localStorage.getItem('fitTracker_exercises');
    return saved ? JSON.parse(saved) : DEFAULT_EXERCISES;
  });
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [exercisesList, setExercisesList] = useState<Exercise[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_EXERCISES;
    const saved = localStorage.getItem('fitTracker_exercises');
    return saved ? JSON.parse(saved) : DEFAULT_EXERCISES;
  });
  const [view, setView] = useState<'workout' | 'weight' | 'food' | 'archive'>('workout');
  const [selWeek, setSelWeek] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });
  const [completedWeeks, setCompletedWeeks] = useState<number[]>([]);
  const [showMesoComplete, setShowMesoComplete] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [weightPeriod, setWeightPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [foodPeriod, setFoodPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [calorieGoal, setCalorieGoal] = useState<number>(2500);
  const [weightGoal, setWeightGoal] = useState<number>(85);

  useEffect(() => {
    const a = localStorage.getItem('fitTracker_workouts');
    const b = localStorage.getItem('fitTracker_weight');
    const c = localStorage.getItem('fitTracker_meals');
    const d = localStorage.getItem('fitTracker_exercises');
    const e = localStorage.getItem('fitTracker_savedMeals');
    const f = localStorage.getItem('fitTracker_calorieGoal');
    const g = localStorage.getItem('fitTracker_weightGoal');
    if (a) setWHist(JSON.parse(a)); if (b) setWght(JSON.parse(b)); if (c) setMeals(JSON.parse(c)); if (d) setExercisesList(JSON.parse(d)); if (e) setSavedMeals(JSON.parse(e)); if (f) setCalorieGoal(parseInt(f)); if (g) setWeightGoal(parseFloat(g));
    const h = localStorage.getItem("fitTracker_completedWeeks"); if (h) setCompletedWeeks(JSON.parse(h));
  }, []);

  useEffect(() => {
    localStorage.setItem('fitTracker_workouts', JSON.stringify(wHist));
    localStorage.setItem('fitTracker_weight', JSON.stringify(wght));
    localStorage.setItem('fitTracker_meals', JSON.stringify(meals));
    localStorage.setItem('fitTracker_exercises', JSON.stringify(exercisesList));
    localStorage.setItem('fitTracker_savedMeals', JSON.stringify(savedMeals));
    localStorage.setItem('fitTracker_calorieGoal', calorieGoal.toString());
    localStorage.setItem('fitTracker_weightGoal', weightGoal.toString());
    localStorage.setItem('fitTracker_completedWeeks', JSON.stringify(completedWeeks));
  }, [wHist, wght, meals, savedMeals, calorieGoal, weightGoal, completedWeeks, exercisesList]);

  const getLast = (id: string) => wHist.filter(w => w.exerciseId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const startW = (ex: Exercise) => { const t = getLast(ex.id) ? calcTargets(getLast(ex.id).sets) : { weight: 50, reps: 8 }; setSelEx(ex); setCurSets([{ reps: t.reps, weight: t.weight, rir: 3, completed: false }, { reps: t.reps, weight: t.weight, rir: 3, completed: false }, { reps: t.reps, weight: t.weight, rir: 3, completed: false }, { reps: t.reps, weight: t.weight, rir: 3, completed: false }]); };
  const updSet = (i: number, f: keyof WorkoutSet, v: number | boolean) => { const ns = [...curSets]; ns[i] = { ...ns[i], [f]: v }; setCurSets(ns); };
  const finW = () => { 
    if (!selEx) return; 
    const cs = curSets.filter(s => s.completed); 
    if (!cs.length) return; 
    const today = new Date().toDateString();
    const newLog = { id: Date.now().toString(), date: new Date().toISOString(), exerciseId: selEx.id, sets: cs };
    setWHist([newLog, ...wHist]); 
    
    const dayExNames = dayExercises.map(e => e.toLowerCase());
    const doneToday = wHist.filter(w => new Date(w.date).toDateString() === today).map(w => {
      const ex = exercisesList.find(ex => ex.id === w.exerciseId);
      return ex ? ex.name.toLowerCase() : '';
    });
    doneToday.push(selEx.name.toLowerCase());
    
    const allDone = dayExNames.length > 0 && dayExNames.every(de => doneToday.some(dt => dt.includes(de) || de.includes(dt)));
    
    if (allDone) {
      const nextDay = (activeDay + 1) % 7;
      setActiveDay(nextDay);
      if (nextDay === 0 && !completedWeeks.includes(currentWeek)) {
        setCompletedWeeks([...completedWeeks, currentWeek]);
      }
      if (completedWeeks.length >= 7 && currentWeek === 8) {
        setShowMesoComplete(true);
      }
    }
    
    setSelEx(null); 
    setCurSets([]); 
  };
  const addWght = () => { if (!newWght || parseFloat(newWght) <= 0) return; setWght([{ id: Date.now().toString(), date: new Date().toISOString(), weight: parseFloat(newWght) }, ...wght]); setNewWght(''); };
  const [newWght, setNewWght] = useState('');
  const addMeal = () => { if (!mName.trim() || !mCals) return; setMeals([{ id: Date.now().toString(), date: new Date().toISOString(), name: mName, calories: parseInt(mCals) || 0, protein: parseInt(mPro) || 0, carbs: parseInt(mCarb) || 0, fat: parseInt(mFat) || 0 }, ...meals]); setMName(''); setMCals(''); setMPro(''); setMCarb(''); setMFat(''); };
  const [mName, setMName] = useState('');
  const [mCals, setMCals] = useState('');
  const [mPro, setMPro] = useState('');
  const [mCarb, setMCarb] = useState('');
  const [mFat, setMFat] = useState('');
  const delMeal = (id: string) => setMeals(meals.filter(m => m.id !== id));
  
  const savePresetMeal = () => {
    if (!mName.trim() || !mCals) return;
    const newSaved: SavedMeal = { id: Date.now().toString(), name: mName, calories: parseInt(mCals) || 0, protein: parseInt(mPro) || 0, carbs: parseInt(mCarb) || 0, fat: parseInt(mFat) || 0 };
    setSavedMeals([...savedMeals, newSaved]);
  };
  
  const usePresetMeal = (meal: SavedMeal) => {
    setMeals([{ id: Date.now().toString(), date: new Date().toISOString(), name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat }, ...meals]);
  };
  
  const delSavedMeal = (id: string) => setSavedMeals(savedMeals.filter(m => m.id !== id));
  
  const fmt = (d: string) => new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtD = (d: string) => new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
  const tdMls = meals.filter(e => new Date(e.date).toDateString() === new Date().toDateString());
  const tdTot = { calories: tdMls.reduce((s, m) => s + m.calories, 0), protein: tdMls.reduce((s, m) => s + m.protein, 0), carbs: tdMls.reduce((s, m) => s + m.carbs, 0), fat: tdMls.reduce((s, m) => s + m.fat, 0) };
  const lastWg = wght[0]?.weight || 0;
  const meso = getMesocycleWeek();
  const currentWeek = selWeek || meso.week;

  const getDayExercises = (day: number) => {
    const weekEx = WEEK_EXERCISES[currentWeek] || [];
    if (day === 0 || day === 3) return weekEx.slice(0, 2);
    if (day === 1 || day === 4) return weekEx.slice(2, 4);
    return [];
  };
  const dayExercises = getDayExercises(activeDay);

  const getTodayCompletedExercises = () => {
    const today = new Date().toDateString();
    return wHist
      .filter(w => new Date(w.date).toDateString() === today)
      .map(w => {
        const ex = exercisesList.find(ex => ex.id === w.exerciseId);
        return ex ? { id: w.id, name: ex.name, sets: w.sets } : null;
      })
      .filter(Boolean);
  };
  const todayCompleted = getTodayCompletedExercises();

  const weightData = useMemo(() => {
    if (wght.length < 2) return { data: [], trend: 0, avg: 0 };
    const now = new Date();
    let cutoff = new Date();
    if (weightPeriod === 'week') cutoff.setDate(now.getDate() - 7);
    else if (weightPeriod === 'month') cutoff.setDate(now.getDate() - 30);
    else cutoff.setDate(now.getDate() - 365);
    const filtered = wght.filter(w => new Date(w.date) >= cutoff).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (filtered.length < 2) return { data: filtered, trend: 0, avg: lastWg };
    const first = filtered[0].weight;
    const last = filtered[filtered.length - 1].weight;
    const trend = last - first;
    const avg = filtered.reduce((s, w) => s + w.weight, 0) / filtered.length;
    return { data: filtered, trend, avg };
  }, [wght, weightPeriod, lastWg]);

  const calorieData = useMemo(() => {
    const now = new Date();
    let cutoff = new Date();
    if (foodPeriod === 'week') cutoff.setDate(now.getDate() - 7);
    else if (foodPeriod === 'month') cutoff.setDate(now.getDate() - 30);
    else cutoff.setDate(now.getDate() - 365);
    
    const dailyTotals: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    meals.forEach(m => {
      const dateKey = new Date(m.date).toDateString();
      if (new Date(m.date) >= cutoff) {
        if (!dailyTotals[dateKey]) {
          dailyTotals[dateKey] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        }
        dailyTotals[dateKey].calories += m.calories;
        dailyTotals[dateKey].protein += m.protein;
        dailyTotals[dateKey].carbs += m.carbs;
        dailyTotals[dateKey].fat += m.fat;
      }
    });
    
    const data = Object.entries(dailyTotals)
      .map(([date, totals]) => ({ date, ...totals }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const avg = data.length > 0 ? data.reduce((s, d) => s + d.calories, 0) / data.length : 0;
    return { data, avg };
  }, [meals, foodPeriod]);

  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '16px', fontFamily: '-apple-system', color: '#fff', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700 }}>FIT TRACKER</h1>
        <p style={{ color: '#666', margin: '4px 0 20px' }}>{new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a0a0a', borderTop: '1px solid #1a1a1a', padding: '12px 16px', display: 'flex', justifyContent: 'space-around', zIndex: 100 }}>
          {
          [{ k: 'workout', l: 'TRÉNINK', i: '🏋️' }, { k: 'weight', l: 'HMOTNOST', i: '⚖️' }, { k: 'food', l: 'KALORIE', i: '🍎' }, { k: 'archive', l: 'ARCHIV', i: '📚' }].map(t => (
            <button key={t.k} onClick={() => setView(t.k as any)} style={{ background: 'none', border: 'none', color: view === t.k ? '#22c55e' : '#666', cursor: 'pointer', fontSize: '10px', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '20px' }}>{t.i}</span>{t.l}
            </button>
          ))}
        </div>

        {view === 'workout' && (
          <>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
              {MESOCYCLE.map(m => (
                <button key={m.week} onClick={() => setSelWeek(selWeek === m.week ? null : m.week)} style={{ background: m.week === currentWeek ? '#22c55e' : '#0a0a0a', border: m.week === currentWeek ? 'none' : '1px solid #333', borderRadius: '8px', padding: '8px 14px', color: m.week === currentWeek ? '#000' : '#666', fontWeight: 600, cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                  {m.week}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#22c55e', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>🔥 TÝDEN {currentWeek} - {MESOCYCLE[currentWeek - 1].type}</h3>
              {(dayExercises || []).map((exName, i) => {
                const ex = exercisesList.find(e => e.name === exName) || exercisesList.find(e => e.name.toLowerCase().includes(exName.toLowerCase()));
                const isCompleted = todayCompleted.some(c => c?.name.toLowerCase() === exName.toLowerCase());
                return (
                  <div key={i} style={{ marginBottom: '8px' }}>
                    <button onClick={() => ex && startW(ex)} style={{ width: '100%', background: isCompleted ? 'rgba(34, 197, 94, 0.15)' : '#0a0a0a', border: isCompleted ? '1px solid #22c55e' : '1px solid #22c55e', borderRadius: '8px', padding: '14px 16px', cursor: ex ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: ex ? 1 : 0.5, color: '#fff', fontSize: '14px' }}>
                      <span style={{ fontWeight: 500 }}>{exName} {isCompleted && '✓'}</span>
                      <span style={{ color: isCompleted ? '#22c55e' : '#666', fontSize: '12px' }}>{ex ? getLast(ex.id)?.sets[0]?.weight || '-' : '?'} kg</span>
                    </button>
                  </div>
                );
              })}
              <button onClick={() => setShowAddExercise(true)} style={{ width: '100%', background: '#0a0a0a', border: '1px dashed #333', borderRadius: '8px', padding: '12px', color: '#666', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}>+ Přidat cvik</button>
            </div>


            <h4 style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>PLÁN TÝDNE</h4>
            {MESO_DAYS.map((d, idx) => (
              <div key={d.day} onClick={() => setActiveDay(idx)} style={{ background: idx === activeDay ? 'rgba(34, 197, 94, 0.15)' : '#0a0a0a', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', border: idx === activeDay ? '1px solid #22c55e' : '1px solid transparent', cursor: 'pointer' }}>
                <span style={{ color: idx === activeDay ? '#22c55e' : '#888', fontSize: '13px', fontWeight: idx === activeDay ? 600 : 400 }}>{d.day}</span>
                <span style={{ color: d.workout.includes('DELOAD') ? '#eab308' : idx === activeDay ? '#22c55e' : '#fff', fontSize: '13px' }}>{d.workout}</span>
              </div>
            ))}
          </>
        )}

        {view === 'weight' && (
          <div>
            <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>AKTUÁLNÍ HMOTNOST</div>
              <div style={{ fontSize: '48px', fontWeight: 700 }}>{lastWg > 0 ? lastWg : '--'}<span style={{ fontSize: '20px', color: '#666', marginLeft: '4px' }}>kg</span></div>
              {weightData.trend !== 0 && (
                <div style={{ marginTop: '8px', color: weightData.trend > 0 ? '#ef4444' : '#22c55e', fontSize: '14px' }}>
                  {weightData.trend > 0 ? '↑ +' : '↓ '}{weightData.trend.toFixed(1)} kg za {weightPeriod === 'week' ? 'týden' : weightPeriod === 'month' ? 'měsíc' : 'rok'}
                </div>
              )}
            </div>

            <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase' }}>CÍL HMOTNOSTI</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    value={weightGoal} 
                    onChange={e => setWeightGoal(parseFloat(e.target.value) || 85)} 
                    style={{ background: '#000', border: '1px solid #333', borderRadius: '4px', padding: '4px 8px', color: '#22c55e', fontSize: '14px', width: '60px', textAlign: 'center' }} 
                  />
                  <span style={{ color: '#666', fontSize: '12px' }}>kg</span>
                </div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: '8px', height: '12px', overflow: 'hidden' }}>
                <div style={{ 
                  width: lastWg > 0 ? `${Math.min(100, Math.max(0, (lastWg / weightGoal) * 100))}%` : '0%', 
                  height: '100%', 
                  background: lastWg >= weightGoal ? '#22c55e' : '#eab308',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                {lastWg > 0 ? (lastWg >= weightGoal ? '✓ Cíl dosažen!' : `${(weightGoal - lastWg).toFixed(1)} kg do cíle`) : 'Zadejte hmotnost'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['week', 'month', 'year'] as const).map(p => (
                <button key={p} onClick={() => setWeightPeriod(p)} style={{ flex: 1, background: weightPeriod === p ? '#22c55e' : '#0a0a0a', border: weightPeriod === p ? 'none' : '1px solid #333', borderRadius: '8px', padding: '10px', color: weightPeriod === p ? '#000' : '#666', fontWeight: 600, cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}>
                  {p === 'week' ? '7 dní' : p === 'month' ? '30 dní' : 'Rok'}
                </button>
              ))}
            </div>

            {weightData.data.length >= 2 ? (
              <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ height: '150px', position: 'relative', marginBottom: '12px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: '#444' }}>
                    <span>{Math.max(...weightData.data.map(w => w.weight)) + 2}</span><span>{Math.min(...weightData.data.map(w => w.weight)) - 2}</span>
                  </div>
                  <div style={{ marginLeft: '35px', height: '100%', position: 'relative', borderBottom: '1px solid #222' }}>
                    {weightData.data.map((w, i) => {
                      const minW = Math.min(...weightData.data.map(w => w.weight)) - 2;
                      const maxW = Math.max(...weightData.data.map(w => w.weight)) + 2;
                      const left = (i / (weightData.data.length - 1)) * 100;
                      const top = ((maxW - w.weight) / (maxW - minW)) * 100;
                      return (
                        <div key={w.id} style={{ position: 'absolute', left: left + '%', top: top + '%', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} title={w.weight + ' kg - ' + fmtD(w.date)} />
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#444' }}>
                  <span>{weightData.data[0] ? fmtD(weightData.data[0].date) : '-'}</span>
                  <span style={{ color: '#666' }}>Průměr: {weightData.avg.toFixed(1)} kg</span>
                  <span>{weightData.data[weightData.data.length - 1] ? fmtD(weightData.data[weightData.data.length - 1].date) : '-'}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                Potřebuješ alespoň 2 záznamy pro graf
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input value={newWght} onChange={e => setNewWght(e.target.value)} placeholder="Hmotnost (kg)" style={{ flex: 1, background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '14px', color: '#fff', fontSize: '16px' }} />
              <button onClick={addWght} style={{ background: '#22c55e', border: 'none', borderRadius: '8px', padding: '14px 20px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>+</button>
            </div>
            <h3 style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>HISTORIE</h3>
            {wght.slice(0, 10).map(e => <div key={e.id} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>{fmt(e.date)}</span><span style={{ fontWeight: 600 }}>{e.weight} kg</span></div>)}
          </div>
        )}

        {view === 'archive' && (
          <div>
            <h3 style={{color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px'}}>ARCHIV</h3>
            {wHist.length === 0 ? <div style={{color: '#666', textAlign: 'center', padding: '40px'}}>Zatím žádné tréninky</div> : 
              wHist.slice(0, 20).map(w => {
                const ex = exercisesList.find(e => e.id === w.exerciseId);
                return ex ? <div key={w.id} style={{background: '#0a0a0a', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px', fontSize: '12px'}}><span style={{color: '#22c55e'}}>{new Date(w.date).toLocaleDateString('cs-CZ', {day: 'numeric', month: 'short'})}</span> - {ex.name}</div> : null;
              })
            }
          </div>
        )}

        {view === 'archive' && (
          <div>
            <h3 style={{color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px'}}>ARCHIV TRÉNINKŮ</h3>
            {wHist.length === 0 ? <div style={{color: '#666', textAlign: 'center', padding: '40px'}}>Zatím žádné tréninky</div> : 
              wHist.slice(0, 20).map(w => {
                const ex = exercisesList.find(e => e.id === w.exerciseId);
                return ex ? <div key={w.id} style={{background: '#0a0a0a', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px', fontSize: '12px'}}><span style={{color: '#22c55e'}}>{new Date(w.date).toLocaleDateString('cs-CZ', {day: 'numeric', month: 'short'})}</span> - {ex.name}</div> : null;
              })
            }
          </div>
        )}

        {view === 'food' && (
          <div>
            <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase' }}>DENNÍ CÍL KALORII</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    value={calorieGoal} 
                    onChange={e => setCalorieGoal(parseInt(e.target.value) || 2500)} 
                    style={{ background: '#000', border: '1px solid #333', borderRadius: '4px', padding: '4px 8px', color: '#22c55e', fontSize: '14px', width: '70px', textAlign: 'center' }} 
                  />
                  <span style={{ color: '#666', fontSize: '12px' }}>kcal</span>
                </div>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: '8px', height: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ 
                  width: `${Math.min(100, Math.max(0, (tdTot.calories / calorieGoal) * 100))}%`, 
                  height: '100%', 
                  background: tdTot.calories >= calorieGoal ? '#22c55e' : '#eab308',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: tdTot.calories > 0 ? '#22c55e' : '#fff', marginBottom: '8px' }}>
                {tdTot.calories}<span style={{ fontSize: '16px', color: '#666', marginLeft: '4px' }}>/ {calorieGoal} kcal</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#666', fontSize: '10px' }}>Bílkoviny</div><div style={{ color: '#ef4444', fontWeight: 600 }}>{tdTot.protein}g</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#666', fontSize: '10px' }}>Sacharidy</div><div style={{ color: '#3b82f6', fontWeight: 600 }}>{tdTot.carbs}g</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ color: '#666', fontSize: '10px' }}>Tuky</div><div style={{ color: '#eab308', fontWeight: 600 }}>{tdTot.fat}g</div></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['week', 'month', 'year'] as const).map(p => (
                <button key={p} onClick={() => setFoodPeriod(p)} style={{ flex: 1, background: foodPeriod === p ? '#22c55e' : '#0a0a0a', border: foodPeriod === p ? 'none' : '1px solid #333', borderRadius: '8px', padding: '10px', color: foodPeriod === p ? '#000' : '#666', fontWeight: 600, cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}>
                  {p === 'week' ? '7 dní' : p === 'month' ? '30 dní' : 'Rok'}
                </button>
              ))}
            </div>

            {calorieData.data.length >= 2 ? (
              <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ height: '150px', position: 'relative', marginBottom: '12px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: '#444' }}>
                    <span>{Math.max(...calorieData.data.map(d => d.calories), calorieGoal) + 200}</span>
                    <span style={{ color: '#22c55e' }}>{calorieGoal}</span>
                    <span>0</span>
                  </div>
                  <div style={{ marginLeft: '45px', height: '100%', position: 'relative', borderBottom: '1px solid #222' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${100 - (calorieGoal / (Math.max(...calorieData.data.map(d => d.calories), calorieGoal) + 200)) * 100}%`, height: '1px', background: '#22c55e', opacity: 0.3 }} />
                    {calorieData.data.map((d, i) => {
                      const maxCal = Math.max(...calorieData.data.map(d => d.calories), calorieGoal) + 200;
                      const left = (i / (calorieData.data.length - 1)) * 100;
                      const top = ((maxCal - d.calories) / maxCal) * 100;
                      return (
                        <div key={i} style={{ position: 'absolute', left: left + '%', top: top + '%', width: '8px', height: '8px', background: d.calories >= calorieGoal ? '#22c55e' : '#eab308', borderRadius: '50%', transform: 'translate(-50%, 50%)' }} title={d.calories + ' kcal - ' + fmtD(d.date)} />
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#444' }}>
                  <span>{calorieData.data[0] ? fmtD(calorieData.data[0].date) : '-'}</span>
                  <span style={{ color: '#666' }}>Průměr: {calorieData.avg.toFixed(0)} kcal</span>
                  <span>{calorieData.data[calorieData.data.length - 1] ? fmtD(calorieData.data[calorieData.data.length - 1].date) : '-'}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                Potřebuješ alespoň 2 dny s jídly pro graf
              </div>
            )}

            {savedMeals.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>ULOŽENÁ JÍDLA</h3>
                {savedMeals.map(m => (
                  <div key={m.id} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div onClick={() => usePresetMeal(m)} style={{ flex: 1, cursor: 'pointer' }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        <span style={{ color: '#22c55e' }}>{m.calories} kcal</span> • <span style={{ color: '#ef4444' }}>{m.protein}g B</span> • <span style={{ color: '#3b82f6' }}>{m.carbs}g S</span> • <span style={{ color: '#eab308' }}>{m.fat}g T</span>
                      </div>
                    </div>
                    <button onClick={() => delSavedMeal(m.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '18px', marginLeft: '8px' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: '#0a0a0a', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>PŘIDAT JÍDLO</div>
              <input value={mName} onChange={e => setMName(e.target.value)} placeholder="Název jídla" style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: '#fff', fontSize: '14px', marginBottom: '12px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <input value={mCals} onChange={e => setMCals(e.target.value)} placeholder="kcal" style={{ background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#22c55e', fontSize: '14px', textAlign: 'center' }} />
                <input value={mPro} onChange={e => setMPro(e.target.value)} placeholder="B" style={{ background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#ef4444', fontSize: '14px', textAlign: 'center' }} />
                <input value={mCarb} onChange={e => setMCarb(e.target.value)} placeholder="S" style={{ background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#3b82f6', fontSize: '14px', textAlign: 'center' }} />
                <input value={mFat} onChange={e => setMFat(e.target.value)} placeholder="T" style={{ background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '10px', color: '#eab308', fontSize: '14px', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addMeal} style={{ flex: 1, background: '#22c55e', border: 'none', borderRadius: '8px', padding: '12px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>Přidat</button>
                <button onClick={savePresetMeal} style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '12px 16px', color: '#666', fontWeight: 600, cursor: 'pointer' }}>💾</button>
              </div>
            </div>

            <h3 style={{ color: '#666', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px' }}>DNES</h3>
            {tdMls.map(m => <div key={m.id} style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ fontWeight: 500, marginBottom: '4px' }}>{m.name}</div><div style={{ fontSize: '11px', color: '#666' }}><span style={{ color: '#22c55e' }}>{m.calories} kcal</span> • <span style={{ color: '#ef4444' }}>{m.protein}g B</span> • <span style={{ color: '#3b82f6' }}>{m.carbs}g S</span> • <span style={{ color: '#eab308' }}>{m.fat}g T</span></div></div><button onClick={() => delMeal(m.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '18px' }}>×</button></div>)}
          </div>
        )}

        {selEx && curSets.length > 0 && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 200, overflow: 'auto', padding: '16px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => { setSelEx(null); setCurSets([]); }} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>← ZPĚT</button>
                <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>{selEx.name}</h2>
                <div style={{ width: '50px' }} />
              </div>
              {curSets.map((s, i) => (
                <div key={i} style={{ background: s.completed ? 'rgba(34, 197, 94, 0.1)' : '#0a0a0a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: s.completed ? '1px solid #22c55e' : '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#666', fontSize: '12px', fontWeight: 600 }}>SET {i + 1}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={s.completed} onChange={e => updSet(i, 'completed', e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#22c55e' }} />
                      <span style={{ color: s.completed ? '#22c55e' : '#666', fontSize: '12px' }}>LOG</span>
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><label style={{ display: 'block', color: '#444', fontSize: '10px', marginBottom: '4px' }}>KG</label><input type="number" value={s.weight} onChange={e => updSet(i, 'weight', Number(e.target.value))} style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: '#fff', fontSize: '18px', fontWeight: 600, textAlign: 'center' }} /></div>
                    <div><label style={{ display: 'block', color: '#444', fontSize: '10px', marginBottom: '4px' }}>REPS</label><input type="number" value={s.reps} onChange={e => updSet(i, 'reps', Number(e.target.value))} style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: '#fff', fontSize: '18px', fontWeight: 600, textAlign: 'center' }} /></div>
                    <div><label style={{ display: 'block', color: '#444', fontSize: '10px', marginBottom: '4px' }}>RIR</label><input type="number" min="0" max="5" value={s.rir} onChange={e => updSet(i, 'rir', Number(e.target.value))} style={{ width: '100%', background: '#000', border: '1px solid #333', borderRadius: '6px', padding: '12px', color: s.rir <= 2 ? '#22c55e' : s.rir <= 3 ? '#eab308' : '#ef4444', fontSize: '18px', fontWeight: 600, textAlign: 'center' }} /></div>
                  </div>
                </div>
              ))}
              <button onClick={finW} style={{ width: '100%', background: '#22c55e', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }}>SAVE WORKOUT</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
