import type { Food, Meal, MealWithFoods } from '@/types'

/**
 * Calculate nutrition for a specific portion of food
 */
export function calculatePortionNutrition(
  food: Food,
  portion: { amount: number; unit: string }
): {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
} {
  // Convert portion amount to grams for calculation
  const multiplier = getPortionMultiplier(food, portion)

  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
    fiber: Math.round((food.fiber || 0) * multiplier * 10) / 10,
    sugar: Math.round((food.sugar || 0) * multiplier * 10) / 10
  }
}

/**
 * Get multiplier for converting portion to serving size
 */
function getPortionMultiplier(food: Food, portion: { amount: number; unit: string }): number {
  // If portion unit matches serving unit, just divide
  if (portion.unit === food.servingSizeUnit) {
    return portion.amount / food.servingSize
  }

  // Convert common units to grams
  const portionGrams = convertToGrams(portion.amount, portion.unit)
  const servingGrams = convertToGrams(food.servingSize, food.servingSizeUnit)

  return portionGrams / servingGrams
}

/**
 * Convert various units to grams (approximate conversions)
 */
function convertToGrams(amount: number, unit: string): number {
  const unitLower = unit.toLowerCase()

  // Already in grams
  if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') {
    return amount
  }

  // Milliliters (assume water density: 1ml = 1g)
  if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') {
    return amount
  }

  // Cups (US standard: 1 cup ≈ 240ml ≈ 240g for water)
  if (unitLower === 'cup' || unitLower === 'cups') {
    return amount * 240
  }

  // Tablespoons (1 tbsp ≈ 15ml ≈ 15g)
  if (unitLower === 'tbsp' || unitLower === 'tablespoon' || unitLower === 'tablespoons') {
    return amount * 15
  }

  // Teaspoons (1 tsp ≈ 5ml ≈ 5g)
  if (unitLower === 'tsp' || unitLower === 'teaspoon' || unitLower === 'teaspoons') {
    return amount * 5
  }

  // Ounces (1 oz ≈ 28.35g)
  if (unitLower === 'oz' || unitLower === 'ounce' || unitLower === 'ounces') {
    return amount * 28.35
  }

  // Pounds (1 lb = 453.592g)
  if (unitLower === 'lb' || unitLower === 'pound' || unitLower === 'pounds') {
    return amount * 453.592
  }

  // Kilograms
  if (unitLower === 'kg' || unitLower === 'kilogram' || unitLower === 'kilograms') {
    return amount * 1000
  }

  // Liters
  if (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters') {
    return amount * 1000
  }

  // For pieces, servings, or unknown units, assume 1:1
  return amount
}

/**
 * Calculate total nutrition for a meal from live food data
 * This ensures meal totals stay in sync with updated food nutrition
 */
