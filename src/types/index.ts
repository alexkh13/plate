import type { RxDocument, RxCollection, RxDatabase } from 'rxdb'

// Profile Entity
export interface Profile {
  id: string
  name: string
  isDefault: boolean
  avatar?: string // Base64 encoded image data or emoji
  description?: string
  // Nutrition goals (optional)
  dailyCalorieGoal?: number
  dailyProteinGoal?: number
  dailyCarbGoal?: number
  dailyNetCarbGoal?: number // Target for net carbs (carbs - fiber)
  dailyFatGoal?: number
  dailyFiberGoal?: number // Minimum fiber goal
  createdAt: number
  updatedAt: number
}

export type ProfileDocument = RxDocument<Profile>
export type ProfileCollection = RxCollection<Profile>

// Food/Ingredient Entity
export interface Food {
  id: string
  name: string
  photo?: string // Base64 encoded image data
  brand?: string
  tags?: string
  notes?: string

  // Nutrition data (per serving)
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number

  servingSize: number
  servingSizeUnit: string // g, ml, oz, cup, piece, etc.

  // Categorization
  category: string // Protein, Carbs, Vegetables, Fruits, Dairy, Fats, Snacks, Beverages, Prepared
  allergens?: string[] // milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans

  // Meta
  isRecipe: boolean
  barcode?: string

  profileId: string // Reference to Profile ID
  createdAt: number
  updatedAt: number
}

export type FoodDocument = RxDocument<Food>
export type FoodCollection = RxCollection<Food>

// Meal Entity
export interface Meal {
  id: string
  name: string

  // Computed nutrition (sum of all foods × portions)
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber?: number
  totalSugar?: number

  // Meal metadata
  mealType: string // breakfast, lunch, dinner, snack
  timestamp?: number // when consumed (for logging)
  mealImage?: string // photo of the complete meal

  tags?: string
  notes?: string

  profileId: string // Reference to Profile ID
  createdAt: number
  updatedAt: number
}

export type MealDocument = RxDocument<Meal>
export type MealCollection = RxCollection<Meal>

// MealFood Junction Entity (associates foods with meals and includes portion data)
export interface MealFood {
  id: string
  mealId: string // Reference to Meal ID
  foodId: string // Reference to Food ID
  // Portion information (specific to this meal-food association)
  amount: number
  unit: string // g, ml, oz, cup, piece, etc.
  order: number // Display order in the meal
  // AI detection data (for regenerating images from original meal photo)
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
  createdAt: number
  updatedAt: number
}

export type MealFoodDocument = RxDocument<MealFood>
export type MealFoodCollection = RxCollection<MealFood>

// Helper type for working with meals with their foods and portions
export interface MealWithFoods extends Meal {
  foods: Array<Food & { portion: { amount: number; unit: string; order: number } }>
}

// Calendar Entry Entity
export interface CalendarEntry {
  id: string // Format: YYYY-MM-DD
  date: string // ISO date string
  mealId?: string // Reference to Meal ID
  notes?: string
  createdAt: number
  updatedAt: number
}

export type CalendarEntryDocument = RxDocument<CalendarEntry>
export type CalendarEntryCollection = RxCollection<CalendarEntry>

// Database Collections
export interface PlateCollections {
  profiles: ProfileCollection
  foods: FoodCollection
  meals: MealCollection
  meal_foods: MealFoodCollection
  calendar_entries: CalendarEntryCollection
}

export type PlateDatabase = RxDatabase<PlateCollections>
