// Food Recognition AI Functions - Gemini Implementation

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIGeneratedFood, AIMealAnalysis } from './types'

/**
 * Get Gemini API instance
 */
function getGeminiAPI() {
  const token = localStorage.getItem('google_ai_token')
  if (!token) {
    throw new Error('Google AI API key not configured. Please set it in Settings > AI.')
  }
  return new GoogleGenerativeAI(token)
}

/**
 * Convert File to base64 data
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Extract multiple foods from image
 */
export async function extractMultipleFoods(
  imageFile: File,
  progressCallback?: (message: string, progress: number) => void
): Promise<AIGeneratedFood[]> {
  const genAI = getGeminiAPI()
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  progressCallback?.('Analyzing food image...', 10)

  const imageData = await fileToBase64(imageFile)
  const base64Data = imageData.split(',')[1]

  const prompt = `You are a nutrition expert analyzing a food photo. Identify all food items visible in the image.

For EACH food item detected, provide:
1. Name (e.g., "Grilled Chicken Breast", "Brown Rice", "Steamed Broccoli")
2. Category (one of: Protein, Carbs, Vegetables, Fruits, Dairy, Fats, Snacks, Beverages, Prepared)
3. Estimated portion size (amount and unit like "150g", "1 cup", "1 piece")
4. Nutrition per serving (calories, protein, carbs, fat in grams, fiber optional)
5. Serving size that nutrition is based on
6. Optional: preparation method, ingredients, allergens
7. Confidence score (0-100)

Return a JSON array with this exact structure:
[{
  "name": "string",
  "category": "Protein|Carbs|Vegetables|Fruits|Dairy|Fats|Snacks|Beverages|Prepared",
  "tags": "#hashtag #separated",
  "notes": "brief description",
  "confidence": 85,
  "nutrition": {
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fat": 3.6,
    "fiber": 0,
    "sugar": 0,
    "sodium": 74
  },
  "estimatedPortion": {
    "amount": 150,
    "unit": "g"
  },
  "servingSize": 100,
  "servingSizeUnit": "g",
  "metadata": {
    "preparationMethod": "grilled",
    "ingredients": ["chicken breast"],
    "allergens": [],
    "brandEstimate": ""
  }
}]

IMPORTANT: Return ONLY the JSON array, no other text.`

  progressCallback?.('Processing image with AI...', 30)

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Data
        }
      }
    ])

    progressCallback?.('Extracting food data...', 60)

    const response = await result.response
    const text = response.text()

    // Extract JSON from response
    let jsonText = text.trim()
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const foodsData = JSON.parse(jsonText)

    progressCallback?.('Generating food images...', 80)

    // For now, use the original image for each food
    // In a production app, you'd crop individual foods using bounding boxes
    const foods: AIGeneratedFood[] = foodsData.map((food: any) => ({
      ...food,
      imageData: imageData // Use full image for now
    }))

    progressCallback?.('Complete!', 100)

    return foods
  } catch (error) {
    console.error('Food extraction error:', error)
    throw new Error(`Failed to extract foods: ${error}`)
  }
}

/**
 * Analyze complete meal from photo
 */
export async function analyzeMealPhoto(
  imageFile: File,
  progressCallback?: (message: string, progress: number) => void
): Promise<AIMealAnalysis> {
  const foods = await extractMultipleFoods(imageFile, progressCallback)

  // Calculate total nutrition
  const totalNutrition = foods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.nutrition.calories,
      protein: acc.protein + food.nutrition.protein,
      carbs: acc.carbs + food.nutrition.carbs,
      fat: acc.fat + food.nutrition.fat,
      fiber: acc.fiber + (food.nutrition.fiber || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )

  // Determine meal type based on foods and time of day
  const hour = new Date().getHours()
  let mealType = 'snack'
  if (hour >= 5 && hour < 11) mealType = 'breakfast'
  else if (hour >= 11 && hour < 16) mealType = 'lunch'
  else if (hour >= 16 && hour < 22) mealType = 'dinner'

  // Generate meal name
  const foodNames = foods.map(f => f.name).join(', ')
  const estimatedMealName = foods.length > 2
    ? `${foods[0].name} with ${foods.length - 1} sides`
    : foodNames

  const avgConfidence = foods.reduce((sum, f) => sum + f.confidence, 0) / foods.length

  return {
    detectedFoods: foods,
    totalNutrition,
    mealType,
    estimatedMealName,
    confidence: Math.round(avgConfidence)
  }
}

/**
 * Generate meal suggestion from available foods
 */
export async function generateMealSuggestion(
  foodNames: string[],
  foodCategories: string[],
  nutritionGoals?: { calories?: number; protein?: number; carbs?: number; fat?: number }
): Promise<{
  name: string
  mealType: string
  tags?: string
  notes?: string
} | null> {
  const genAI = getGeminiAPI()
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const goalsText = nutritionGoals
    ? `Target nutrition: ${nutritionGoals.calories || '?'} calories, ${nutritionGoals.protein || '?'}g protein, ${nutritionGoals.carbs || '?'}g carbs, ${nutritionGoals.fat || '?'}g fat`
    : 'No specific nutrition goals'

  const prompt = `You are a nutrition expert. Given these available foods, suggest a balanced meal:

Available foods:
${foodNames.map((name, i) => `- ${name} (${foodCategories[i]})`).join('\n')}

${goalsText}

Create a meal suggestion with:
1. A creative meal name
2. Meal type (breakfast/lunch/dinner/snack)
3. Tags (e.g., #balanced #highprotein #quick)
4. Brief notes on why this combination works

Return JSON only:
{
  "name": "string",
  "mealType": "breakfast|lunch|dinner|snack",
  "tags": "#tag1 #tag2",
  "notes": "Why this meal is good"
}`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    let jsonText = text.trim()
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    return JSON.parse(jsonText)
  } catch (error) {
    console.error('Meal suggestion error:', error)
    return null
  }
}
