import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Save, Camera, UtensilsCrossed, Sparkles, Loader2, Search, Plus, X, Flame } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useFoods, useCreateMeal, useBulkCreateMealFoods, useCreateFood } from '@/hooks/useData'
import { useProfile } from '@/hooks/useProfile'
import { useSetHeader } from '@/hooks/useHeaderConfig'
import { getTempImages, clearTempImages } from '@/utils/tempImageStorage'
import { InlineFoodItemEditor, type DetectedFoodFormData } from '@/components/InlineFoodItemEditor'
import { FoodMatcher, type DetectedFoodData } from '@/components/FoodMatcher'
import type { Food } from '@/types'
import { calculateNetCarbs, getCarbBadgeColor, getCarbTextColor, getCarbBorderColor, getCarbBgOpacity } from '@/utils/nutrition'

export const Route = createFileRoute('/meals/new')({ component: CreateMealPage })

interface MealFormData {
  name: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  timestamp: number
  tags: string
  notes: string
  mealImage: string
}

interface ConfirmedFood {
  tempId: string
  matchedFoodId?: string // If using existing food
  foodData?: DetectedFoodFormData // If creating new food
  portion: {
    amount: number
    unit: string
  }
  boundingBox?: { // Store bounding box for regeneration from meal image
    x: number
    y: number
    width: number
    height: number
  }
}

