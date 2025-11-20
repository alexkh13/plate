import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getDatabase } from '@/db'
import type { Food, Meal, MealFood, CalendarEntry, Profile } from '@/types'

// Reactive RxDB query hook
function useRxQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  subscribe: (callback: () => void) => (() => void) | undefined
) {
  const [, setTrigger] = useState(0)
  const queryClient = useQueryClient()

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const setupSubscription = async () => {
      try {
        unsubscribe = subscribe(() => {
          queryClient.invalidateQueries({ queryKey })
          setTrigger(prev => prev + 1)
        })
      } catch (error) {
        console.error('Failed to setup subscription:', error)
      }
    }

    setupSubscription()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [queryKey.join(','), queryClient])

  return useQuery({
    queryKey,
    queryFn,
    retry: 3,
    retryDelay: 1000
  })
}

// ==================== PROFILES ====================

export function useProfiles() {
  return useRxQuery<Profile[]>(
    ['profiles'],
    async () => {
      try {
        const db = await getDatabase()
        const profiles = await db.profiles.find().exec()
        const result = profiles.map(doc => doc.toJSON())
        console.log('✅ Loaded profiles:', result.length)
        return result
      } catch (error) {
        console.error('❌ Failed to load profiles:', error)
        throw error
      }
    },
    (callback) => {
      let subscription: any
      getDatabase()
        .then(db => {
          subscription = db.profiles.find().$.subscribe(() => {
            console.log('🔄 Profiles changed, triggering update')
            callback()
          })
        })
        .catch(err => console.error('Failed to setup profiles subscription:', err))
      return () => {
        if (subscription) {
          subscription.unsubscribe()
        }
      }
    }
  )
}

export function useProfile(id: string) {
  return useRxQuery<Profile | null>(
    ['profiles', id],
    async () => {
      const db = await getDatabase()
      const profile = await db.profiles.findOne(id).exec()
      return profile ? profile.toJSON() : null
    },
    (callback) => {
      let subscription: any
      getDatabase().then(db => {
        subscription = db.profiles.findOne(id).$.subscribe(() => callback())
      })
      return () => subscription?.unsubscribe()
    }
  )
}

export function useDefaultProfile() {
  return useRxQuery<Profile | null>(
    ['profiles', 'default'],
    async () => {
      const db = await getDatabase()
      const profile = await db.profiles.findOne({ selector: { isDefault: true } }).exec()
      return profile ? profile.toJSON() : null
    },
    (callback) => {
      let subscription: any
      getDatabase().then(db => {
        subscription = db.profiles.find({ selector: { isDefault: true } }).$.subscribe(() => callback())
      })
      return () => subscription?.unsubscribe()
    }
  )
}

export function useCreateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>) => {
      const db = await getDatabase()
      const now = Date.now()
      const id = `profile_${now}_${Math.random().toString(36).slice(2)}`

      const profile = await db.profiles.insert({
        id,
        ...data,
        createdAt: now,
        updatedAt: now
      })

      return profile.toJSON()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    }
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Profile> }) => {
      const db = await getDatabase()
      const profile = await db.profiles.findOne(id).exec()

      if (!profile) {
        throw new Error('Profile not found')
      }

      await profile.update({
        $set: {
          ...data,
          updatedAt: Date.now()
        }
      })

      return profile.toJSON()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['profiles', variables.id] })
    }
  })
}

export function useDeleteProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDatabase()
      const profile = await db.profiles.findOne(id).exec()

      if (!profile) {
        throw new Error('Profile not found')
      }

      await profile.remove()
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    }
  })
}

