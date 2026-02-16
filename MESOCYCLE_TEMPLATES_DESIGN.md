# Mesocycle Templates - Design Document

## Cíl
Umožnit uživateli vytvořit, uložit a aplikovat komplexní tréninkové plány na 5-8 týdnů včetně:
- Fáze mesocyklu (BASE/BUILD/PEAK/DELOAD)
- Nastavení cvičení pro každý den v týdnu
- Progresivní přetěžování mezi týdny
- Opakované použití šablon

## Data Structure

```typescript
interface MesocycleTemplate {
  id: string;
  name: string;
  description?: string;
  weeks: WeekConfig[];
  createdAt: string;
}

interface WeekConfig {
  weekNumber: number;
  phase: 'BASE' | 'BUILD' | 'PEAK' | 'DELOAD';
  description: string; // např. "4x10 @ 70% 1RM"
  days: DayConfig[];
}

interface DayConfig {
  dayIndex: number; // 0 = Pondělí, 6 = Neděle
  dayName: string;
  workout: string; // např. "Horní polovina"
  exerciseIds: string[]; // ID cvičení pro tento den
  isRestDay: boolean;
}
```

## UI Components

### 1. Template Manager (hlavní view)
- Seznam uložených šablon
- Tlačítko "Vytvořit novou šablonu"
- Pro každou šablonu:
  - Název + popis
  - Počet týdnů
  - Tlačítko "Aplikovat"
  - Tlačítko "Upravit"
  - Tlačítko "Smazat"

### 2. Template Builder (editor)
**Kroky:**
1. **Základní info**
   - Název šablony
   - Popis
   - Počet týdnů (5-8)

2. **Konfigurace týdnů**
   - Pro každý týden:
     - Fáze (BASE/BUILD/PEAK/DELOAD)
     - Popis (sety x opakování @ % 1RM)
     - Konfigurace 7 dnů

3. **Konfigurace dní**
   - Pro každý den:
     - Název (Pondělí, Úterý...)
     - Typ (Trénink / Odpočinek)
     - Pokud trénink: výběr cvičení z knihovny
     - Popis workout (např. "Horní polovina")

4. **Uložení**

### 3. Template Application
Když uživatel klikne "Aplikovat šablonu":
- Nastavíme aktivní mesocyklus podle šablony
- Aktualizujeme MESOCYCLE array
- Aktualizujeme WEEK_EXERCISES
- Uložíme do localStorage jako "activeTemplate"

## Features

### Quick Templates (předpřipravené)
- **PPL (Push/Pull/Legs)** - 6 týdnů
- **Upper/Lower** - 8 týdnů  
- **Full Body** - 5 týdnů
- **Strength Program** - 8 týdnů (5/3/1 style)

### Custom Templates
- Uživatel si vytvoří vlastní od základu
- Nebo zkopíruje existující a upraví

## Implementation Plan

1. Přidat TypeScript interfaces
2. Vytvořit Template Builder komponentu
3. Vytvořit Template Manager view
4. Integrovat do hlavního menu
5. Přidat quick templates jako výchozí šablony
6. Persistence do localStorage
7. Aplikace šablony na aktivní mesocyklus

## Storage Keys
- `fitTracker_mesocycleTemplates` - array všech šablon
- `fitTracker_activeTemplate` - ID aktuálně aplikované šablony
- `fitTracker_activeMesocycle` - aktivní mesocyklus (generovaný ze šablony)

## Benefits
- Dlouhodobé plánování tréninku
- Opakované použití osvědčených plánů
- Progresivní přetěžování strukturované podle fází
- Flexibilita (vlastní nebo předpřipravené šablony)
