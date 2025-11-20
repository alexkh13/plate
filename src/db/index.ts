import type { PlateDatabase } from '@/types'

// Dynamic imports will be used to prevent server-side execution

// RxDB Schemas
const profileSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string'
    },
    isDefault: {
      type: 'boolean'
    },
    avatar: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    dailyCalorieGoal: {
      type: 'number'
    },
    dailyProteinGoal: {
      type: 'number'
    },
    dailyCarbGoal: {
      type: 'number'
    },
    dailyNetCarbGoal: {
      type: 'number'
    },
    dailyFatGoal: {
      type: 'number'
    },
    dailyFiberGoal: {
      type: 'number'
    },
    createdAt: {
      type: 'number'
    },
    updatedAt: {
      type: 'number'
    }
  },
  required: ['id', 'name', 'isDefault', 'createdAt', 'updatedAt']
} as const

const profileMigrationStrategies = {
  // Migration from version 0 to version 1 - adds dailyNetCarbGoal and dailyFiberGoal
  1: function(oldDoc: any) {
    return oldDoc
  }
}

const foodSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string'
    },
    photo: {
      type: 'string'
    },
    brand: {
      type: 'string'
    },
    tags: {
      type: 'string'
    },
    notes: {
      type: 'string'
    },
    // Nutrition data
    calories: {
      type: 'number'
    },
    protein: {
      type: 'number'
    },
    carbs: {
      type: 'number'
    },
    fat: {
      type: 'number'
    },
    fiber: {
      type: 'number'
    },
    sugar: {
      type: 'number'
    },
    sodium: {
      type: 'number'
    },
    servingSize: {
      type: 'number'
    },
    servingSizeUnit: {
      type: 'string'
    },
    // Categorization
    category: {
      type: 'string'
    },
    allergens: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    // Meta
    isRecipe: {
      type: 'boolean'
    },
    barcode: {
      type: 'string'
    },
    profileId: {
      type: 'string'
    },
    createdAt: {
      type: 'number'
    },
    updatedAt: {
      type: 'number'
    }
  },
  required: ['id', 'name', 'calories', 'protein', 'carbs', 'fat', 'servingSize', 'servingSizeUnit', 'category', 'isRecipe', 'profileId', 'createdAt', 'updatedAt']
} as const

const mealSchema = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string'
    },
    // Computed nutrition totals
    totalCalories: {
      type: 'number'
    },
    totalProtein: {
      type: 'number'
    },
    totalCarbs: {
      type: 'number'
    },
    totalFat: {
      type: 'number'
    },
    totalFiber: {
      type: 'number'
    },
    totalSugar: {
      type: 'number'
    },
    // Meal metadata
    mealType: {
      type: 'string'
    },
    timestamp: {
      type: 'number'
    },
    mealImage: {
      type: 'string'
    },
    tags: {
      type: 'string'
    },
    notes: {
      type: 'string'
    },
    profileId: {
      type: 'string'
    },
    createdAt: {
      type: 'number'
    },
    updatedAt: {
      type: 'number'
    }
  },
  required: ['id', 'name', 'totalCalories', 'totalProtein', 'totalCarbs', 'totalFat', 'mealType', 'profileId', 'createdAt', 'updatedAt']
} as const

const mealMigrationStrategies = {
  // Migration from version 0 to version 1 - adds totalSugar
  1: function(oldDoc: any) {
    return oldDoc
  }
}

// Junction table for meal-food associations with portion data
const mealFoodSchema = {
  version: 2,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    mealId: {
      type: 'string',
      maxLength: 100
    },
    foodId: {
      type: 'string',
      maxLength: 100
    },
    // Portion information (specific to this meal-food association)
    amount: {
      type: 'number'
    },
    unit: {
      type: 'string'
    },
    // Order in the meal (for display purposes)
    order: {
      type: 'number'
    },
    // AI detection data (for regenerating images from original meal photo)
    boundingBox: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' }
      }
    },
    createdAt: {
      type: 'number'
    },
    updatedAt: {
      type: 'number'
    }
  },
  required: ['id', 'mealId', 'foodId', 'amount', 'unit', 'order', 'createdAt', 'updatedAt'],
  indexes: ['mealId', 'foodId']
} as const

const mealFoodMigrationStrategies = {
  // Migration from version 1 to version 2 - adds boundingBox (optional field)
  1: function(oldDoc: any) {
    return oldDoc
  },
  2: function(oldDoc: any) {
    return oldDoc
  }
}

const calendarEntrySchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    date: {
      type: 'string'
    },
    mealId: {
      type: 'string'
    },
    notes: {
      type: 'string'
    },
    createdAt: {
      type: 'number'
    },
    updatedAt: {
      type: 'number'
    }
  },
  required: ['id', 'date', 'createdAt', 'updatedAt']
} as const

// Initialize Database
let dbPromise: Promise<PlateDatabase> | null = null

export async function initDatabase(): Promise<PlateDatabase> {
  if (dbPromise) {
    return dbPromise
  }

  dbPromise = (async () => {
    try {
      console.log('🔧 Initializing RxDB database...')

      // Dynamically import RxDB modules (only in browser)
      const { createRxDatabase, addRxPlugin } = await import('rxdb')
      const { getRxStorageDexie } = await import('rxdb/plugins/storage-dexie')
      const { RxDBUpdatePlugin } = await import('rxdb/plugins/update')
      const { RxDBMigrationSchemaPlugin } = await import('rxdb/plugins/migration-schema')

      // Add required plugins
      addRxPlugin(RxDBUpdatePlugin)
      addRxPlugin(RxDBMigrationSchemaPlugin)

      // Add dev-mode plugin in development
      if (import.meta.env.DEV) {
        const { RxDBDevModePlugin } = await import('rxdb/plugins/dev-mode')
        addRxPlugin(RxDBDevModePlugin)
      }

      // Wrap storage with validation in dev mode
      let storage
      if (import.meta.env.DEV) {
        const { wrappedValidateAjvStorage } = await import('rxdb/plugins/validate-ajv')
        storage = wrappedValidateAjvStorage({ storage: getRxStorageDexie() })
      } else {
        storage = getRxStorageDexie()
      }

      const db = await createRxDatabase<PlateDatabase>({
        name: 'platedb',
        storage,
        multiInstance: false,
        ignoreDuplicate: true
      })

      console.log('✅ Database created successfully')

      // Add collections
      console.log('📦 Adding collections...')

      // First add profiles collection
      await db.addCollections({
        profiles: {
          schema: profileSchema,
          migrationStrategies: profileMigrationStrategies
        }
      })

      // Ensure default profile exists
      const profilesCollection = db.profiles
      let defaultProfile = await profilesCollection.findOne({ selector: { isDefault: true } }).exec()

      if (!defaultProfile) {
        console.log('📝 Creating default profile...')
        const now = Date.now()
        defaultProfile = await profilesCollection.insert({
          id: `profile_${now}_default`,
          name: 'My Plate',
          isDefault: true,
          createdAt: now,
          updatedAt: now
        })
        console.log('✅ Default profile created:', defaultProfile.id)
      }

      const defaultProfileId = defaultProfile.id

      // Now add other collections
      await db.addCollections({
        foods: {
          schema: foodSchema
        },
        meals: {
          schema: mealSchema,
          migrationStrategies: mealMigrationStrategies
        },
        meal_foods: {
          schema: mealFoodSchema,
          migrationStrategies: mealFoodMigrationStrategies
        },
        calendar_entries: {
          schema: calendarEntrySchema
        }
      })

      console.log('✅ Collections added successfully')
      console.log('✨ Plate initialized - ready to track your meals!')

      return db
    } catch (error) {
      console.error('❌ Failed to initialize database:', error)
      throw error
    }
  })()

  return dbPromise
}

// Get database instance
export async function getDatabase(): Promise<PlateDatabase> {
  // Prevent database initialization on server-side
  if (typeof window === 'undefined') {
    throw new Error('Database can only be accessed in the browser')
  }
  return initDatabase()
}

// Clear all data from the database (useful for fresh start)
export async function clearAllData() {
  try {
    const db = await getDatabase()

    // Remove all foods
    const foods = await db.foods.find().exec()
    await Promise.all(foods.map(food => food.remove()))

    // Remove all meals
    const meals = await db.meals.find().exec()
    await Promise.all(meals.map(meal => meal.remove()))

    // Remove all meal-food associations
    const mealFoods = await db.meal_foods.find().exec()
    await Promise.all(mealFoods.map(mf => mf.remove()))

    // Remove all calendar entries
    const entries = await db.calendar_entries.find().exec()
    await Promise.all(entries.map(entry => entry.remove()))

    // Remove all profiles
    const profiles = await db.profiles.find().exec()
    await Promise.all(profiles.map(profile => profile.remove()))

    console.log('🧹 All data cleared successfully')
  } catch (error) {
    console.error('Failed to clear data:', error)
    throw error
  }
}