export function useResetProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profileId: string) => {
      const db = await getDatabase()

      console.log(`🔄 Resetting profile ${profileId}...`)

      // Step 1: Get all meal IDs for this profile (to clean up calendar entries)
      const meals = await db.meals.find({ selector: { profileId } }).exec()
      const mealIds = meals.map(meal => meal.id)
      console.log(`  Found ${mealIds.length} meals to remove`)

      // Step 2: Delete all calendar entries that reference these meals
      if (mealIds.length > 0) {
        const calendarEntries = await db.calendar_entries
          .find({
            selector: {
              mealId: { $in: mealIds }
            }
          })
          .exec()

        console.log(`  Found ${calendarEntries.length} calendar entries to remove`)

        for (const entry of calendarEntries) {
          await entry.remove()
        }
      }

      // Step 3: Delete all meals for this profile
      for (const meal of meals) {
        await meal.remove()
      }

      // Step 4: Delete all foods for this profile
      const foods = await db.foods.find({ selector: { profileId } }).exec()
      console.log(`  Found ${foods.length} foods to remove`)

      for (const food of foods) {
        await food.remove()
      }

      console.log(`✅ Profile ${profileId} reset complete`)
      return profileId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['calendar_entries'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['meals'] })
    }
  })
}

// ==================== FOODS ====================

export function useFoods(profileId?: string) {
  return useRxQuery<Food[]>(
    profileId ? ['foods', 'profile', profileId] : ['foods'],
    async () => {
      try {
        const db = await getDatabase()
        const query = profileId
          ? db.foods.find({ selector: { profileId }, sort: [{ createdAt: 'desc' }] })
          : db.foods.find({ sort: [{ createdAt: 'desc' }] })
        const foods = await query.exec()
        const result = foods.map(doc => doc.toJSON())
        console.log('✅ Loaded foods:', result.length, profileId ? `for profile ${profileId}` : '')
        return result
      } catch (error) {
        console.error('❌ Failed to load foods:', error)
        throw error
      }
    },
    (callback) => {
      let subscription: any
      getDatabase()
        .then(db => {
          const query = profileId
            ? db.foods.find({ selector: { profileId }, sort: [{ createdAt: 'desc' }] })
            : db.foods.find({ sort: [{ createdAt: 'desc' }] })
          subscription = query.$.subscribe(() => {
            console.log('🔄 Foods changed, triggering update')
            callback()
          })
        })
        .catch(err => console.error('Failed to setup foods subscription:', err))
      return () => {
        if (subscription) {
          subscription.unsubscribe()
        }
      }
    }
  )
}

export function useFood(id: string) {
  return useRxQuery<Food | null>(
    ['foods', id],
    async () => {
      const db = await getDatabase()
      const food = await db.foods.findOne(id).exec()
      return food ? food.toJSON() : null
    },
    (callback) => {
      let subscription: any
      getDatabase().then(db => {
        subscription = db.foods.findOne(id).$.subscribe(() => callback())
      })
      return () => subscription?.unsubscribe()
    }
  )
}


export function useCreateFood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Food, 'id' | 'createdAt' | 'updatedAt'>) => {
      const db = await getDatabase()
      const now = Date.now()
      const id = `food_${now}_${Math.random().toString(36).slice(2)}`

      const food = await db.foods.insert({
        id,
        ...data,
        createdAt: now,
        updatedAt: now
      })

      return food.toJSON()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    }
  })
}

