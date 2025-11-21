// Main AI Service - Google Gemini Integration

import type {
  AIGeneratedItem,
  AIGeneratedFood,
  AIMealAnalysis,
  AIProcessingProgress,
  AIProgressCallback,
} from './food'

/**
 * Check if Gemini API is configured
 */
export async function isGeminiConfigured(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const token = localStorage.getItem('google_ai_token')
  return !!token
}

/**
 * Extract multiple foods from image using Gemini AI
 * Analyzes food photo and returns individual food items with nutrition info
 */
export async function extractFoodsFromImage(
  imageFile: File,
  progressCallback?: AIProgressCallback
): Promise<AIGeneratedFood[]> {
  try {
    const { extractMultipleFoods } = await import('./gemini')

    const foods = await extractMultipleFoods(imageFile, (message, progress) => {
      progressCallback?.({
        stage: progress < 100 ? 'analyzing' : 'complete',
        progress,
        message,
      })
    })

    return foods
  } catch (error) {
    console.error('Food extraction failed:', error)
    throw error
  }
}

/**
 * Analyze complete meal from image
 * Returns all detected foods and total nutrition
 */
export async function analyzeMealFromImage(
  imageFile: File,
  progressCallback?: AIProgressCallback
): Promise<AIMealAnalysis> {
  try {
    const { analyzeMealPhoto } = await import('./gemini')

    const analysis = await analyzeMealPhoto(imageFile, (message, progress) => {
      progressCallback?.({
        stage: progress < 100 ? 'analyzing' : 'complete',
        progress,
        message,
      })
    })

    return analysis
  } catch (error) {
    console.error('Meal analysis failed:', error)
    throw error
  }
}

/**
 * Generate meal suggestions from available foods
 */
export async function generateMealSuggestions(
  foodNames: string[],
  foodCategories: string[],
  nutritionGoals?: { calories?: number; protein?: number; carbs?: number; fat?: number }
): Promise<{
  name: string
  mealType: string
  tags?: string
  notes?: string
} | null> {
  try {
    const { generateMealSuggestion } = await import('./gemini')
    const meal = await generateMealSuggestion(foodNames, foodCategories, nutritionGoals)
    return meal
  } catch (error) {
    console.error('Meal suggestion failed:', error)
    return null
  }
}

// Re-export types
export type {
  AIGeneratedItem,
  AIGeneratedFood,
  AIMealAnalysis,
  AIProcessingProgress,
  AIProgressCallback,
}
