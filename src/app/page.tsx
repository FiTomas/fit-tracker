'use client';

import { useState, useEffect, useMemo } from 'react';
import MesocycleTemplateBuilder from '@/components/MesocycleTemplateBuilder';
import MesocycleTemplateManager from '@/components/MesocycleTemplateManager';
import BarcodeScanner from '@/components/BarcodeScanner';
import FoodQuantityModal from '@/components/FoodQuantityModal';

interface Exercise { id: string; name: string; category: string; }
interface WorkoutSet { reps: number; weight: number; rir: number; completed: boolean; note?: string; }
interface WorkoutLog { id: string; date: string; exerciseId: string; sets: WorkoutSet[]; note?: string; }
interface WeightEntry { id: string; date: string; weight: number; }
interface MealEntry { id: string; date: string; name: string; calories: number; protein: number; carbs: number; fat: number; }
interface Mesocycle { week: number; type: 'BASE' | 'BUILD' | 'PEAK' | 'DELOAD'; description: string; }
interface SavedMeal { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; }
interface WorkoutTemplate { id: string; name: string; exerciseIds: string[]; }

// Mesocycle Template Interfaces
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
  id: string;
  name: string;
  description: string;
  weeks: WeekConfig[];
  createdAt: string;
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
  8: ['Squat', 'Bench Press'],
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

const CATEGORY_NAMES: Record<string, string> = {
  CHEST: 'Hrudník',
  BACK: 'Záda',
  LEGS: 'Nohy',
  SHOULDERS: 'Ramena',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  CUSTOM: 'Vlastní'
};

const CATEGORY_EMOJI: Record<string, string> = {
  CHEST: '💪',
  BACK: '🦾',
  LEGS: '🦵',
  SHOULDERS: '🏋️',
  BICEPS: '💪',
  TRICEPS: '💪',
  CUSTOM: '⭐'
};

const getWeekNumber = (date: Date): number => { const start = new Date(date.getFullYear(), 0, 1); const diff = date.getTime() - start.getTime(); return Math.ceil((diff + start.getDay() * 86400000) / 604800000); };
const getMesocycleWeek = (): Mesocycle => { const w = getWeekNumber(new Date()) % 8; return MESOCYCLE[w === 0 ? 7 : w - 1]; };
const calcTargets = (ls: WorkoutSet[]): { weight: number; reps: number } => {
  if (!ls || ls.length === 0) return { weight: 50, reps: 8 };
  const cs = ls.filter(s => s.completed && s.rir <= 2);
  if (cs.length === 0) return { weight: ls[0].weight, reps: ls[0].reps };
  const bs = cs.reduce((a, b) => a.reps > b.reps || (a.reps === b.reps && a.weight > b.weight) ? a : b, cs[0]);
  return { weight: bs.rir <= 1 ? Math.round((bs.weight + 2.5) / 2.5) * 2.5 : bs.weight, reps: bs.rir >= 3 ? Math.min(bs.reps + 1, 12) : bs.reps };
};