export function useUpdateFood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Food> }) => {
      const db = await getDatabase()
      const food = await db.foods.findOne(id).exec()

      if (!food) {
        throw new Error('Food not found')
      }

      // Check if nutrition data changed
      const nutritionChanged = data.calories !== undefined ||
        data.protein !== undefined ||
        data.carbs !== undefined ||
        data.fat !== undefined ||
        data.fiber !== undefined ||
        data.sugar !== undefined ||
        data.servingSize !== undefined

      await food.update({
        $set: {
          ...data,
          updatedAt: Date.now()
        }
      })

      // If nutrition changed, sync all meals containing this food
      if (nutritionChanged) {
        console.log('🍽️ Food nutrition updated, syncing affected meals...')

        // Find all meals that contain this food
        const mealFoods = await db.meal_foods
          .find({ selector: { foodId: id } })
          .exec()

        const mealIds = [...new Set(mealFoods.map(mf => mf.mealId))]
        console.log(`📊 Found ${mealIds.length} meals to sync`)

        // Sync each meal's nutrition
        const { calculateMealNutritionFromFoods } = await import('@/utils/nutrition')

        for (const mealId of mealIds) {
          try {
            const meal = await db.meals.findOne(mealId).exec()
            if (!meal) continue

            // Get meal foods
            const mealFoodsForMeal = await db.meal_foods
              .find({ selector: { mealId }, sort: [{ order: 'asc' }] })
              .exec()

            // Get all foods for this meal
            const foods = await Promise.all(
              mealFoodsForMeal.map(async (mf) => {
                const f = await db.foods.findOne(mf.foodId).exec()
                if (!f) return null
                return {
                  ...f.toJSON(),
                  portion: {
                    amount: mf.amount,
                    unit: mf.unit,
                    order: mf.order
                  }
                }
              })
            )

            const validFoods = foods.filter((f): f is NonNullable<typeof f> => f !== null)

            // Calculate and update nutrition
            const mealWithFoods = {
              ...meal.toJSON(),
              foods: validFoods
            }
            const liveNutrition = calculateMealNutritionFromFoods(mealWithFoods)

            await meal.update({
              $set: {
                totalCalories: liveNutrition.totalCalories,
                totalProtein: liveNutrition.totalProtein,
                totalCarbs: liveNutrition.totalCarbs,
                totalFat: liveNutrition.totalFat,
                totalFiber: liveNutrition.totalFiber,
                totalSugar: liveNutrition.totalSugar,
                updatedAt: Date.now()
              }
            })

            console.log(`✅ Synced meal: ${meal.name}`)
          } catch (err) {
            console.error(`Failed to sync meal ${mealId}:`, err)
          }
        }
      }

      return food.toJSON()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      queryClient.invalidateQueries({ queryKey: ['foods', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['items', variables.id] })
      // Invalidate meals queries to refresh meal lists
      queryClient.invalidateQueries({ queryKey: ['meals'] })
    }
  })
}

export function useDeleteFood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDatabase()
      const food = await db.foods.findOne(id).exec()

      if (!food) {
        throw new Error('Food not found')
      }

      await food.remove()
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] })
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['meals'] })
    }
  })
}


// ==================== MEALS ====================

export function useMeals(profileId?: string) {
  return useRxQuery<Meal[]>(
    profileId ? ['meals', 'profile', profileId] : ['meals'],
    async () => {
      const db = await getDatabase()
      const query = profileId
        ? db.meals.find({ selector: { profileId }, sort: [{ createdAt: 'desc' }] })
        : db.meals.find({ sort: [{ createdAt: 'desc' }] })
      const meals = await query.exec()
      return meals.map(doc => doc.toJSON())
    },
    (callback) => {
      let subscription: any
      getDatabase().then(db => {
        const query = profileId
          ? db.meals.find({ selector: { profileId }, sort: [{ createdAt: 'desc' }] })
          : db.meals.find({ sort: [{ createdAt: 'desc' }] })
        subscription = query.$.subscribe(() => callback())
      })
      return () => subscription?.unsubscribe()
    }
  )
}


export function useMeal(id: string) {
  return useRxQuery<Meal | null>(
    ['meals', id],
    async () => {
      const db = await getDatabase()
      const meal = await db.meals.findOne(id).exec()
      return meal ? meal.toJSON() : null
    },
    (callback) => {
      let subscription: any
      getDatabase().then(db => {
        subscription = db.meals.findOne(id).$.subscribe(() => callback())
      })
      return () => subscription?.unsubscribe()
    }
  )
}


export function useMealWithFoods(id: string) {
  const mealQuery = useMeal(id)
  const mealFoodsQuery = useMealFoods(id)
  const foodsQuery = useFoods(mealQuery.data?.profileId)

  return {
    ...mealQuery,
    isLoading: mealQuery.isLoading || mealFoodsQuery.isLoading || foodsQuery.isLoading,
    data: mealQuery.data && mealFoodsQuery.data && foodsQuery.data
      ? {
          ...mealQuery.data,
          foods: mealFoodsQuery.data
            .map(mf => {
              const food = foodsQuery.data?.find(f => f.id === mf.foodId)
              return food ? {
                ...food,
                portion: {
                  amount: mf.amount,
                  unit: mf.unit,
                  order: mf.order
                }
              } : undefined
            })
            .filter((item): item is (Food & { portion: { amount: number; unit: string; order: number } }) => item !== undefined)
        }
      : null
  }
}


