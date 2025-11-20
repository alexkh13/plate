# Carb-First Nutrition Display Redesign Plan
**For Keto/Diabetic-Friendly User Experience**

---

## Executive Summary

This redesign prioritizes **Net Carbs** (Total Carbs - Fiber) across all nutrition displays to better serve keto and diabetic users who need to quickly assess carbohydrate content.

### Current Pattern
🔥 Calories → Protein → Carbs → Fat → Fiber

### New Pattern
🥦 Net Carbs (LARGE) → Carb Breakdown → Protein → Fat → Calories

---

## Design Principles

1. **Net Carbs First** - Most critical metric for keto/diabetic users
2. **Carb Transparency** - Always show: Total Carbs, Fiber, Sugar breakdown
3. **Color Coding** - Visual indicators for carb levels (green/yellow/red)
4. **Consistent Layout** - Same pattern across all components
5. **Quick Scanning** - Use badges, icons, and size hierarchy

---

## Color Coding System

```typescript
// Utility function to add
function getCarbBadgeColor(netCarbs: number): string {
  if (netCarbs <= 20) return 'bg-green-500'      // ✅ Keto-friendly (<20g)
  if (netCarbs <= 50) return 'bg-yellow-500'     // ⚠️ Moderate (20-50g)
  return 'bg-red-500'                             // ❌ High-carb (>50g)
}

function getCarbTextColor(netCarbs: number): string {
  if (netCarbs <= 20) return 'text-green-600'
  if (netCarbs <= 50) return 'text-yellow-600'
  return 'text-red-600'
}
```

---

## Component Redesigns

### 1. Meal List (`src/routes/meals/index.tsx`)

**File:** Lines 109-119

**Current Code:**
```tsx
<div className="flex items-center gap-2 text-zinc-400 text-sm">
  <Flame className="w-4 h-4" />
  <span>{meal.totalCalories}</span>
</div>
{meal.totalProtein > 0 && (
  <div className="text-zinc-400 text-sm">{meal.totalProtein}g protein</div>
)}
```

**New Code:**
```tsx
{/* Net Carbs Badge - PROMINENT */}
<div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white ${getCarbBadgeColor(meal.totalCarbs - (meal.totalFiber || 0))}`}>
  <span>🥦</span>
  <span>{meal.totalCarbs - (meal.totalFiber || 0)}g net carbs</span>
</div>

{/* Carb Breakdown */}
<div className="text-zinc-400 text-sm">
  {meal.totalCarbs}g carbs • {meal.totalFiber || 0}g fiber
</div>

{/* Macros */}
<div className="flex items-center gap-3 text-zinc-500 text-sm">
  <span>{meal.totalProtein}g protein</span>
  <span>•</span>
  <span>{meal.totalFat}g fat</span>
  <span>•</span>
  <span className="flex items-center gap-1">
    <Flame className="w-3 h-3" />
    {meal.totalCalories} cal
  </span>
</div>
```

---

### 2. Meal Detail (`src/routes/meals/$mealId.tsx`)

**File:** Lines 119-163

**Current Code:**
```tsx
{/* Nutrition Summary */}
<div className="grid grid-cols-2 gap-4 mb-6">
  <div className="flex items-center gap-2">
    <Flame className="w-5 h-5 text-orange-500" />
    <div>
      <div className="text-2xl font-bold">{meal.totalCalories}</div>
      <div className="text-sm text-zinc-500">calories</div>
    </div>
  </div>
  <div className="text-right">
    <div className="text-2xl font-bold">{meal.totalProtein}g</div>
    <div className="text-sm text-zinc-500">protein</div>
  </div>
  <div className="text-right">
    <div className="text-2xl font-bold">{meal.totalCarbs}g</div>
    <div className="text-sm text-zinc-500">carbs</div>
  </div>
  <div className="text-right">
    <div className="text-2xl font-bold">{meal.totalFat}g</div>
    <div className="text-sm text-zinc-500">fat</div>
  </div>
  {meal.totalFiber && meal.totalFiber > 0 && (
    <div className="text-right col-span-2">
      <div className="text-xl font-bold">{meal.totalFiber}g</div>
      <div className="text-sm text-zinc-500">fiber</div>
    </div>
  )}
