// AI Service Type Definitions - Google Gemini Integration

// Legacy type for backward compatibility (food items)
export interface AIGeneratedItem {
  name: string
  category: string
  color?: string
  tags?: string
  notes?: string
  confidence: number
  imageData: string // Base64 data URL
  metadata?: {
    style?: string
    occasion?: string
    season?: string
    material?: string
    pattern?: string
    secondaryColors?: string[]
  }
}

// Food recognition result
export interface AIGeneratedFood {
  name: string
  category: string // Protein, Carbs, Vegetables, Fruits, Dairy, Fats, Snacks, Beverages, Prepared
  tags?: string
  notes?: string
  confidence: number
  imageData: string // Base64 data URL - cropped food item

  // Nutrition estimates
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber?: number
    sugar?: number
    sodium?: number
  }

  // Portion info
  estimatedPortion: {
    amount: number
    unit: string // g, ml, oz, cup, piece, etc.
  }

  servingSize: number
  servingSizeUnit: string

  metadata?: {
    preparationMethod?: string
    ingredients?: string[]
    allergens?: string[]
    brandEstimate?: string
  }
}

// Meal analysis result
export interface AIMealAnalysis {
  detectedFoods: AIGeneratedFood[]
  totalNutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  mealType: string // breakfast, lunch, dinner, snack
  estimatedMealName: string
  confidence: number
}

export interface AIProcessingProgress {
  stage: 'analyzing' | 'complete'
  progress: number // 0-100
  message: string
}

export type AIProgressCallback = (progress: AIProcessingProgress) => void