export function useCreateMeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const db = await getDatabase()
      const now = Date.now()
      const id = `meal_${now}_${Math.random().toString(36).slice(2)}`

      const meal = await db.meals.insert({
        id,
        ...data,
        createdAt: now,
        updatedAt: now
      })

      return meal.toJSON()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['meals'] })
    }
  })
}


export function useUpdateMeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Meal> }) => {
      const db = await getDatabase()
      const meal = await db.meals.findOne(id).exec()

      if (!meal) {
        throw new Error('Meal not found')
      }

      await meal.update({
        $set: {
          ...data,
          updatedAt: Date.now()
        }
      })

      return meal.toJSON()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['meals', variables.id] })
    }
  })
}

export function useSyncMealNutrition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mealId: string) => {
      const db = await getDatabase()

      // Get meal with foods
      const meal = await db.meals.findOne(mealId).exec()
      if (!meal) {
        throw new Error('Meal not found')
      }

      // Get meal foods
      const mealFoods = await db.meal_foods
        .find({ selector: { mealId }, sort: [{ order: 'asc' }] })
        .exec()

      // Get all foods for this meal
      const foods = await Promise.all(
        mealFoods.map(async (mf) => {
          const food = await db.foods.findOne(mf.foodId).exec()
          if (!food) return null
          return {
            ...food.toJSON(),
            portion: {
              amount: mf.amount,
              unit: mf.unit,
              order: mf.order
            }
          }
        })
      )

      const validFoods = foods.filter((f): f is NonNullable<typeof f> => f !== null)

      // Calculate live nutrition
      const { calculateMealNutritionFromFoods } = await import('@/utils/nutrition')
      const mealWithFoods = {
        ...meal.toJSON(),
        foods: validFoods
      }
      const liveNutrition = calculateMealNutritionFromFoods(mealWithFoods)

      // Update meal with new nutrition values
      await meal.update({
        $set: {
          totalCalories: liveNutrition.totalCalories,
          totalProtein: liveNutrition.totalProtein,
          totalCarbs: liveNutrition.totalCarbs,
          totalFat: liveNutrition.totalFat,
          totalFiber: liveNutrition.totalFiber,
          totalSugar: liveNutrition.totalSugar,
          updatedAt: Date.now()
        }
      })

      return meal.toJSON()
    },
    onSuccess: (_, mealId) => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['meals', mealId] })
    }
  })
}


export function useDeleteMeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDatabase()
      const meal = await db.meals.findOne(id).exec()

      if (!meal) {
        throw new Error('Meal not found')
      }

      // Delete all meal-food associations
      const mealFoods = await db.meal_foods.find({ selector: { mealId: id } }).exec()
      await Promise.all(mealFoods.map(mf => mf.remove()))

      await meal.remove()
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] })
      queryClient.invalidateQueries({ queryKey: ['meal_foods'] })
      queryClient.invalidateQueries({ queryKey: ['calendar_entries'] })
    }
  })
}


// ==================== MEAL FOODS (Junction Table) ====================

export function useMealFoods(mealId: string) {
  return useRxQuery<MealFood[]>(
    ['meal_foods', 'meal', mealId],
    async () => {
      const db = await getDatabase()
      const mealFoods = await db.meal_foods
        .find({ selector: { mealId }, sort: [{ order: 'asc' }] })
        .exec()
      return mealFoods.map(doc => doc.toJSON())
    },
    (callback) => {
      let subscription: any
      getDatabase().then(db => {
        subscription = db.meal_foods
          .find({ selector: { mealId } })
          .$.subscribe(() => callback())
      })
      return () => subscription?.unsubscribe()
    }
  )
}

export function useCreateMealFood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<MealFood, 'id' | 'createdAt' | 'updatedAt'>) => {
      const db = await getDatabase()
      const now = Date.now()
      const id = `mealfood_${now}_${Math.random().toString(36).slice(2)}`

      const mealFood = await db.meal_foods.insert({
        id,
        ...data,
        createdAt: now,
        updatedAt: now
      })

      return mealFood.toJSON()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meal_foods'] })
      queryClient.invalidateQueries({ queryKey: ['meal_foods', 'meal', data.mealId] })
      queryClient.invalidateQueries({ queryKey: ['meals', data.mealId] })
    }
  })
}