</div>
```

**New Code:**
```tsx
{/* Net Carbs - HERO SECTION */}
<div className={`mb-6 p-4 rounded-xl ${getCarbBadgeColor(meal.totalCarbs - (meal.totalFiber || 0)).replace('bg-', 'bg-opacity-20 bg-')} border-2 ${getCarbBadgeColor(meal.totalCarbs - (meal.totalFiber || 0)).replace('bg-', 'border-')}`}>
  <div className="flex items-center gap-3 justify-center">
    <span className="text-3xl">🥦</span>
    <div>
      <div className={`text-4xl font-bold ${getCarbTextColor(meal.totalCarbs - (meal.totalFiber || 0))}`}>
        {meal.totalCarbs - (meal.totalFiber || 0)}g
      </div>
      <div className="text-sm font-medium text-zinc-600">Net Carbs</div>
    </div>
  </div>
</div>

{/* Carbohydrate Breakdown */}
<div className="mb-6 p-4 bg-zinc-900 rounded-lg">
  <div className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">
    Carbohydrate Breakdown
  </div>
  <div className="grid grid-cols-3 gap-4 text-center">
    <div>
      <div className="text-xl font-bold">{meal.totalCarbs}g</div>
      <div className="text-xs text-zinc-500">Total Carbs</div>
    </div>
    <div>
      <div className="text-xl font-bold">{meal.totalFiber || 0}g</div>
      <div className="text-xs text-zinc-500">Fiber</div>
    </div>
    <div>
      <div className="text-xl font-bold">{meal.totalSugar || 0}g</div>
      <div className="text-xs text-zinc-500">Sugar</div>
    </div>
  </div>
</div>

{/* Macronutrients */}
<div className="grid grid-cols-2 gap-4 mb-6">
  <div>
    <div className="text-2xl font-bold">{meal.totalProtein}g</div>
    <div className="text-sm text-zinc-500">Protein</div>
  </div>
  <div>
    <div className="text-2xl font-bold">{meal.totalFat}g</div>
    <div className="text-sm text-zinc-500">Fat</div>
  </div>
</div>

{/* Other Info */}
<div className="flex items-center justify-center gap-2 text-zinc-500">
  <Flame className="w-4 h-4" />
  <span className="text-sm">{meal.totalCalories} calories</span>
</div>
```

**Note:** Need to add `totalSugar` to Meal schema (sum of all food sugars)

---

### 3. Meal Creation Summary (`src/routes/meals/new.tsx`)

**File:** Lines 640-662

**Current Code:**
```tsx
<div className="grid grid-cols-2 gap-3 p-4 bg-zinc-900 rounded-lg">
  <div className="flex items-center gap-2">
    <Flame className="w-4 h-4 text-emerald-500" />
    <div>
      <div className="text-xs text-zinc-500">Calories</div>
      <div className="font-semibold">{totalNutrition.calories}</div>
    </div>
  </div>
  <div>
    <div className="text-xs text-zinc-500">Protein</div>
    <div className="font-semibold">{totalNutrition.protein}g</div>
  </div>
  <div>
    <div className="text-xs text-zinc-500">Carbs</div>
    <div className="font-semibold">{totalNutrition.carbs}g</div>
  </div>
  <div>
    <div className="text-xs text-zinc-500">Fat</div>
    <div className="font-semibold">{totalNutrition.fat}g</div>
  </div>