export function calculateMealNutritionFromFoods(
  meal: MealWithFoods
): {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  totalSugar: number
} {
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalFiber = 0
  let totalSugar = 0

  for (const food of meal.foods) {
    if (!food.portion) continue

    const nutrition = calculatePortionNutrition(food, food.portion)
    totalCalories += nutrition.calories
    totalProtein += nutrition.protein
    totalCarbs += nutrition.carbs
    totalFat += nutrition.fat
    totalFiber += nutrition.fiber
    totalSugar += nutrition.sugar
  }

  return {
    totalCalories: Math.round(totalCalories),
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCarbs: Math.round(totalCarbs * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    totalFiber: Math.round(totalFiber * 10) / 10,
    totalSugar: Math.round(totalSugar * 10) / 10
  }
}

/**
 * Check if meal's cached nutrition values are out of sync with live calculated values
 */
export function isMealNutritionOutOfSync(
  meal: MealWithFoods,
  liveNutrition: ReturnType<typeof calculateMealNutritionFromFoods>,
  threshold: number = 0.1 // Allow 0.1g difference for rounding
): boolean {
  return (
    Math.abs(meal.totalCalories - liveNutrition.totalCalories) > threshold ||
    Math.abs(meal.totalProtein - liveNutrition.totalProtein) > threshold ||
    Math.abs(meal.totalCarbs - liveNutrition.totalCarbs) > threshold ||
    Math.abs(meal.totalFat - liveNutrition.totalFat) > threshold ||
    Math.abs((meal.totalFiber || 0) - liveNutrition.totalFiber) > threshold ||
    Math.abs((meal.totalSugar || 0) - liveNutrition.totalSugar) > threshold
  )
}

/**
 * Calculate macro percentages (protein/carbs/fat as % of calories)
 */
export function calculateMacroPercentages(
  protein: number,
  carbs: number,
  fat: number
): {
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
} {
  // 1g protein = 4 calories
  // 1g carbs = 4 calories
  // 1g fat = 9 calories
  const proteinCal = protein * 4
  const carbsCal = carbs * 4
  const fatCal = fat * 9
  const total = proteinCal + carbsCal + fatCal

  if (total === 0) {
    return { proteinPercent: 0, carbsPercent: 0, fatPercent: 0 }
  }

  return {
    proteinPercent: Math.round((proteinCal / total) * 100),
    carbsPercent: Math.round((carbsCal / total) * 100),
    fatPercent: Math.round((fatCal / total) * 100)
  }
}

/**
 * Food category options
 */
export const FOOD_CATEGORIES = [
  'Protein',
  'Carbs',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Fats',
  'Snacks',
  'Beverages',
  'Prepared'
] as const

/**
 * Meal type options
 */
export const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack'
] as const

/**
 * Common allergens
 */
export const COMMON_ALLERGENS = [
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree nuts',
  'peanuts',
  'wheat',
  'soybeans',
  'sesame'
] as const

/**
 * Common serving size units
 */
export const SERVING_SIZE_UNITS = [
  'g',
  'ml',
  'oz',
  'cup',
  'tbsp',
  'tsp',
  'piece',
  'serving',
  'slice',
  'lb',
  'kg'
] as const

/**
 * Format macro value with unit
 */
export function formatMacro(value: number, unit: 'g' | 'kcal'): string {
  return `${value}${unit}`
}

/**
 * Get nutrition quality score (simple heuristic)
 */
export function getNutritionScore(food: Food): number {
  let score = 50 // Start at middle

  // Higher protein is good (+)
  if (food.protein > 15) score += 15
  else if (food.protein > 10) score += 10
  else if (food.protein > 5) score += 5

  // Higher fiber is good (+)
  if (food.fiber && food.fiber > 5) score += 15
  else if (food.fiber && food.fiber > 3) score += 10
  else if (food.fiber && food.fiber > 1) score += 5

  // Lower sugar is better
  if (food.sugar && food.sugar > 20) score -= 15
  else if (food.sugar && food.sugar > 10) score -= 10
  else if (food.sugar && food.sugar > 5) score -= 5

  // Lower sodium is better
  if (food.sodium && food.sodium > 800) score -= 15
  else if (food.sodium && food.sodium > 400) score -= 10
  else if (food.sodium && food.sodium > 200) score -= 5

  // Category bonuses
  if (food.category === 'Vegetables' || food.category === 'Fruits') score += 10
  if (food.category === 'Protein') score += 5

  return Math.max(0, Math.min(100, score))
}

/**
 * Carb-First Display Utilities
 * Optimized for keto/diabetic-friendly user experience
 */

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
 * Get border color based on net carbs amount
 */
export function getCarbBorderColor(netCarbs: number): string {
  if (netCarbs <= 20) return 'border-green-500';
  if (netCarbs <= 50) return 'border-yellow-500';
  return 'border-red-500';
}

/**
 * Get background opacity color based on net carbs amount
 */
export function getCarbBgOpacity(netCarbs: number): string {
  if (netCarbs <= 20) return 'bg-green-500/20';
  if (netCarbs <= 50) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
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

/**
 * Format carb breakdown string
 */
export function formatCarbBreakdown(carbs: number, fiber: number = 0, sugar?: number): string {
  const parts = [`${carbs}g carbs`, `${fiber}g fiber`];
  if (sugar !== undefined && sugar > 0) {
    parts.push(`${sugar}g sugar`);
  }
  return parts.join(' • ');
}