export function useUpdateMealFood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MealFood> }) => {
      const db = await getDatabase()
      const mealFood = await db.meal_foods.findOne(id).exec()

      if (!mealFood) {
        throw new Error('Meal-food association not found')
      }

      await mealFood.update({
        $set: {
          ...data,
          updatedAt: Date.now()
        }
      })

      return mealFood.toJSON()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meal_foods'] })
      queryClient.invalidateQueries({ queryKey: ['meal_foods', 'meal', data.mealId] })
      queryClient.invalidateQueries({ queryKey: ['meals', data.mealId] })
    }
  })
}

export function useDeleteMealFood() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDatabase()
      const mealFood = await db.meal_foods.findOne(id).exec()

      if (!mealFood) {
        throw new Error('Meal-food association not found')
      }

      const mealId = mealFood.mealId
      await mealFood.remove()
      return { id, mealId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meal_foods'] })
      queryClient.invalidateQueries({ queryKey: ['meal_foods', 'meal', data.mealId] })
      queryClient.invalidateQueries({ queryKey: ['meals', data.mealId] })
    }
  })
}

export function useBulkCreateMealFoods() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Array<Omit<MealFood, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const db = await getDatabase()
      const now = Date.now()

      const mealFoods = await Promise.all(
        data.map(async (item, index) => {
          const id = `mealfood_${now}_${index}_${Math.random().toString(36).slice(2)}`
          const mealFood = await db.meal_foods.insert({
            id,
            ...item,
            createdAt: now,
            updatedAt: now
          })
          return mealFood.toJSON()
        })
      )

      return mealFoods
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        const mealId = data[0].mealId
        queryClient.invalidateQueries({ queryKey: ['meal_foods'] })
        queryClient.invalidateQueries({ queryKey: ['meal_foods', 'meal', mealId] })
        queryClient.invalidateQueries({ queryKey: ['meals', mealId] })
      }
    }
  })
}


// ==================== CALENDAR ENTRIES ====================

export function useCalendarEntries() {
  return useRxQuery<CalendarEntry[]>(
    ['calendar_entries'],
    async () => {
      const db = await getDatabase()
      const entries = await db.calendar_entries.find().exec()
      return entries.map(doc => doc.toJSON())
    },
    (callback) => {
      let subscription: any
      getDatabase().then(db => {
        subscription = db.calendar_entries.find().$.subscribe(() => callback())
      })
      return () => subscription?.unsubscribe()
    }
  )
}

export function useCalendarEntry(date: string) {
  return useRxQuery<CalendarEntry | null>(
    ['calendar_entries', date],
    async () => {
      const db = await getDatabase()
      const entry = await db.calendar_entries.findOne(date).exec()
      return entry ? entry.toJSON() : null
    },
    (callback) => {
      let subscription: any
      getDatabase().then(db => {
        subscription = db.calendar_entries.findOne(date).$.subscribe(() => callback())
      })
      return () => subscription?.unsubscribe()
    }
  )
}

export function useCreateCalendarEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<CalendarEntry, 'createdAt' | 'updatedAt'>) => {
      const db = await getDatabase()
      const now = Date.now()

      const entry = await db.calendar_entries.insert({
        ...data,
        createdAt: now,
        updatedAt: now
      })

      return entry.toJSON()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_entries'] })
    }
  })
}

export function useUpdateCalendarEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CalendarEntry> }) => {
      const db = await getDatabase()
      const entry = await db.calendar_entries.findOne(id).exec()

      if (!entry) {
        throw new Error('Calendar entry not found')
      }

      await entry.update({
        $set: {
          ...data,
          updatedAt: Date.now()
        }
      })

      return entry.toJSON()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['calendar_entries'] })
      queryClient.invalidateQueries({ queryKey: ['calendar_entries', variables.id] })
    }
  })
}

export function useDeleteCalendarEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const db = await getDatabase()
      const entry = await db.calendar_entries.findOne(id).exec()

      if (!entry) {
        throw new Error('Calendar entry not found')
      }

      await entry.remove()
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar_entries'] })
    }
  })
}