</div>
```

**New Code:**
```tsx
<div className="p-4 bg-zinc-900 rounded-lg space-y-3">
  {/* Net Carbs - Prominent */}
  <div className={`flex items-center justify-between p-3 rounded-lg ${getCarbBadgeColor(totalNutrition.carbs - (totalNutrition.fiber || 0)).replace('bg-', 'bg-opacity-20 bg-')}`}>
    <div className="flex items-center gap-2">
      <span className="text-2xl">🥦</span>
      <span className="text-xs text-zinc-400 uppercase tracking-wide">Net Carbs</span>
    </div>
    <div className={`text-2xl font-bold ${getCarbTextColor(totalNutrition.carbs - (totalNutrition.fiber || 0))}`}>
      {totalNutrition.carbs - (totalNutrition.fiber || 0)}g
    </div>
  </div>

  {/* Carb Breakdown */}
  <div className="flex items-center justify-between text-sm px-3">
    <span className="text-zinc-500">
      {totalNutrition.carbs}g carbs • {totalNutrition.fiber || 0}g fiber
      {totalNutrition.sugar > 0 && ` • ${totalNutrition.sugar}g sugar`}
    </span>
  </div>

  {/* Macros Grid */}
  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
    <div>
      <div className="text-xs text-zinc-500">Protein</div>
      <div className="font-semibold">{totalNutrition.protein}g</div>
    </div>
    <div>
      <div className="text-xs text-zinc-500">Fat</div>
      <div className="font-semibold">{totalNutrition.fat}g</div>
    </div>
  </div>

  {/* Calories - De-emphasized */}
  <div className="flex items-center justify-center gap-2 pt-2 border-t border-zinc-800 text-zinc-500">
    <Flame className="w-3 h-3" />
    <span className="text-sm">{totalNutrition.calories} cal</span>
  </div>