function CreateMealPage() {
  const navigate = useNavigate()
  const { activeProfile } = useProfile()
  const { data: existingFoods } = useFoods(activeProfile?.id)
  const createMeal = useCreateMeal()
  const bulkCreateMealFoods = useBulkCreateMealFoods()
  const createFood = useCreateFood()

  const [mealForm, setMealForm] = useState<MealFormData>({
    name: '',
    mealType: 'lunch',
    timestamp: Date.now(),
    tags: '',
    notes: '',
    mealImage: ''
  })

  const [detectedFoods, setDetectedFoods] = useState<DetectedFoodFormData[]>([])
  const [confirmedFoods, setConfirmedFoods] = useState<ConfirmedFood[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showMatcher, setShowMatcher] = useState<{ food: DetectedFoodFormData; index: number } | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const hasLoadedImages = useRef(false)

  // Load temp images from IndexedDB if coming from AI Analyze button
  useEffect(() => {
    const loadTempImages = async () => {
      if (hasLoadedImages.current) return
      hasLoadedImages.current = true

      const images = await getTempImages()
      if (images.length > 0) {
        console.log('📸 Loaded temp images:', images.length)
        await clearTempImages()

        // Use first image as meal image
        setMealForm(prev => ({ ...prev, mealImage: images[0] }))

        // Start AI analysis
        await analyzeImage(images[0])
      }
    }

    loadTempImages()
  }, [])

  // Analyze image with AI
  const analyzeImage = async (imageDataUrl: string) => {
    if (!activeProfile) return

    setIsAnalyzing(true)
    setAnalysisProgress(10)

    try {
      // Convert data URL to File
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'meal.jpg', { type: 'image/jpeg' })

      setAnalysisProgress(30)

      // Import AI service dynamically
      const { extractMultipleFoodsMetadata } = await import('@/services/ai/gemini')

      setAnalysisProgress(50)

      // Extract food metadata
      const foodsMetadata = await extractMultipleFoodsMetadata(file, (message, progress) => {
        setAnalysisProgress(50 + progress * 0.3)
      })

      setAnalysisProgress(80)

      // Crop images and create detected food items
      const detectedItems: DetectedFoodFormData[] = []

      for (let i = 0; i < foodsMetadata.length; i++) {
        const metadata = foodsMetadata[i]
        let croppedImage = imageDataUrl

        if (metadata.metadata?.boundingBox) {
          try {
            croppedImage = await cropImage(imageDataUrl, metadata.metadata.boundingBox)
          } catch (err) {
            console.warn('Failed to crop image:', err)
          }
        }

        detectedItems.push({
          id: `detected-${Date.now()}-${i}`,
          name: metadata.name,
          category: metadata.category,
          imageData: croppedImage,
          originalImageData: imageDataUrl,
          croppedImageData: croppedImage,
          generatedImageData: undefined,
          boundingBox: metadata.metadata?.boundingBox,
          nutrition: {
            calories: metadata.calories || 0,
            protein: metadata.protein || 0,
            carbs: metadata.carbs || 0,
            fat: metadata.fat || 0,
            fiber: metadata.fiber || 0,
            sugar: metadata.sugar || 0,
            sodium: metadata.sodium || 0
          },
          servingSize: metadata.servingSize || 100,
          servingSizeUnit: metadata.servingSizeUnit || 'g',
          estimatedPortion: metadata.estimatedPortion || '100g',
          brand: metadata.metadata?.brand || metadata.brand,
          tags: metadata.tags || '',
          notes: metadata.notes || '',
          confidence: metadata.confidence || 0.9,
          saveToPantry: false, // Default to not saving to pantry
          portion: {
            amount: metadata.servingSize || 100,
            unit: metadata.servingSizeUnit || 'g'
          }
        })
      }

      setDetectedFoods(detectedItems)
      setAnalysisProgress(100)

      // Auto-generate meal name
      if (detectedItems.length > 0 && !mealForm.name) {
        const mealName = detectedItems.length > 2
          ? `${detectedItems[0].name} with ${detectedItems.length - 1} sides`
          : detectedItems.map(f => f.name).join(' & ')
        setMealForm(prev => ({ ...prev, name: mealName }))
      }
    } catch (error) {
      console.error('AI analysis failed:', error)
      alert('AI analysis failed. You can still add foods manually.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Crop image helper
  const cropImage = async (imageDataUrl: string, boundingBox: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')

          const cropX = Math.max(0, Math.floor(boundingBox.x))
          const cropY = Math.max(0, Math.floor(boundingBox.y))
          const cropWidth = Math.min(img.width - cropX, Math.ceil(boundingBox.width))
          const cropHeight = Math.min(img.height - cropY, Math.ceil(boundingBox.height))

          if (cropWidth <= 0 || cropHeight <= 0) {
            throw new Error(`Invalid crop dimensions`)
          }

          canvas.width = cropWidth
          canvas.height = cropHeight
          ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
          resolve(canvas.toDataURL('image/jpeg', 0.95))
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageDataUrl
    })
  }

  // Handle photo capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const imageData = reader.result as string
      setMealForm(prev => ({ ...prev, mealImage: imageData }))
      analyzeImage(imageData)
    }
    reader.readAsDataURL(file)
  }

  // Handle detected food changes
  const handleDetectedFoodChange = (index: number, data: DetectedFoodFormData) => {
    setDetectedFoods(prev => prev.map((f, i) => i === index ? data : f))
  }

  // Handle removing detected food
  const handleRemoveDetectedFood = (index: number) => {
    setDetectedFoods(prev => prev.filter((_, i) => i !== index))
  }

  // Confirm detected food (use as-is, create new)
  const handleConfirmDetectedFood = (index: number) => {
    const food = detectedFoods[index]

    setConfirmedFoods(prev => [...prev, {
      tempId: food.id,
      foodData: food,
      portion: food.portion,
      boundingBox: food.boundingBox // Preserve bounding box for regeneration
    }])

    // Remove from detected list
    setDetectedFoods(prev => prev.filter((_, i) => i !== index))
  }

  // Show matcher for detected food
  const handleMatchFood = (index: number) => {
    setShowMatcher({ food: detectedFoods[index], index })
  }

  // Handle selecting matched food from pantry
  const handleSelectMatch = (food: Food) => {
    if (!showMatcher) return

    const detectedFood = showMatcher.food

    setConfirmedFoods(prev => [...prev, {
      tempId: detectedFood.id,
      matchedFoodId: food.id,
      portion: detectedFood.portion,
      boundingBox: detectedFood.boundingBox // Preserve bounding box even when matching existing food
    }])

    // Remove from detected list
    setDetectedFoods(prev => prev.filter((_, i) => i !== showMatcher.index))
    setShowMatcher(null)
  }

  // Handle creating new food from matcher
  const handleCreateNewFromMatcher = () => {
    if (!showMatcher) return

    const index = showMatcher.index
    setShowMatcher(null)
    handleConfirmDetectedFood(index)
  }

  // Remove confirmed food
  const handleRemoveConfirmedFood = (tempId: string) => {
    setConfirmedFoods(prev => prev.filter(f => f.tempId !== tempId))
  }

  // Generate AI image for a food
  const handleGenerateAIImage = async (croppedImageData: string): Promise<string> => {
    const { generateCleanProductImageFromData } = await import('@/services/ai/gemini')
    return await generateCleanProductImageFromData(croppedImageData)
  }

  // Calculate total nutrition
  const calculateTotalNutrition = () => {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }

    for (const confirmed of confirmedFoods) {
      if (confirmed.matchedFoodId) {
        // Use existing food
        const food = existingFoods?.find(f => f.id === confirmed.matchedFoodId)
        if (food) {
          const multiplier = confirmed.portion.amount / food.servingSize
          totals.calories += Math.round(food.calories * multiplier)
          totals.protein += Math.round(food.protein * multiplier)
          totals.carbs += Math.round(food.carbs * multiplier)
          totals.fat += Math.round(food.fat * multiplier)
          totals.fiber += Math.round((food.fiber || 0) * multiplier)
          totals.sugar += Math.round((food.sugar || 0) * multiplier)
        }
      } else if (confirmed.foodData) {
        // Use new food data
        const multiplier = confirmed.portion.amount / confirmed.foodData.servingSize
        totals.calories += Math.round(confirmed.foodData.nutrition.calories * multiplier)
        totals.protein += Math.round(confirmed.foodData.nutrition.protein * multiplier)
        totals.carbs += Math.round(confirmed.foodData.nutrition.carbs * multiplier)
        totals.fat += Math.round(confirmed.foodData.nutrition.fat * multiplier)
        totals.fiber += Math.round((confirmed.foodData.nutrition.fiber || 0) * multiplier)
        totals.sugar += Math.round((confirmed.foodData.nutrition.sugar || 0) * multiplier)
      }
    }

    return totals
  }

  // Save meal
  const handleSave = async () => {
    if (!mealForm.name.trim()) {
      alert('Please enter a meal name')
      return
    }

    if (confirmedFoods.length === 0 && detectedFoods.length === 0) {
      alert('Please add at least one food to the meal')
      return
    }

    if (!activeProfile) {
      alert('No active profile found')
      return
    }

    // Confirm if there are still detected foods not reviewed
    if (detectedFoods.length > 0) {
      if (!confirm(`You have ${detectedFoods.length} detected food(s) not added to the meal. Continue anyway?`)) {
        return
      }
    }

    setSaving(true)

    try {
      const foodIdMap: Map<string, string> = new Map()

      // First, create any new foods
      for (const confirmed of confirmedFoods) {
        if (confirmed.foodData && !confirmed.matchedFoodId) {
          const foodData = confirmed.foodData

          // Only create if saveToPantry is true OR if we need it for the meal
          const newFood = await createFood.mutateAsync({
            name: foodData.name,
            category: foodData.category,
            photo: foodData.imageData,
            brand: foodData.brand || '',
            tags: foodData.tags || '',
            notes: foodData.notes || '',
            calories: foodData.nutrition.calories,
            protein: foodData.nutrition.protein,
            carbs: foodData.nutrition.carbs,
            fat: foodData.nutrition.fat,
            fiber: foodData.nutrition.fiber,
            sugar: foodData.nutrition.sugar,
            sodium: foodData.nutrition.sodium,
            servingSize: foodData.servingSize,
            servingSizeUnit: foodData.servingSizeUnit,
            isRecipe: false,
            profileId: activeProfile.id
          })

          foodIdMap.set(confirmed.tempId, newFood.id)
        } else if (confirmed.matchedFoodId) {
          foodIdMap.set(confirmed.tempId, confirmed.matchedFoodId)
        }
      }

      // Calculate totals
      const totals = calculateTotalNutrition()

      // Create meal
      const meal = await createMeal.mutateAsync({
        name: mealForm.name,
        mealType: mealForm.mealType,
        timestamp: mealForm.timestamp,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        totalFiber: totals.fiber,
        totalSugar: totals.sugar,
        mealImage: mealForm.mealImage || undefined,
        tags: mealForm.tags || undefined,
        notes: mealForm.notes || undefined,
        profileId: activeProfile.id
      })

      // Create meal-food associations
      const mealFoodAssociations = confirmedFoods.map((confirmed, index) => ({
        mealId: meal.id,
        foodId: foodIdMap.get(confirmed.tempId)!,
        amount: confirmed.portion.amount,
        unit: confirmed.portion.unit,
        order: index,
        boundingBox: confirmed.boundingBox // Store bounding box for image regeneration
      })).filter(assoc => assoc.foodId) // Filter out any missing food IDs

      if (mealFoodAssociations.length > 0) {
        await bulkCreateMealFoods.mutateAsync(mealFoodAssociations)
      }

      // Success! Navigate to meals page
      navigate({ to: '/meals' })
    } catch (error) {
      console.error('Failed to create meal:', error)
      alert('Failed to save meal. Please try again.')
      setSaving(false)
    }
  }

  const totalNutrition = calculateTotalNutrition()

  // Configure header
  useSetHeader({
    showBack: true,
    backTo: '/meals',
    section: 'Meals',
    title: 'New Meal',
    pageActions: [
      {
        icon: Save,
        label: saving ? 'Saving...' : 'Save',
        onClick: handleSave,
        disabled: saving || isAnalyzing
      }
    ]
  })

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-20">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Meal Photo / AI Scan */}
        <div>
          {mealForm.mealImage ? (
            <div className="relative">
              <img
                src={mealForm.mealImage}
                alt="Meal"
                className="w-full h-48 object-cover rounded-xl"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-white" />
                  <div className="text-white text-sm font-medium">
                    Analyzing meal... {Math.round(analysisProgress)}%
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl flex flex-col items-center justify-center gap-3 hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-colors border-2 border-dashed border-purple-300 dark:border-purple-700"
            >
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-full">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800 dark:text-gray-100">AI Meal Scan</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Take a photo to detect foods</p>
              </div>
            </button>
          )}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
        </div>

        {/* Detected Foods (Pending Review) */}
        {detectedFoods.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Detected Foods ({detectedFoods.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Review and add to your meal, or match with existing foods from your pantry
            </p>
            <div className="space-y-4">
              {detectedFoods.map((food, index) => (
                <div key={food.id} className="space-y-2">
                  <InlineFoodItemEditor
                    foodData={food}
                    onChange={(data) => handleDetectedFoodChange(index, data)}
                    onGenerateAIImage={handleGenerateAIImage}
                    onRemove={() => handleRemoveDetectedFood(index)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMatchFood(index)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      <Search className="w-4 h-4" />
                      Find Similar
                    </button>
                    <button
                      onClick={() => handleConfirmDetectedFood(index)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Meal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
          <label className="block mb-4">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Meal Name *
            </span>
            <input
              type="text"
              value={mealForm.name}
              onChange={(e) => setMealForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Grilled Chicken Salad"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Meal Type *
            </span>
            <select
              value={mealForm.mealType}
              onChange={(e) => setMealForm(prev => ({ ...prev, mealType: e.target.value as any }))}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </label>

          <label className="block mb-4">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Tags (optional)
            </span>
            <input
              type="text"
              value={mealForm.tags}
              onChange={(e) => setMealForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g., high-protein, low-carb"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
              Notes (optional)
            </span>
            <textarea
              value={mealForm.notes}
              onChange={(e) => setMealForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes about this meal..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </label>
        </div>

        {/* Confirmed Foods in Meal */}
        {confirmedFoods.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
              Foods in Meal ({confirmedFoods.length})
            </h2>
            <div className="space-y-3">
              {confirmedFoods.map((confirmed) => {
                const food = confirmed.matchedFoodId
                  ? existingFoods?.find(f => f.id === confirmed.matchedFoodId)
                  : null

                const displayData = food || confirmed.foodData

                if (!displayData) return null

                const multiplier = confirmed.portion.amount / (food?.servingSize || confirmed.foodData?.servingSize || 100)
                const calories = Math.round((food?.calories || confirmed.foodData?.nutrition.calories || 0) * multiplier)
                const protein = Math.round((food?.protein || confirmed.foodData?.nutrition.protein || 0) * multiplier)

                return (
                  <div key={confirmed.tempId} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <img
                      src={food?.photo || confirmed.foodData?.imageData || ''}
                      alt={food?.name || confirmed.foodData?.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                        {food?.name || confirmed.foodData?.name}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {confirmed.portion.amount}{confirmed.portion.unit} • {calories} cal • {protein}g protein
                      </p>
                      {confirmed.matchedFoodId && (
                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full mt-1 inline-block">
                          From Pantry
                        </span>
                      )}
                      {confirmed.foodData?.saveToPantry && (
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full mt-1 inline-block ml-1">
                          Saving to Pantry
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveConfirmedFood(confirmed.tempId)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Nutrition Summary */}
        {confirmedFoods.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Total Nutrition</h2>

            <div className="space-y-3">
              {/* Net Carbs - Prominent */}
              <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${getCarbBorderColor(calculateNetCarbs(totalNutrition.carbs, totalNutrition.fiber))} ${getCarbBgOpacity(calculateNetCarbs(totalNutrition.carbs, totalNutrition.fiber))}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥦</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Net Carbs</span>
                </div>
                <div className={`text-2xl font-bold ${getCarbTextColor(calculateNetCarbs(totalNutrition.carbs, totalNutrition.fiber))}`}>
                  {calculateNetCarbs(totalNutrition.carbs, totalNutrition.fiber)}g
                </div>
              </div>

              {/* Carb Breakdown */}
              <div className="flex items-center justify-center text-sm px-3 text-gray-600 dark:text-gray-400">
                <span>
                  {totalNutrition.carbs}g carbs • {totalNutrition.fiber || 0}g fiber
                  {totalNutrition.sugar > 0 && ` • ${totalNutrition.sugar}g sugar`}
                </span>
              </div>

              {/* Macros Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Protein</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{totalNutrition.protein}g</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Fat</div>
                  <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{totalNutrition.fat}g</div>
                </div>
              </div>

              {/* Calories - De-emphasized */}
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <Flame className="w-3 h-3" />
                <span className="text-sm">{totalNutrition.calories} cal</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Food Matcher Modal */}
      {showMatcher && (
        <FoodMatcher
          detectedFood={{
            name: showMatcher.food.name,
            category: showMatcher.food.category,
            nutrition: showMatcher.food.nutrition,
            imageData: showMatcher.food.imageData
          }}
          existingFoods={existingFoods || []}
          onSelectMatch={handleSelectMatch}
          onCreateNew={handleCreateNewFromMatcher}
          onCancel={() => setShowMatcher(null)}
        />
      )}
    </div>
  )
}
