// Food Matching Utilities
// Implements fuzzy matching and similarity scoring for food items

import type { Food } from '@/types'

export interface NutritionData {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
}

export interface FoodMatch {
  food: Food
  score: number
  confidence: number // 0-100
  reasons: string[] // Why this is a match
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[s1.length][s2.length]
}

/**
 * Calculate normalized similarity score between two strings (0-1)
 * 1 = exact match, 0 = completely different
 */
export function fuzzyMatch(str1: string, str2: string): number {
  if (!str1 || !str2) return 0

  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  // Exact match
  if (s1 === s2) return 1.0

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length)
    const shorter = Math.min(s1.length, s2.length)
    return shorter / longer * 0.95 // High score but not perfect
  }

  // Levenshtein distance based similarity
  const maxLength = Math.max(s1.length, s2.length)
  const distance = levenshteinDistance(s1, s2)
  return Math.max(0, 1 - (distance / maxLength))
}

/**
 * Calculate nutrition similarity between two nutrition profiles (0-1)
 * Compares calories, protein, carbs, and fat
 * Allows variance up to 20%
 */
export function calculateNutritionSimilarity(
  n1: NutritionData,
  n2: NutritionData
): number {
  const TOLERANCE = 0.20 // 20% variance allowed

  const metrics = [
    { value1: n1.calories, value2: n2.calories, weight: 0.3 },
    { value1: n1.protein, value2: n2.protein, weight: 0.3 },
    { value1: n1.carbs, value2: n2.carbs, weight: 0.2 },
    { value1: n1.fat, value2: n2.fat, weight: 0.2 }
  ]

  let totalScore = 0

  for (const metric of metrics) {
    if (metric.value1 === 0 && metric.value2 === 0) {
      totalScore += metric.weight // Both zero counts as match
      continue
    }

    if (metric.value1 === 0 || metric.value2 === 0) {
      continue // Skip if one is zero
    }

    const ratio = Math.min(metric.value1, metric.value2) / Math.max(metric.value1, metric.value2)
    const difference = Math.abs(metric.value1 - metric.value2) / Math.max(metric.value1, metric.value2)

    if (difference <= TOLERANCE) {
      totalScore += metric.weight * ratio
    } else {
      totalScore += metric.weight * Math.max(0, 1 - difference)
    }
  }

  return Math.min(1, totalScore)
}

/**
 * Calculate overall food similarity score
 * Combines name, category, and nutrition similarity
 */
export function calculateFoodSimilarity(
  detectedName: string,
  detectedCategory: string,
  detectedNutrition: NutritionData,
  existingFood: Food
): { score: number; reasons: string[] } {
  const weights = {
    name: 0.45,
    category: 0.15,
    nutrition: 0.40
  }

  const reasons: string[] = []

  // Name similarity
  const nameScore = fuzzyMatch(detectedName, existingFood.name)
  if (nameScore > 0.8) reasons.push('Name matches closely')
  else if (nameScore > 0.6) reasons.push('Name is similar')

  // Category exact match
  const categoryScore = detectedCategory.toLowerCase() === existingFood.category.toLowerCase() ? 1.0 : 0.0
  if (categoryScore === 1.0) reasons.push('Same category')

  // Nutrition similarity
  const nutritionScore = calculateNutritionSimilarity(detectedNutrition, {
    calories: existingFood.calories,
    protein: existingFood.protein,
    carbs: existingFood.carbs,
    fat: existingFood.fat,
    fiber: existingFood.fiber,
    sugar: existingFood.sugar,
    sodium: existingFood.sodium
  })
  if (nutritionScore > 0.8) reasons.push('Nutrition profile matches')
  else if (nutritionScore > 0.6) reasons.push('Similar nutrition')

  const totalScore = (
    nameScore * weights.name +
    categoryScore * weights.category +
    nutritionScore * weights.nutrition
  )

  return { score: totalScore, reasons }
}

/**
 * Find matching foods from pantry catalog
 * Returns top matches sorted by confidence
 */
export function findMatchingFoods(
  detectedName: string,
  detectedCategory: string,
  detectedNutrition: NutritionData,
  existingFoods: Food[],
  maxResults: number = 5,
  minConfidence: number = 60
): FoodMatch[] {
  const matches: FoodMatch[] = []

  for (const food of existingFoods) {
    const { score, reasons } = calculateFoodSimilarity(
      detectedName,
      detectedCategory,
      detectedNutrition,
      food
    )

    const confidence = Math.round(score * 100)

    if (confidence >= minConfidence) {
      matches.push({
        food,
        score,
        confidence,
        reasons
      })
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score)

  // Return top N matches
  return matches.slice(0, maxResults)
}

/**
 * Parse portion string into amount and unit
 * Examples: "150g" -> { amount: 150, unit: "g" }
 *           "1 cup" -> { amount: 1, unit: "cup" }
 */
export function parsePortionString(portionStr: string): { amount: number; unit: string } | null {
  if (!portionStr) return null

  const trimmed = portionStr.trim()

  // Try to extract number and unit
  const match = trimmed.match(/^([\d.]+)\s*([a-zA-Z]+)$/)

  if (match) {
    return {
      amount: parseFloat(match[1]),
      unit: match[2]
    }
  }

  return null
}

/**
 * Normalize unit names for consistency
 */
export function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim()

  const unitMap: Record<string, string> = {
    'gram': 'g',
    'grams': 'g',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'ounce': 'oz',
    'ounces': 'oz',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'cups': 'cup',
    'pieces': 'piece',
    'slices': 'slice'
  }

  return unitMap[normalized] || normalized
}