const getProgressSuggestion = (lastLog: WorkoutLog | undefined): { text: string; type: 'weight' | 'reps' | 'none' } => {
  if (!lastLog || !lastLog.sets || lastLog.sets.length === 0) return { text: '', type: 'none' };
  const bestSet = lastLog.sets.reduce((a, b) => a.reps > b.reps || (a.reps === b.reps && a.weight > b.weight) ? a : b);
  if (bestSet.rir <= 1) return { text: `+2.5 kg`, type: 'weight' };
  if (bestSet.rir <= 2 && bestSet.reps < 12) return { text: `+1 opak.`, type: 'reps' };
  return { text: '', type: 'none' };
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
  const [newExCategory, setNewExCategory] = useState('CUSTOM');
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedExercisesForTemplate, setSelectedExercisesForTemplate] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'workout' | 'weight' | 'food' | 'archive' | 'templates'>('workout');
  const [selWeek, setSelWeek] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  });
  const [completedWeeks, setCompletedWeeks] = useState<number[]>([]);
  const [showMesoComplete, setShowMesoComplete] = useState(false);
  const [weightPeriod, setWeightPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [foodPeriod, setFoodPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [calorieGoal, setCalorieGoal] = useState<number>(2500);
  const [weightGoal, setWeightGoal] = useState<number>(85);
  
  // Mesocycle Templates State
  const [mesocycleTemplates, setMesocycleTemplates] = useState<MesocycleTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MesocycleTemplate | null>(null);
  
  // Barcode Scanner State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedFoodData, setScannedFoodData] = useState<{ name: string; calories: number; protein: number; carbs: number; fat: number; serving: number } | null>(null);

  useEffect(() => {
    const a = localStorage.getItem('fitTracker_workouts');
    const b = localStorage.getItem('fitTracker_weight');
    const c = localStorage.getItem('fitTracker_meals');
    const d = localStorage.getItem('fitTracker_exercises');
    const e = localStorage.getItem('fitTracker_savedMeals');
    const f = localStorage.getItem('fitTracker_calorieGoal');
    const g = localStorage.getItem('fitTracker_weightGoal');
    const i = localStorage.getItem('fitTracker_darkMode');
    const j = localStorage.getItem('fitTracker_templates');
    const k = localStorage.getItem('fitTracker_mesocycleTemplates');
    const l = localStorage.getItem('fitTracker_activeTemplate');
    if (a) setWHist(JSON.parse(a)); if (b) setWght(JSON.parse(b)); if (c) setMeals(JSON.parse(c)); if (d) setExercisesList(JSON.parse(d)); if (e) setSavedMeals(JSON.parse(e)); if (f) setCalorieGoal(parseInt(f)); if (g) setWeightGoal(parseFloat(g));
    const h = localStorage.getItem("fitTracker_completedWeeks"); if (h) setCompletedWeeks(JSON.parse(h));
    if (i !== null) setDarkMode(i === 'true');
    if (j) setWorkoutTemplates(JSON.parse(j));
    if (k) setMesocycleTemplates(JSON.parse(k));
    if (l) setActiveTemplateId(l);
  }, []);

  // Apply dark/light mode
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      localStorage.setItem('fitTracker_darkMode', darkMode.toString());
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('fitTracker_workouts', JSON.stringify(wHist));
    localStorage.setItem('fitTracker_weight', JSON.stringify(wght));
    localStorage.setItem('fitTracker_meals', JSON.stringify(meals));
    localStorage.setItem('fitTracker_exercises', JSON.stringify(exercisesList));
    localStorage.setItem('fitTracker_savedMeals', JSON.stringify(savedMeals));
    localStorage.setItem('fitTracker_calorieGoal', calorieGoal.toString());
    localStorage.setItem('fitTracker_weightGoal', weightGoal.toString());
    localStorage.setItem('fitTracker_completedWeeks', JSON.stringify(completedWeeks));
    localStorage.setItem('fitTracker_mesocycleTemplates', JSON.stringify(mesocycleTemplates));
    if (activeTemplateId) localStorage.setItem('fitTracker_activeTemplate', activeTemplateId);
  }, [wHist, wght, meals, savedMeals, calorieGoal, weightGoal, completedWeeks, exercisesList, mesocycleTemplates, activeTemplateId]);

  // Rest Timer Countdown
  useEffect(() => {
    if (!restTimerActive || restTimer === null) return;
    if (restTimer <= 0) {
      setRestTimerActive(false);
      setRestTimer(null);
      // Vibrate when timer finishes (if supported)
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      return;
    }
    const interval = setInterval(() => {
      setRestTimer(prev => prev !== null ? prev - 1 : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimer, restTimerActive]);

  const getLast = (id: string) => wHist.filter(w => w.exerciseId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const startW = (ex: Exercise) => { const t = getLast(ex.id) ? calcTargets(getLast(ex.id).sets) : { weight: 50, reps: 8 }; setSelEx(ex); setCurSets([{ reps: t.reps, weight: t.weight, rir: 3, completed: false }, { reps: t.reps, weight: t.weight, rir: 3, completed: false }, { reps: t.reps, weight: t.weight, rir: 3, completed: false }, { reps: t.reps, weight: t.weight, rir: 3, completed: false }]); };
  const updSet = (i: number, f: keyof WorkoutSet, v: number | boolean | string) => { 
    const ns = [...curSets]; 
    ns[i] = { ...ns[i], [f]: v }; 
    setCurSets(ns); 
    // Start rest timer when set is completed
    if (f === 'completed' && v === true && i < curSets.length - 1) {
      setRestTimer(60); // 60 seconds (1 minute) default
      setRestTimerActive(true);
    }
  };
  
  const toggleCategory = (cat: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(cat)) {
      newCollapsed.delete(cat);
    } else {
      newCollapsed.add(cat);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Workout Templates
  const saveAsTemplate = (name: string, exerciseIds: string[]) => {
    const newTemplate: WorkoutTemplate = {
      id: Date.now().toString(),
      name,
      exerciseIds
    };
    const updated = [...workoutTemplates, newTemplate];
    setWorkoutTemplates(updated);
    localStorage.setItem('fitTracker_templates', JSON.stringify(updated));
  };

  const deleteTemplate = (id: string) => {
    const updated = workoutTemplates.filter(t => t.id !== id);
    setWorkoutTemplates(updated);
    localStorage.setItem('fitTracker_templates', JSON.stringify(updated));
  };

  const loadTemplate = (template: WorkoutTemplate) => {
    // Scroll to first exercise in template
    const firstEx = exercisesList.find(ex => ex.id === template.exerciseIds[0]);
    if (firstEx) {
      startW(firstEx);
    }
  };

  // Mesocycle Template Functions
  const saveMesocycleTemplate = (template: Omit<MesocycleTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: MesocycleTemplate = {
      ...template,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setMesocycleTemplates([...mesocycleTemplates, newTemplate]);
  };

  const updateMesocycleTemplate = (id: string, updates: Partial<MesocycleTemplate>) => {
    setMesocycleTemplates(mesocycleTemplates.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  const deleteMesocycleTemplate = (id: string) => {
    setMesocycleTemplates(mesocycleTemplates.filter(t => t.id !== id));
    if (activeTemplateId === id) {
      setActiveTemplateId(null);
    }
  };

  const applyMesocycleTemplate = (templateId: string) => {
    const template = mesocycleTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    setActiveTemplateId(templateId);
    // Reset completed weeks when applying new template
    setCompletedWeeks([]);
    setActiveDay(0);
    setSelWeek(1);
    alert(`Šablona "${template.name}" byla aplikována! Začínáš s týdnem 1.`);
  };

  const getActiveMesocycle = (): { weeks: WeekConfig[], currentWeek: number } => {
    const template = mesocycleTemplates.find(t => t.id === activeTemplateId);
    if (template) {
      return { weeks: template.weeks, currentWeek: currentWeek };
    }
    // Fallback to default if no template active
    return { 
      weeks: MESOCYCLE.map((m, i) => ({
        weekNumber: i + 1,
        phase: m.type,
        description: m.description,
        days: MESO_DAYS.map((d, idx) => ({
          dayIndex: idx,
          dayName: d.day,
          workout: d.workout,
          exerciseIds: [],
          isRestDay: d.workout.includes('Odpočinek')
        }))
      })),
      currentWeek: currentWeek
    };
  };
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
  const addMeal = () => { 
    if (!mName.trim() || !mCals) return; 
    const newMeal = { id: Date.now().toString(), date: new Date().toISOString(), name: mName, calories: parseInt(mCals) || 0, protein: parseInt(mPro) || 0, carbs: parseInt(mCarb) || 0, fat: parseInt(mFat) || 0 };
    setMeals([newMeal, ...meals]); 
    
    // Auto-save to savedMeals if not already exists
    const exists = savedMeals.some(m => m.name.toLowerCase() === mName.trim().toLowerCase());
    if (!exists) {
      const savedMeal: SavedMeal = { 
        id: (Date.now() + 1).toString(), 
        name: mName, 
        calories: parseInt(mCals) || 0, 
        protein: parseInt(mPro) || 0, 
        carbs: parseInt(mCarb) || 0, 
        fat: parseInt(mFat) || 0 
      };
      setSavedMeals([...savedMeals, savedMeal]);
    }
    
    setMName(''); setMCals(''); setMPro(''); setMCarb(''); setMFat(''); 
  };
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
    const { weeks } = getActiveMesocycle();
    const currentWeekConfig = weeks.find(w => w.weekNumber === currentWeek);
    
    if (currentWeekConfig) {
      const dayConfig = currentWeekConfig.days[day];
      if (dayConfig && !dayConfig.isRestDay && dayConfig.exerciseIds.length > 0) {
        // Return exercise names from IDs
        return dayConfig.exerciseIds
          .map(id => exercisesList.find(ex => ex.id === id)?.name)
          .filter(Boolean) as string[];
      }
    }
    
    // Fallback to old system
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
    <div style={{ minHeight: '100vh', background: 'var(--ios-bg)', paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 'calc(88px + env(safe-area-inset-bottom))', paddingLeft: '16px', paddingRight: '16px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header with Dark Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <h1 style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '0.01em' }}>Fit Tracker</h1>
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="touch-feedback"
            style={{ background: 'var(--ios-bg-secondary)', border: 'none', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', fontSize: '20px', minWidth: '48px', minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <p style={{ color: 'var(--ios-label-tertiary)', fontSize: '15px', marginBottom: '16px' }}>{new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

        {/* Weekly Summary Widget */}
        {view === 'workout' && (() => {
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
          
          const thisWeekWorkouts = wHist.filter(w => {
            const workoutDate = new Date(w.date);
            return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
          });
          
          const uniqueDays = new Set(thisWeekWorkouts.map(w => new Date(w.date).toDateString())).size;
          const targetDays = 5; // 5 workouts per week
          
          return (
            <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--ios-label-tertiary)', marginBottom: '4px', fontWeight: 500 }}>Tento týden</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>
                  <span style={{ color: uniqueDays >= targetDays ? 'var(--ios-green)' : 'var(--ios-label)' }}>{uniqueDays}</span>
                  <span style={{ color: 'var(--ios-label-tertiary)', fontSize: '17px' }}>/{targetDays}</span>
                  <span style={{ fontSize: '17px', marginLeft: '8px' }}>tréninků</span>
                </div>
              </div>
              <div style={{ fontSize: '40px' }}>{uniqueDays >= targetDays ? '🔥' : '💪'}</div>
            </div>
          );
        })()}

        <div className="ios-glass" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: '0.5px solid var(--ios-separator)', paddingTop: '8px', paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', paddingLeft: '4px', paddingRight: '4px', display: 'flex', justifyContent: 'space-around', zIndex: 100 }}>
          {
          [
            { k: 'workout', l: 'Trénink', i: '🏋️' }, 
            { k: 'templates', l: 'Plány', i: '📋' }, 
            { k: 'weight', l: 'Hmotnost', i: '⚖️' }, 
            { k: 'food', l: 'Kalorie', i: '🍎' }, 
            { k: 'archive', l: 'Archiv', i: '📚' }
          ].map(t => (
            <button key={t.k} onClick={() => setView(t.k as any)} className="touch-feedback" style={{ background: 'none', border: 'none', color: view === t.k ? 'var(--ios-green)' : 'var(--ios-label-tertiary)', cursor: 'pointer', fontSize: '10px', fontWeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px 8px', minWidth: '50px', flex: 1, transition: 'all 0.2s ease' }}>
              <span style={{ fontSize: '24px' }}>{t.i}</span>{t.l}
            </button>
          ))}
        </div>

        {view === 'workout' && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
              {MESOCYCLE.map(m => (
                <button key={m.week} onClick={() => setSelWeek(selWeek === m.week ? null : m.week)} className="touch-feedback" style={{ background: m.week === currentWeek ? 'var(--ios-green)' : 'var(--ios-bg-secondary)', border: 'none', borderRadius: '12px', padding: '10px 18px', color: m.week === currentWeek ? '#000' : 'var(--ios-label-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '15px', whiteSpace: 'nowrap', minWidth: '50px', transition: 'all 0.2s ease' }}>
                  {m.week}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--ios-label-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 600 }}>Týden {currentWeek} · {MESOCYCLE[currentWeek - 1].type}</h3>
              
              {/* Plánované cviky pro dnešní den */}
              {dayExercises.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>Dnes na plánu</div>
                  {dayExercises.map((exName, i) => {
                    const ex = exercisesList.find(e => e.name === exName) || exercisesList.find(e => e.name.toLowerCase().includes(exName.toLowerCase()));
                    const isCompleted = todayCompleted.some(c => c?.name.toLowerCase() === exName.toLowerCase());
                    return (
                      <div key={i} style={{ marginBottom: '8px' }}>
                        <button onClick={() => ex && startW(ex)} className="touch-feedback" style={{ width: '100%', background: 'var(--ios-bg-secondary)', border: 'none', borderRadius: '14px', padding: '18px 20px', cursor: ex ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: ex ? 1 : 0.5, color: 'var(--ios-label)', fontSize: '17px', minHeight: '56px', transition: 'all 0.2s ease' }}>
                          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>{exName} {isCompleted && <span style={{ color: 'var(--ios-green)' }}>✓</span>}</span>
                          <span style={{ color: isCompleted ? 'var(--ios-green)' : 'var(--ios-label-tertiary)', fontSize: '15px', fontWeight: 500 }}>{ex ? getLast(ex.id)?.sets[0]?.weight || '–' : '?'} kg</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cviky podle kategorií - Collapsible + Progressive Overload Tips */}
              {['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'CUSTOM'].map(cat => {
                const catExercises = exercisesList.filter(ex => ex.category === cat);
                if (catExercises.length === 0) return null;
                const isCollapsed = collapsedCategories.has(cat);
                return (
                  <div key={cat} style={{ marginBottom: '16px' }}>
                    <button 
                      onClick={() => toggleCategory(cat)} 
                      className="touch-feedback"
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', marginBottom: isCollapsed ? '0' : '8px' }}
                    >
                      <div style={{ color: 'var(--ios-label-secondary)', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{CATEGORY_EMOJI[cat]}</span>
                        <span>{CATEGORY_NAMES[cat]}</span>
                        <span style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', fontWeight: 400 }}>({catExercises.length})</span>
                      </div>
                      <span style={{ color: 'var(--ios-label-tertiary)', fontSize: '20px', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>⌄</span>
                    </button>
                    {!isCollapsed && catExercises.map(ex => {
                      const isCompleted = todayCompleted.some(c => c?.name.toLowerCase() === ex.name.toLowerCase());
                      const lastLog = getLast(ex.id);
                      const suggestion = getProgressSuggestion(lastLog);
                      return (
                        <div key={ex.id} style={{ marginBottom: '8px' }}>
                          <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '14px', overflow: 'hidden' }}>
                            <button onClick={() => startW(ex)} className="touch-feedback" style={{ width: '100%', background: 'transparent', border: 'none', padding: '18px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ios-label)', fontSize: '17px', transition: 'all 0.2s ease' }}>
                              <div style={{ flex: 1, textAlign: 'left' }}>
                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  {ex.name} 
                                  {isCompleted && <span style={{ color: 'var(--ios-green)' }}>✓</span>}
                                </div>
                                {suggestion.type !== 'none' && (
                                  <div style={{ fontSize: '13px', color: 'var(--ios-green)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>🔼</span>
                                    <span>{suggestion.text}</span>
                                  </div>
                                )}
                              </div>
                              <span style={{ color: isCompleted ? 'var(--ios-green)' : 'var(--ios-label-tertiary)', fontSize: '15px', fontWeight: 500 }}>{lastLog?.sets[0]?.weight || '–'} kg</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              
              <button onClick={() => setShowAddExercise(true)} className="touch-feedback" style={{ width: '100%', background: 'var(--ios-bg-secondary)', border: '1px dashed var(--ios-separator)', borderRadius: '14px', padding: '18px', color: 'var(--ios-blue)', fontSize: '17px', cursor: 'pointer', fontWeight: 600, minHeight: '56px', transition: 'all 0.2s ease' }}>+ Přidat cvik</button>
            </div>

            {/* Workout Templates */}
            <div style={{ marginBottom: '24px' }}>
              {workoutTemplates.length > 0 && (
                <>
                  <h3 style={{ color: 'var(--ios-label-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 600 }}>🏃 Šablony tréninků</h3>
                  <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
                    {workoutTemplates.map((template, idx) => (
                      <div key={template.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: idx < workoutTemplates.length - 1 ? '0.5px solid var(--ios-separator)' : 'none' }}>
                        <button 
                          onClick={() => {
                            // Start workout with first exercise from template
                            const firstExId = template.exerciseIds[0];
                            const firstEx = exercisesList.find(ex => ex.id === firstExId);
                            if (firstEx) startW(firstEx);
                          }}
                          className="touch-feedback"
                          style={{ flex: 1, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '17px', marginBottom: '4px', color: 'var(--ios-label)' }}>{template.name}</div>
                          <div style={{ fontSize: '13px', color: 'var(--ios-label-secondary)' }}>
                            {template.exerciseIds.map(id => exercisesList.find(ex => ex.id === id)?.name).filter(Boolean).join(', ')}
                          </div>
                        </button>
                        <button 
                          onClick={() => deleteTemplate(template.id)} 
                          className="touch-feedback"
                          style={{ background: 'none', border: 'none', color: 'var(--ios-red)', cursor: 'pointer', fontSize: '20px', marginLeft: '12px', padding: '8px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <button 
                onClick={() => {
                  setShowCreateTemplate(true);
                  setSelectedExercisesForTemplate(new Set(dayExercises.map(name => exercisesList.find(ex => ex.name === name)?.id).filter(Boolean) as string[]));
                }} 
                className="touch-feedback" 
                style={{ width: '100%', background: 'var(--ios-bg-secondary)', border: '1px dashed var(--ios-separator)', borderRadius: '14px', padding: '16px', color: 'var(--ios-blue)', fontSize: '15px', cursor: 'pointer', fontWeight: 600, minHeight: '50px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span>💾</span>
                <span>Vytvořit šablonu</span>
              </button>
            </div>

            {/* Collapsible Weekly Plan */}
            <div style={{ marginBottom: '24px' }}>
              <button onClick={() => setShowWeeklyPlan(!showWeeklyPlan)} className="touch-feedback" style={{ width: '100%', background: 'var(--ios-bg-secondary)', border: 'none', borderRadius: '14px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                <span style={{ color: 'var(--ios-label)', fontSize: '17px', fontWeight: 600 }}>Plán týdne</span>
                <span style={{ color: 'var(--ios-label-tertiary)', fontSize: '20px', transform: showWeeklyPlan ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>⌄</span>
              </button>
              {showWeeklyPlan && (
                <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '14px', overflow: 'hidden', marginTop: '8px' }}>
                  {MESO_DAYS.map((d, idx) => (
                    <div key={d.day} onClick={() => setActiveDay(idx)} className="touch-feedback" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', borderBottom: idx < MESO_DAYS.length - 1 ? '0.5px solid var(--ios-separator)' : 'none', cursor: 'pointer', background: idx === activeDay ? 'var(--ios-bg-tertiary)' : 'transparent', transition: 'background 0.2s ease' }}>
                      <span style={{ color: idx === activeDay ? 'var(--ios-green)' : 'var(--ios-label)', fontSize: '17px', fontWeight: idx === activeDay ? 600 : 400 }}>{d.day}</span>
                      <span style={{ color: d.workout.includes('DELOAD') ? 'var(--ios-orange)' : 'var(--ios-label-secondary)', fontSize: '17px' }}>{d.workout}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === 'weight' && (
          <div>
            {/* Current Weight Card */}
            <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>Aktuální hmotnost</div>
              <div style={{ fontSize: '56px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {lastWg > 0 ? lastWg : '––'}
                <span style={{ fontSize: '22px', color: 'var(--ios-label-secondary)', marginLeft: '4px', fontWeight: 600 }}>kg</span>
              </div>
              {weightData.trend !== 0 && (
                <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: weightData.trend > 0 ? 'rgba(255, 69, 58, 0.15)' : 'rgba(48, 209, 88, 0.15)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '17px' }}>{weightData.trend > 0 ? '↑' : '↓'}</span>
                  <span style={{ color: weightData.trend > 0 ? 'var(--ios-red)' : 'var(--ios-green)', fontSize: '15px', fontWeight: 600 }}>
                    {Math.abs(weightData.trend).toFixed(1)} kg
                  </span>
                  <span style={{ color: 'var(--ios-label-secondary)', fontSize: '15px' }}>
                    · {weightPeriod === 'week' ? '7 dní' : weightPeriod === 'month' ? '30 dní' : 'rok'}
                  </span>
                </div>
              )}
            </div>

            {/* Weight Goal Card */}
            <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', fontWeight: 500 }}>Cílová hmotnost</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    value={weightGoal} 
                    onChange={e => setWeightGoal(parseFloat(e.target.value) || 85)} 
                    style={{ background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'var(--ios-green)', fontSize: '17px', width: '70px', textAlign: 'center', fontWeight: 600, outline: 'none' }} 
                  />
                  <span style={{ color: 'var(--ios-label-secondary)', fontSize: '15px' }}>kg</span>
                </div>
              </div>
              <div style={{ background: 'var(--ios-bg-tertiary)', borderRadius: '12px', height: '16px', overflow: 'hidden' }}>
                <div style={{ 
                  width: lastWg > 0 ? `${Math.min(100, Math.max(0, (lastWg / weightGoal) * 100))}%` : '0%', 
                  height: '100%', 
                  background: lastWg >= weightGoal ? 'var(--ios-green)' : 'var(--ios-orange)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ marginTop: '12px', fontSize: '15px', color: 'var(--ios-label-secondary)' }}>
                {lastWg > 0 ? (lastWg >= weightGoal ? '✓ Cíl dosažen!' : `${(weightGoal - lastWg).toFixed(1)} kg do cíle`) : 'Zadejte hmotnost'}
              </div>
            </div>

            {/* Period Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['week', 'month', 'year'] as const).map(p => (
                <button key={p} onClick={() => setWeightPeriod(p)} className="touch-feedback" style={{ flex: 1, background: weightPeriod === p ? 'var(--ios-green)' : 'var(--ios-bg-secondary)', border: 'none', borderRadius: '12px', padding: '12px', color: weightPeriod === p ? '#000' : 'var(--ios-label)', fontWeight: 600, cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s ease' }}>
                  {p === 'week' ? '7 dní' : p === 'month' ? '30 dní' : 'Rok'}
                </button>
              ))}
            </div>

            {/* Graph */}
            {weightData.data.length >= 2 ? (
              <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ height: '180px', position: 'relative', marginBottom: '16px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ios-label-tertiary)', fontWeight: 500 }}>
                    <span>{Math.max(...weightData.data.map(w => w.weight)) + 2}</span>
                    <span>{Math.min(...weightData.data.map(w => w.weight)) - 2}</span>
                  </div>
                  <div style={{ marginLeft: '40px', height: '100%', position: 'relative', borderBottom: '1px solid var(--ios-separator)' }}>
                    {weightData.data.map((w, i) => {
                      const minW = Math.min(...weightData.data.map(w => w.weight)) - 2;
                      const maxW = Math.max(...weightData.data.map(w => w.weight)) + 2;
                      const left = (i / (weightData.data.length - 1)) * 100;
                      const top = ((maxW - w.weight) / (maxW - minW)) * 100;
                      return (
                        <div key={w.id} style={{ position: 'absolute', left: left + '%', top: top + '%', width: '10px', height: '10px', background: 'var(--ios-green)', borderRadius: '50%', transform: 'translate(-50%, 50%)', border: '2px solid var(--ios-bg-secondary)' }} title={w.weight + ' kg - ' + fmtD(w.date)} />
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ios-label-secondary)' }}>
                  <span>{weightData.data[0] ? fmtD(weightData.data[0].date) : '–'}</span>
                  <span style={{ fontWeight: 600 }}>Ø {weightData.avg.toFixed(1)} kg</span>
                  <span>{weightData.data[weightData.data.length - 1] ? fmtD(weightData.data[weightData.data.length - 1].date) : '–'}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '48px 24px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '15px' }}>Potřebuješ alespoň 2 záznamy pro graf</div>
              </div>
            )}

            {/* Add Weight Input */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input 
                value={newWght} 
                onChange={e => setNewWght(e.target.value)} 
                placeholder="Hmotnost (kg)" 
                inputMode="decimal"
                style={{ flex: 1, background: 'var(--ios-bg-secondary)', border: 'none', borderRadius: '14px', padding: '18px 20px', color: 'var(--ios-label)', fontSize: '17px', outline: 'none', minHeight: '56px' }} 
              />
              <button onClick={addWght} className="touch-feedback" style={{ background: 'var(--ios-green)', border: 'none', borderRadius: '14px', padding: '18px 24px', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: '20px', minWidth: '64px', minHeight: '56px', transition: 'all 0.2s ease' }}>+</button>
            </div>

            {/* History */}
            <h3 style={{ color: 'var(--ios-label-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 600 }}>Historie</h3>
            <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '14px', overflow: 'hidden' }}>
              {wght.slice(0, 10).map((e, idx) => (
                <div key={e.id} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < Math.min(9, wght.length - 1) ? '0.5px solid var(--ios-separator)' : 'none' }}>
                  <span style={{ color: 'var(--ios-label-secondary)', fontSize: '15px' }}>{fmt(e.date)}</span>
                  <span style={{ fontWeight: 600, fontSize: '17px' }}>{e.weight} kg</span>
                </div>
              ))}
              {wght.length === 0 && (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--ios-label-tertiary)' }}>
                  Zatím žádné záznamy
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'archive' && (
          <div>
            <h3 style={{ color: 'var(--ios-label-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 600 }}>Archiv tréninků</h3>
            {wHist.length === 0 ? (
              <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏋️</div>
                <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '15px' }}>Zatím žádné tréninky</div>
              </div>
            ) : (
              <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '14px', overflow: 'hidden' }}>
                {wHist.slice(0, 30).map((w, idx) => {
                  const ex = exercisesList.find(e => e.id === w.exerciseId);
                  if (!ex) return null;
                  const date = new Date(w.date);
                  const totalSets = w.sets.length;
                  const completedSets = w.sets.filter(s => s.completed).length;
                  const maxWeight = Math.max(...w.sets.map(s => s.weight));
                  return (
                    <div key={w.id} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < Math.min(29, wHist.length - 1) ? '0.5px solid var(--ios-separator)' : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '17px', marginBottom: '4px' }}>{ex.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--ios-label-secondary)' }}>
                          {date.toLocaleDateString('cs-CZ', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--ios-green)', fontWeight: 600, fontSize: '17px' }}>{maxWeight} kg</div>
                        <div style={{ fontSize: '13px', color: 'var(--ios-label-tertiary)' }}>{completedSets}/{totalSets} setů</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'food' && (
          <div>
            {/* Daily Calories Card */}
            <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', fontWeight: 500 }}>Denní cíl</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    value={calorieGoal} 
                    onChange={e => setCalorieGoal(parseInt(e.target.value) || 2500)} 
                    style={{ background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'var(--ios-green)', fontSize: '17px', width: '80px', textAlign: 'center', fontWeight: 600, outline: 'none' }} 
                  />
                  <span style={{ color: 'var(--ios-label-secondary)', fontSize: '15px' }}>kcal</span>
                </div>
              </div>
              <div style={{ background: 'var(--ios-bg-tertiary)', borderRadius: '12px', height: '16px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ 
                  width: `${Math.min(100, Math.max(0, (tdTot.calories / calorieGoal) * 100))}%`, 
                  height: '100%', 
                  background: tdTot.calories >= calorieGoal ? 'var(--ios-green)' : 'var(--ios-orange)',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ fontSize: '48px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.02em' }}>
                {tdTot.calories}<span style={{ fontSize: '20px', color: 'var(--ios-label-tertiary)', marginLeft: '4px', fontWeight: 600 }}>/ {calorieGoal}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '4px' }}>Bílkoviny</div>
                  <div style={{ color: 'var(--ios-red)', fontWeight: 700, fontSize: '20px' }}>{tdTot.protein}g</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '4px' }}>Sacharidy</div>
                  <div style={{ color: 'var(--ios-blue)', fontWeight: 700, fontSize: '20px' }}>{tdTot.carbs}g</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '4px' }}>Tuky</div>
                  <div style={{ color: 'var(--ios-orange)', fontWeight: 700, fontSize: '20px' }}>{tdTot.fat}g</div>
                </div>
              </div>
            </div>

            {/* Period Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['week', 'month', 'year'] as const).map(p => (
                <button key={p} onClick={() => setFoodPeriod(p)} className="touch-feedback" style={{ flex: 1, background: foodPeriod === p ? 'var(--ios-green)' : 'var(--ios-bg-secondary)', border: 'none', borderRadius: '12px', padding: '12px', color: foodPeriod === p ? '#000' : 'var(--ios-label)', fontWeight: 600, cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s ease' }}>
                  {p === 'week' ? '7 dní' : p === 'month' ? '30 dní' : 'Rok'}
                </button>
              ))}
            </div>

            {/* Calorie Graph */}
            {calorieData.data.length >= 2 ? (
              <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ height: '180px', position: 'relative', marginBottom: '16px' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '44px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ios-label-tertiary)', fontWeight: 500 }}>
                    <span>{Math.max(...calorieData.data.map(d => d.calories), calorieGoal) + 200}</span>
                    <span style={{ color: 'var(--ios-green)' }}>{calorieGoal}</span>
                    <span>0</span>
                  </div>
                  <div style={{ marginLeft: '48px', height: '100%', position: 'relative', borderBottom: '1px solid var(--ios-separator)' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${100 - (calorieGoal / (Math.max(...calorieData.data.map(d => d.calories), calorieGoal) + 200)) * 100}%`, height: '1px', background: 'var(--ios-green)', opacity: 0.3 }} />
                    {calorieData.data.map((d, i) => {
                      const maxCal = Math.max(...calorieData.data.map(d => d.calories), calorieGoal) + 200;
                      const left = (i / (calorieData.data.length - 1)) * 100;
                      const top = ((maxCal - d.calories) / maxCal) * 100;
                      return (
                        <div key={i} style={{ position: 'absolute', left: left + '%', top: top + '%', width: '10px', height: '10px', background: d.calories >= calorieGoal ? 'var(--ios-green)' : 'var(--ios-orange)', borderRadius: '50%', transform: 'translate(-50%, 50%)', border: '2px solid var(--ios-bg-secondary)' }} title={d.calories + ' kcal - ' + fmtD(d.date)} />
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--ios-label-secondary)' }}>
                  <span>{calorieData.data[0] ? fmtD(calorieData.data[0].date) : '–'}</span>
                  <span style={{ fontWeight: 600 }}>Ø {calorieData.avg.toFixed(0)} kcal</span>
                  <span>{calorieData.data[calorieData.data.length - 1] ? fmtD(calorieData.data[calorieData.data.length - 1].date) : '–'}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '48px 24px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '15px' }}>Potřebuješ alespoň 2 dny s jídly pro graf</div>
              </div>
            )}

            {/* Saved Meals */}
            {savedMeals.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--ios-label-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 600 }}>Uložená jídla</h3>
                <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '14px', overflow: 'hidden' }}>
                  {savedMeals.map((m, idx) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: idx < savedMeals.length - 1 ? '0.5px solid var(--ios-separator)' : 'none' }}>
                      <div onClick={() => usePresetMeal(m)} className="touch-feedback" style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '17px' }}>{m.name}</div>
                        <div style={{ fontSize: '13px', color: 'var(--ios-label-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--ios-green)' }}>{m.calories} kcal</span>
                          <span>•</span>
                          <span style={{ color: 'var(--ios-red)' }}>{m.protein}g B</span>
                          <span>•</span>
                          <span style={{ color: 'var(--ios-blue)' }}>{m.carbs}g S</span>
                          <span>•</span>
                          <span style={{ color: 'var(--ios-orange)' }}>{m.fat}g T</span>
                        </div>
                      </div>
                      <button onClick={() => delSavedMeal(m.id)} className="touch-feedback" style={{ background: 'none', border: 'none', color: 'var(--ios-label-tertiary)', cursor: 'pointer', fontSize: '24px', marginLeft: '12px', padding: '8px' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Meal Form */}
            <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', fontWeight: 500 }}>Přidat jídlo</div>
                <button
                  onClick={() => setShowBarcodeScanner(true)}
                  className="touch-feedback"
                  style={{
                    background: 'var(--ios-blue)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📷 Naskenovat
                </button>
              </div>
              <input 
                value={mName} 
                onChange={e => setMName(e.target.value)} 
                placeholder="Název jídla" 
                style={{ width: '100%', background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '12px', padding: '16px', color: 'var(--ios-label)', fontSize: '17px', marginBottom: '12px', outline: 'none' }} 
              />
              
              {/* Macros Grid with Labels */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {/* Kalorie */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--ios-label-tertiary)', marginBottom: '6px', fontWeight: 500 }}>
                    Kalorie
                  </label>
                  <input 
                    value={mCals} 
                    onChange={e => setMCals(e.target.value)} 
                    placeholder="0" 
                    inputMode="numeric" 
                    style={{ 
                      width: '100%',
                      background: 'var(--ios-bg-tertiary)', 
                      border: 'none', 
                      borderRadius: '10px', 
                      padding: '14px 12px', 
                      color: 'var(--ios-green)', 
                      fontSize: '17px', 
                      textAlign: 'center', 
                      fontWeight: 600, 
                      outline: 'none' 
                    }} 
                  />
                </div>
                
                {/* Bílkoviny */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--ios-label-tertiary)', marginBottom: '6px', fontWeight: 500 }}>
                    B
                  </label>
                  <input 
                    value={mPro} 
                    onChange={e => setMPro(e.target.value)} 
                    placeholder="0" 
                    inputMode="numeric" 
                    style={{ 
                      width: '100%',
                      background: 'var(--ios-bg-tertiary)', 
                      border: 'none', 
                      borderRadius: '10px', 
                      padding: '14px 8px', 
                      color: 'var(--ios-red)', 
                      fontSize: '17px', 
                      textAlign: 'center', 
                      fontWeight: 600, 
                      outline: 'none' 
                    }} 
                  />
                </div>
                
                {/* Sacharidy */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--ios-label-tertiary)', marginBottom: '6px', fontWeight: 500 }}>
                    S
                  </label>
                  <input 
                    value={mCarb} 
                    onChange={e => setMCarb(e.target.value)} 
                    placeholder="0" 
                    inputMode="numeric" 
                    style={{ 
                      width: '100%',
                      background: 'var(--ios-bg-tertiary)', 
                      border: 'none', 
                      borderRadius: '10px', 
                      padding: '14px 8px', 
                      color: 'var(--ios-blue)', 
                      fontSize: '17px', 
                      textAlign: 'center', 
                      fontWeight: 600, 
                      outline: 'none' 
                    }} 
                  />
                </div>
                
                {/* Tuky */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--ios-label-tertiary)', marginBottom: '6px', fontWeight: 500 }}>
                    T
                  </label>
                  <input 
                    value={mFat} 
                    onChange={e => setMFat(e.target.value)} 
                    placeholder="0" 
                    inputMode="numeric" 
                    style={{ 
                      width: '100%',
                      background: 'var(--ios-bg-tertiary)', 
                      border: 'none', 
                      borderRadius: '10px', 
                      padding: '14px 8px', 
                      color: 'var(--ios-orange)', 
                      fontSize: '17px', 
                      textAlign: 'center', 
                      fontWeight: 600, 
                      outline: 'none' 
                    }} 
                  />
                </div>
              </div>
              
              <button onClick={addMeal} className="touch-feedback" style={{ width: '100%', background: 'var(--ios-green)', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: '17px', minHeight: '50px', transition: 'all 0.2s ease' }}>
                Přidat a uložit
              </button>
            </div>

            {/* Today's Meals */}
            <h3 style={{ color: 'var(--ios-label-secondary)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 600 }}>Dnes</h3>
            {tdMls.length > 0 ? (
              <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '14px', overflow: 'hidden' }}>
                {tdMls.map((m, idx) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: idx < tdMls.length - 1 ? '0.5px solid var(--ios-separator)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '17px' }}>{m.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--ios-label-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--ios-green)' }}>{m.calories} kcal</span>
                        <span>•</span>
                        <span style={{ color: 'var(--ios-red)' }}>{m.protein}g B</span>
                        <span>•</span>
                        <span style={{ color: 'var(--ios-blue)' }}>{m.carbs}g S</span>
                        <span>•</span>
                        <span style={{ color: 'var(--ios-orange)' }}>{m.fat}g T</span>
                      </div>
                    </div>
                    <button onClick={() => delMeal(m.id)} className="touch-feedback" style={{ background: 'none', border: 'none', color: 'var(--ios-label-tertiary)', cursor: 'pointer', fontSize: '24px', marginLeft: '12px', padding: '8px' }}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: 'var(--ios-bg-secondary)', borderRadius: '14px', padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍽️</div>
                <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '15px' }}>Zatím žádná jídla</div>
              </div>
            )}
          </div>
        )}

        {/* Create Template Modal */}
        {showCreateTemplate && (
          <div onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateTemplate(false); setNewTemplateName(''); setSelectedExercisesForTemplate(new Set()); }}} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'var(--ios-bg-secondary)', borderTopLeftRadius: '22px', borderTopRightRadius: '22px', padding: '24px', maxWidth: '600px', width: '100%', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', maxHeight: '80vh', overflow: 'auto' }}>
              <div style={{ width: '36px', height: '5px', background: 'var(--ios-separator)', borderRadius: '3px', margin: '0 auto 20px' }}></div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>Nová šablona</h3>
              <input 
                value={newTemplateName} 
                onChange={e => setNewTemplateName(e.target.value)} 
                placeholder="Název šablony (např. Push Day)" 
                style={{ width: '100%', background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '12px', padding: '16px', color: 'var(--ios-label)', fontSize: '17px', marginBottom: '20px', outline: 'none' }} 
              />
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '12px', fontWeight: 500 }}>Vyber cviky pro šablonu:</label>
                <div style={{ background: 'var(--ios-bg-tertiary)', borderRadius: '14px', overflow: 'hidden' }}>
                  {exercisesList.filter(ex => ex.category !== 'CUSTOM').map((ex, idx) => (
                    <div 
                      key={ex.id} 
                      onClick={() => {
                        const newSelected = new Set(selectedExercisesForTemplate);
                        if (newSelected.has(ex.id)) {
                          newSelected.delete(ex.id);
                        } else {
                          newSelected.add(ex.id);
                        }
                        setSelectedExercisesForTemplate(newSelected);
                      }}
                      className="touch-feedback"
                      style={{ padding: '16px 20px', borderBottom: idx < exercisesList.filter(ex => ex.category !== 'CUSTOM').length - 1 ? '0.5px solid var(--ios-separator)' : 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span style={{ color: 'var(--ios-label)', fontSize: '17px' }}>{ex.name}</span>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${selectedExercisesForTemplate.has(ex.id) ? 'var(--ios-green)' : 'var(--ios-separator)'}`, background: selectedExercisesForTemplate.has(ex.id) ? 'var(--ios-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '14px' }}>
                        {selectedExercisesForTemplate.has(ex.id) && '✓'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => {
                  if (newTemplateName.trim() && selectedExercisesForTemplate.size > 0) {
                    saveAsTemplate(newTemplateName.trim(), Array.from(selectedExercisesForTemplate));
                    setNewTemplateName('');
                    setSelectedExercisesForTemplate(new Set());
                    setShowCreateTemplate(false);
                  }
                }} 
                className="touch-feedback"
                style={{ width: '100%', background: 'var(--ios-green)', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontSize: '17px', fontWeight: 600, cursor: 'pointer', minHeight: '50px' }}
              >
                Uložit šablonu
              </button>
            </div>
          </div>
        )}

        {showAddExercise && (
          <div onClick={(e) => { if (e.target === e.currentTarget) { setShowAddExercise(false); setNewExName(''); setNewExCategory('CUSTOM'); }}} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ background: 'var(--ios-bg-secondary)', borderTopLeftRadius: '22px', borderTopRightRadius: '22px', padding: '24px', maxWidth: '600px', width: '100%', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
              <div style={{ width: '36px', height: '5px', background: 'var(--ios-separator)', borderRadius: '3px', margin: '0 auto 20px' }}></div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>Přidat cvik</h3>
              <input 
                value={newExName} 
                onChange={e => setNewExName(e.target.value)} 
                placeholder="Název cviku" 
                style={{ width: '100%', background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '12px', padding: '16px', color: 'var(--ios-label)', fontSize: '17px', marginBottom: '12px', outline: 'none' }} 
              />
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>Svalová partie</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'BICEPS', 'TRICEPS'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setNewExCategory(cat)}
                      className="touch-feedback"
                      style={{ background: newExCategory === cat ? 'var(--ios-green)' : 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '10px', padding: '12px', color: newExCategory === cat ? '#000' : 'var(--ios-label)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                    >
                      <span>{CATEGORY_EMOJI[cat]}</span>
                      <span>{CATEGORY_NAMES[cat]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => {
                  if (newExName.trim()) {
                    const newEx: Exercise = {
                      id: Date.now().toString(),
                      name: newExName.trim(),
                      category: newExCategory
                    };
                    setExercisesList([...exercisesList, newEx]);
                    setNewExName('');
                    setNewExCategory('CUSTOM');
                    setShowAddExercise(false);
                  }
                }} 
                className="touch-feedback"
                style={{ width: '100%', background: 'var(--ios-green)', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontSize: '17px', fontWeight: 600, cursor: 'pointer', minHeight: '50px' }}
              >
                Přidat
              </button>
            </div>
          </div>
        )}

        {selEx && curSets.length > 0 && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--ios-bg)', zIndex: 200, overflow: 'auto', paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', paddingLeft: '16px', paddingRight: '16px' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '8px' }}>
                <button onClick={() => { setSelEx(null); setCurSets([]); }} className="touch-feedback" style={{ background: 'none', border: 'none', color: 'var(--ios-blue)', cursor: 'pointer', fontSize: '17px', fontWeight: 400, padding: '8px' }}>Zpět</button>
                <h2 style={{ color: 'var(--ios-label)', fontSize: '17px', fontWeight: 600 }}>{selEx.name}</h2>
                <div style={{ width: '60px' }} />
              </div>
              {curSets.map((s, i) => (
                <div key={i} style={{ background: 'var(--ios-bg-secondary)', borderRadius: '16px', padding: '20px', marginBottom: '12px', border: s.completed ? '2px solid var(--ios-green)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ color: 'var(--ios-label-secondary)', fontSize: '15px', fontWeight: 600 }}>Set {i + 1}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <span style={{ color: s.completed ? 'var(--ios-green)' : 'var(--ios-label-tertiary)', fontSize: '15px', fontWeight: 500 }}>Hotovo</span>
                      <input type="checkbox" checked={s.completed} onChange={e => updSet(i, 'completed', e.target.checked)} style={{ width: '24px', height: '24px', accentColor: 'var(--ios-green)', cursor: 'pointer' }} />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div><label style={{ display: 'block', color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>kg</label><input type="number" inputMode="decimal" value={s.weight} onChange={e => updSet(i, 'weight', Number(e.target.value))} style={{ width: '100%', background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '10px', padding: '14px 12px', color: 'var(--ios-label)', fontSize: '20px', fontWeight: 600, textAlign: 'center', outline: 'none' }} /></div>
                    <div><label style={{ display: 'block', color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>opak.</label><input type="number" inputMode="numeric" value={s.reps} onChange={e => updSet(i, 'reps', Number(e.target.value))} style={{ width: '100%', background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '10px', padding: '14px 12px', color: 'var(--ios-label)', fontSize: '20px', fontWeight: 600, textAlign: 'center', outline: 'none' }} /></div>
                    <div><label style={{ display: 'block', color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>RIR</label><input type="number" inputMode="numeric" min="0" max="5" value={s.rir} onChange={e => updSet(i, 'rir', Number(e.target.value))} style={{ width: '100%', background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '10px', padding: '14px 12px', color: s.rir <= 2 ? 'var(--ios-green)' : s.rir <= 3 ? 'var(--ios-orange)' : 'var(--ios-red)', fontSize: '20px', fontWeight: 600, textAlign: 'center', outline: 'none' }} /></div>
                  </div>
                  {/* Exercise Note */}
                  <div>
                    <input 
                      type="text" 
                      value={s.note || ''} 
                      onChange={e => updSet(i, 'note', e.target.value)} 
                      placeholder="Poznámka (volitelné)" 
                      style={{ width: '100%', background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '10px', padding: '12px 16px', color: 'var(--ios-label)', fontSize: '15px', outline: 'none' }} 
                    />
                  </div>
                </div>
              ))}
              
              {/* Rest Timer */}
              {restTimerActive && restTimer !== null && (
                <div style={{ marginTop: '16px', marginBottom: '16px', background: 'var(--ios-bg-secondary)', borderRadius: '16px', padding: '20px', textAlign: 'center', border: '2px solid var(--ios-orange)' }}>
                  <div style={{ color: 'var(--ios-label-tertiary)', fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>Odpočinek</div>
                  <div style={{ fontSize: '48px', fontWeight: 700, color: 'var(--ios-orange)', marginBottom: '12px' }}>
                    {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => { setRestTimer(restTimer + 30); }} 
                      className="touch-feedback"
                      style={{ flex: 1, background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '10px', padding: '12px', color: 'var(--ios-label)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      +30s
                    </button>
                    <button 
                      onClick={() => { setRestTimerActive(false); setRestTimer(null); }} 
                      className="touch-feedback"
                      style={{ flex: 1, background: 'var(--ios-bg-tertiary)', border: 'none', borderRadius: '10px', padding: '12px', color: 'var(--ios-label)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

              <button onClick={finW} className="touch-feedback" style={{ width: '100%', background: 'var(--ios-green)', border: 'none', borderRadius: '14px', padding: '18px', color: '#000', fontSize: '17px', fontWeight: 600, cursor: 'pointer', marginTop: '12px', minHeight: '56px' }}>Uložit trénink</button>
            </div>
          </div>
        )}
      </div>

      {/* Mesocycle Template Manager */}
      {view === 'templates' && !showTemplateBuilder && (
        <MesocycleTemplateManager
          templates={mesocycleTemplates}
          activeTemplateId={activeTemplateId}
          onApply={applyMesocycleTemplate}
          onEdit={(template) => {
            setEditingTemplate(template);
            setShowTemplateBuilder(true);
          }}
          onDelete={deleteMesocycleTemplate}
          onCreate={() => {
            setEditingTemplate(null);
            setShowTemplateBuilder(true);
          }}
          onClose={() => setView('workout')}
        />
      )}

      {/* Mesocycle Template Builder */}
      {showTemplateBuilder && (
        <MesocycleTemplateBuilder
          exercises={exercisesList}
          initialTemplate={editingTemplate || undefined}
          onSave={(template) => {
            if (editingTemplate) {
              updateMesocycleTemplate(editingTemplate.id, template);
            } else {
              saveMesocycleTemplate(template);
            }
            setShowTemplateBuilder(false);
            setEditingTemplate(null);
            setView('templates');
          }}
          onCancel={() => {
            setShowTemplateBuilder(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Barcode Scanner */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={(foodData) => {
            setShowBarcodeScanner(false);
            setScannedFoodData(foodData);
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Food Quantity Modal */}
      {scannedFoodData && (
        <FoodQuantityModal
          foodData={scannedFoodData}
          onConfirm={(finalData) => {
            // Add meal with scanned data
            const newMeal = { 
              id: Date.now().toString(), 
              date: new Date().toISOString(), 
              name: finalData.name, 
              calories: finalData.calories, 
              protein: finalData.protein, 
              carbs: finalData.carbs, 
              fat: finalData.fat 
            };
            setMeals([newMeal, ...meals]);
            
            // Auto-save to savedMeals if not already exists
            const exists = savedMeals.some(m => m.name.toLowerCase() === finalData.name.toLowerCase());
            if (!exists) {
              const savedMeal: SavedMeal = { 
                id: (Date.now() + 1).toString(), 
                name: finalData.name, 
                calories: finalData.calories, 
                protein: finalData.protein, 
                carbs: finalData.carbs, 
                fat: finalData.fat 
              };
              setSavedMeals([...savedMeals, savedMeal]);
            }
            
            setScannedFoodData(null);
          }}
          onCancel={() => setScannedFoodData(null)}
        />
      )}
    </div>
  );
}