</div>
```

---

### 4. Food Detail - View Mode (`src/routes/foods/$foodId.tsx`)

**File:** Lines 577-656

**Current Code:**
```tsx
<div className="mb-6">
  <h2 className="text-lg font-semibold mb-4">Nutrition Facts</h2>

  <div className="space-y-2 text-sm">
    <div className="pb-2 border-b border-zinc-800">
      <span className="text-zinc-500">Serving: </span>
      <span className="font-medium">{item.servingSize} {item.servingSizeUnit}</span>
    </div>

    <div className="py-2 border-b border-zinc-800">
      <span className="text-zinc-500">Calories: </span>
      <span className="text-xl font-bold">{item.calories}</span>
    </div>

    <div className="py-2">
      <div className="font-semibold mb-2 text-zinc-400">Macronutrients</div>
      <div className="space-y-1 pl-2">
        <div>
          <span className="text-zinc-500">Protein: </span>
          <span className="font-medium">{item.protein}g</span>
        </div>
        <div>
          <span className="text-zinc-500">Carbohydrates: </span>
          <span className="font-medium">{item.carbs}g</span>
        </div>
        <div>
          <span className="text-zinc-500">Fat: </span>
          <span className="font-medium">{item.fat}g</span>
        </div>
        {item.fiber && item.fiber > 0 && (
          <div>
            <span className="text-zinc-500">Fiber: </span>
            <span className="font-medium">{item.fiber}g</span>
          </div>
        )}
        {item.sugar && item.sugar > 0 && (
          <div>
            <span className="text-zinc-500">Sugar: </span>
            <span className="font-medium">{item.sugar}g</span>
          </div>
        )}
        {item.sodium && item.sodium > 0 && (
          <div>
            <span className="text-zinc-500">Sodium: </span>
            <span className="font-medium">{item.sodium}mg</span>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
```

**New Code:**
```tsx
<div className="mb-6">
  <h2 className="text-lg font-semibold mb-4">Nutrition Facts</h2>

  <div className="space-y-3 text-sm">
    {/* Serving Size */}
    <div className="pb-3 border-b border-zinc-800">
      <span className="text-zinc-500">Serving: </span>
      <span className="font-medium">{item.servingSize} {item.servingSizeUnit}</span>
    </div>

    {/* NET CARBS - HERO */}
    <div className={`py-3 px-4 rounded-lg border-2 ${getCarbBadgeColor(item.carbs - (item.fiber || 0)).replace('bg-', 'border-')} ${getCarbBadgeColor(item.carbs - (item.fiber || 0)).replace('bg-', 'bg-opacity-10 bg-')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥦</span>
          <span className="text-xs uppercase tracking-wide text-zinc-500">Net Carbs</span>
        </div>
        <span className={`text-3xl font-bold ${getCarbTextColor(item.carbs - (item.fiber || 0))}`}>
          {item.carbs - (item.fiber || 0)}g
        </span>
      </div>
    </div>

    {/* Carbohydrate Breakdown */}
    <div className="py-3 border-b border-zinc-800">
      <div className="font-semibold mb-2 text-zinc-400 text-xs uppercase tracking-wide">
        Carbohydrate Breakdown
      </div>
      <div className="space-y-1 pl-2">
        <div>
          <span className="text-zinc-500">Total Carbs: </span>
          <span className="font-medium">{item.carbs}g</span>
        </div>
        <div>
          <span className="text-zinc-500">Fiber: </span>
          <span className="font-medium">{item.fiber || 0}g</span>
        </div>
        {item.sugar !== undefined && item.sugar > 0 && (
          <div>
            <span className="text-zinc-500">Sugar: </span>
            <span className="font-medium">{item.sugar}g</span>
          </div>
        )}
      </div>
    </div>

    {/* Macronutrients */}
    <div className="py-3 border-b border-zinc-800">
      <div className="font-semibold mb-2 text-zinc-400 text-xs uppercase tracking-wide">
        Macronutrients
      </div>
      <div className="space-y-1 pl-2">
        <div>
          <span className="text-zinc-500">Protein: </span>
          <span className="font-medium">{item.protein}g</span>
        </div>
        <div>
          <span className="text-zinc-500">Fat: </span>
          <span className="font-medium">{item.fat}g</span>
        </div>
      </div>
    </div>

    {/* Other */}
    <div className="py-3">
      <div className="font-semibold mb-2 text-zinc-400 text-xs uppercase tracking-wide">
        Other
      </div>
      <div className="space-y-1 pl-2">
        <div>
          <span className="text-zinc-500">Calories: </span>
          <span className="font-medium">{item.calories}</span>
        </div>
        {item.sodium !== undefined && item.sodium > 0 && (
          <div>
            <span className="text-zinc-500">Sodium: </span>
            <span className="font-medium">{item.sodium}mg</span>
          </div>
        )}
      </div>
    </div>
  </div>
</div>
```

---

### 5. Food Detail - Edit Mode (`src/routes/foods/$foodId.tsx`)

**File:** Lines 341-502

**Changes:**
1. Reorder input fields to prioritize carbs
2. Add real-time Net Carbs calculation display
3. Move calories input down

**New Input Order:**
```tsx
{/* Serving Size - stays at top */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium mb-2">Serving Size</label>
    <input type="number" ... />
  </div>
  <div>
    <label className="block text-sm font-medium mb-2">Unit</label>
    <input type="text" ... />
  </div>
</div>

{/* === CARBOHYDRATES SECTION === */}
<div className="p-4 bg-zinc-900 rounded-lg space-y-4">
  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
    Carbohydrates
  </h3>

  {/* Total Carbs */}
  <div>
    <label className="block text-sm font-medium mb-2">Total Carbs (g)</label>
    <input type="number" ... />
  </div>

  {/* Fiber */}
  <div>
    <label className="block text-sm font-medium mb-2">Fiber (g)</label>
    <input type="number" ... />
  </div>

  {/* Sugar */}
  <div>
    <label className="block text-sm font-medium mb-2">Sugar (g)</label>
    <input type="number" ... />
  </div>

  {/* NET CARBS DISPLAY - Calculated */}
  <div className={`p-3 rounded-lg border-2 ${getCarbBadgeColor((editData.carbs || 0) - (editData.fiber || 0)).replace('bg-', 'border-')} ${getCarbBadgeColor((editData.carbs || 0) - (editData.fiber || 0)).replace('bg-', 'bg-opacity-10 bg-')}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wide text-zinc-500">
        Net Carbs (calculated)
      </span>
      <span className={`text-xl font-bold ${getCarbTextColor((editData.carbs || 0) - (editData.fiber || 0))}`}>
        {(editData.carbs || 0) - (editData.fiber || 0)}g
      </span>
    </div>
  </div>
</div>

{/* === MACRONUTRIENTS SECTION === */}
<div className="space-y-4">
  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
    Macronutrients
  </h3>

  {/* Protein */}
  <div>
    <label className="block text-sm font-medium mb-2">Protein (g)</label>
    <input type="number" ... />
  </div>

  {/* Fat */}
  <div>
    <label className="block text-sm font-medium mb-2">Fat (g)</label>
    <input type="number" ... />
  </div>
</div>

{/* === OTHER SECTION === */}
<div className="space-y-4">
  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
    Other
  </h3>

  {/* Calories - moved down */}
  <div>
    <label className="block text-sm font-medium mb-2">Calories</label>
    <input type="number" ... />
  </div>

  {/* Sodium */}
  <div>
    <label className="block text-sm font-medium mb-2">Sodium (mg)</label>
    <input type="number" ... />
  </div>
</div>
```

---

### 6. Food AI Analyze (`src/routes/foods/ai-analyze.tsx`)

**File:** Lines 1532-1626

**Apply same reordering as Food Edit Mode** (see above)

---

### 7. Food Matcher Component (`src/components/FoodMatcher.tsx`)

**File:** Lines 62-82, 129-137

**Current Code:**
```tsx
{/* Detected food nutrition */}
<div className="text-xs text-zinc-500 mt-1">
  {detectedFood.nutrition.calories} cal • {detectedFood.nutrition.protein}g protein •
  {detectedFood.nutrition.carbs}g carbs • {detectedFood.nutrition.fat}g fat
</div>

{/* Matched food nutrition */}
<div className="text-xs text-zinc-500">
  {match.food.calories} cal • {match.food.protein}g protein •
  {match.food.carbs}g carbs • {match.food.fat}g fat
</div>
```

**New Code:**
```tsx
{/* Detected food nutrition */}
<div className="text-xs text-zinc-500 mt-1">
  <span className={`font-semibold ${getCarbTextColor(detectedFood.nutrition.carbs - (detectedFood.nutrition.fiber || 0))}`}>
    🥦 {detectedFood.nutrition.carbs - (detectedFood.nutrition.fiber || 0)}g net
  </span>
  <span className="text-zinc-600 mx-1">•</span>
  {detectedFood.nutrition.carbs}g carbs
  <span className="text-zinc-600 mx-1">•</span>
  {detectedFood.nutrition.protein}g protein
  <span className="text-zinc-600 mx-1">•</span>
  {detectedFood.nutrition.fat}g fat
  <span className="text-zinc-600 mx-1">•</span>
  {detectedFood.nutrition.calories} cal
</div>

{/* Matched food nutrition */}
<div className="text-xs text-zinc-500">
  <span className={`font-semibold ${getCarbTextColor(match.food.carbs - (match.food.fiber || 0))}`}>
    🥦 {match.food.carbs - (match.food.fiber || 0)}g net
  </span>
  <span className="text-zinc-600 mx-1">•</span>
  {match.food.carbs}g carbs
  <span className="text-zinc-600 mx-1">•</span>
  {match.food.protein}g protein
  <span className="text-zinc-600 mx-1">•</span>
  {match.food.fat}g fat
  <span className="text-zinc-600 mx-1">•</span>
  {match.food.calories} cal
</div>
```

---

### 8. Inline Food Editor (`src/components/InlineFoodItemEditor.tsx`)

**File:** Lines 156-157

**Current Code:**
```tsx
const portionCalories = Math.round(
  foodData.nutrition.calories * (foodData.portion.amount / foodData.servingSize)
);
const portionProtein = Math.round(
  foodData.nutrition.protein * (foodData.portion.amount / foodData.servingSize)
);
```

**New Code:**
```tsx
// Calculate portion-adjusted nutrition
const portionMultiplier = foodData.portion.amount / foodData.servingSize;
const portionNetCarbs = Math.round(
  (foodData.nutrition.carbs - (foodData.nutrition.fiber || 0)) * portionMultiplier
);
const portionTotalCarbs = Math.round(foodData.nutrition.carbs * portionMultiplier);
const portionFiber = Math.round((foodData.nutrition.fiber || 0) * portionMultiplier);
const portionProtein = Math.round(foodData.nutrition.protein * portionMultiplier);
const portionFat = Math.round(foodData.nutrition.fat * portionMultiplier);
const portionCalories = Math.round(foodData.nutrition.calories * portionMultiplier);

// Display them in carb-first order in the UI
```

---

### 9. Meal Calculation Updates (`src/routes/meals/new.tsx`)

**File:** Lines 287-315

**Current `calculateTotalNutrition` function:**
```typescript
const calculateTotalNutrition = () => {
  return detectedFoods.reduce(
    (total, food) => {
      const multiplier = (food.portion?.amount || 1) / food.servingSize;
      return {
        calories: total.calories + Math.round(food.nutrition.calories * multiplier),
        protein: total.protein + Math.round(food.nutrition.protein * multiplier),
        carbs: total.carbs + Math.round(food.nutrition.carbs * multiplier),
        fat: total.fat + Math.round(food.nutrition.fat * multiplier),
        fiber: total.fiber + Math.round((food.nutrition.fiber || 0) * multiplier),
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
};
```

**Add sugar tracking:**
```typescript
const calculateTotalNutrition = () => {
  return detectedFoods.reduce(
    (total, food) => {
      const multiplier = (food.portion?.amount || 1) / food.servingSize;
      return {
        calories: total.calories + Math.round(food.nutrition.calories * multiplier),
        protein: total.protein + Math.round(food.nutrition.protein * multiplier),
        carbs: total.carbs + Math.round(food.nutrition.carbs * multiplier),
        fat: total.fat + Math.round(food.nutrition.fat * multiplier),
        fiber: total.fiber + Math.round((food.nutrition.fiber || 0) * multiplier),
        sugar: total.sugar + Math.round((food.nutrition.sugar || 0) * multiplier), // NEW
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 } // NEW
  );
};
```

---

### 10. Database Schema Updates

**File:** `src/types/index.ts`

**Add to Meal Entity (after Line 69):**
```typescript
totalSugar?: number;  // Sum of all sugars from foods in meal
```

**Add to Profile Entity (after Line 14):**
```typescript
dailyNetCarbGoal?: number;   // Target for net carbs (carbs - fiber)
dailyFiberGoal?: number;      // Minimum fiber goal
```

**File:** `src/db/index.ts`

**Update Meal Schema (after Line 158):**
```typescript
totalSugar: {
  type: 'number',
  minimum: 0,
  default: 0
},
```

**Update Profile Schema (after Line 38):**
```typescript
dailyNetCarbGoal: {
  type: 'number',
  minimum: 0
},
dailyFiberGoal: {
  type: 'number',
  minimum: 0
},
```

---

### 11. Utility Functions to Add

**New File:** `src/utils/nutrition.ts`

```typescript
/**
 * Get badge background color based on net carbs amount
 * Green: <20g (keto-friendly)
 * Yellow: 20-50g (moderate)
 * Red: >50g (high-carb)
 */
export function getCarbBadgeColor(netCarbs: number): string {
  if (netCarbs <= 20) return 'bg-green-500';
  if (netCarbs <= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Get text color based on net carbs amount
 */
export function getCarbTextColor(netCarbs: number): string {
  if (netCarbs <= 20) return 'text-green-600';
  if (netCarbs <= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Calculate net carbs (total carbs - fiber)
 */
export function calculateNetCarbs(totalCarbs: number, fiber: number = 0): number {
  return Math.max(0, totalCarbs - fiber);
}

/**
 * Format nutrition display in carb-first order
 */
export function formatNutritionString(nutrition: {
  carbs: number;
  fiber?: number;
  sugar?: number;
  protein: number;
  fat: number;
  calories: number;
}): string {
  const netCarbs = calculateNetCarbs(nutrition.carbs, nutrition.fiber);
  const parts = [
    `🥦 ${netCarbs}g net carbs (${nutrition.carbs}g - ${nutrition.fiber || 0}g fiber)`,
    `${nutrition.protein}g protein`,
    `${nutrition.fat}g fat`,
    `${nutrition.calories} cal`,
  ];

  if (nutrition.sugar && nutrition.sugar > 0) {
    parts.splice(1, 0, `${nutrition.sugar}g sugar`);
  }

  return parts.join(' • ');
}

/**
 * Get carb level label for accessibility
 */
export function getCarbLevelLabel(netCarbs: number): string {
  if (netCarbs <= 20) return 'Low (Keto-friendly)';
  if (netCarbs <= 50) return 'Moderate';
  return 'High';
}
```

---

## Implementation Order

### Phase 1: Foundation (Utilities & Types)
1. ✅ Create `src/utils/nutrition.ts` with helper functions
2. ✅ Update type definitions in `src/types/index.ts`
3. ✅ Update database schemas in `src/db/index.ts`

### Phase 2: Core Components (Most Visible)
4. ✅ Update Meal Detail page (`src/routes/meals/$mealId.tsx`)
5. ✅ Update Meal List page (`src/routes/meals/index.tsx`)
6. ✅ Update Meal Creation page (`src/routes/meals/new.tsx`)

### Phase 3: Food Components
7. ✅ Update Food Detail - View Mode (`src/routes/foods/$foodId.tsx`)
8. ✅ Update Food Detail - Edit Mode (`src/routes/foods/$foodId.tsx`)
9. ✅ Update Food AI Analyze (`src/routes/foods/ai-analyze.tsx`)

### Phase 4: Supporting Components
10. ✅ Update Food Matcher (`src/components/FoodMatcher.tsx`)
11. ✅ Update Inline Food Editor (`src/components/InlineFoodItemEditor.tsx`)

### Phase 5: Testing & Refinement
12. ✅ Test all nutrition displays
13. ✅ Verify color coding works correctly
14. ✅ Check mobile responsiveness
15. ✅ Add accessibility labels

---

## Testing Checklist

- [ ] Net carbs calculation is correct (total carbs - fiber)
- [ ] Color coding displays properly (green/yellow/red)
- [ ] All components show carbs first
- [ ] Edit forms have live net carbs calculation
- [ ] Meal totals aggregate correctly
- [ ] AI food detection respects new order
- [ ] Food matching displays updated format
- [ ] Mobile layout doesn't break
- [ ] Dark mode colors are readable
- [ ] Profile goals save correctly (if implementing goal tracking)

---

## Future Enhancements

1. **Daily Carb Tracking Dashboard**
   - Progress bar showing net carbs consumed vs goal
   - Visual breakdown of meals throughout the day
   - Alerts when approaching daily carb limit

2. **Carb-Smart Meal Suggestions**
   - AI suggests low-carb alternatives
   - Meal planning with carb budgets
   - Substitution recommendations

3. **Carb History & Trends**
   - Weekly/monthly net carb averages
   - Glycemic impact predictions
   - Ketosis indicator (if consistently <20g net carbs)

4. **Advanced Filtering**
   - Filter meals by net carb range
   - Search foods by carb content
   - Sort pantry by net carbs

---

## Notes

- The 20g/50g thresholds are based on standard keto guidelines
- Net carbs formula: `Total Carbs - Fiber` (fiber doesn't impact blood sugar)
- Sugar alcohols are not currently tracked (could be added later)
- Color coding uses traffic light system for instant recognition
- All changes maintain backward compatibility with existing data
