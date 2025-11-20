import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Edit, Shirt, Trash2, Check, X, RefreshCw, LoaderCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFood, useMeals, useFoods, useUpdateFood, useDeleteFood } from '@/hooks/useData'
import { MealThumbnail } from '@/components/MealThumbnail'
import { useState, useEffect } from 'react'
import { useSetHeader } from '@/hooks/useHeaderConfig'
import { generateCleanProductImageFromData } from '@/services/ai/gemini'
import { isGeminiConfigured } from '@/services/ai'
import { calculateNetCarbs, getCarbBadgeColor, getCarbTextColor, getCarbBorderColor, getCarbBgOpacity } from '@/utils/nutrition'

export const Route = createFileRoute('/foods/$foodId')({ component: ItemDetailPage })

function ItemDetailPage() {
  const navigate = useNavigate()
  const { foodId } = Route.useParams()
  const { data: item, isLoading, error } = useFood(foodId)
  const { data: allMeals } = useMeals()
  const { data: items, isLoading: itemsLoading } = useFoods()
  const updateItem = useUpdateFood()
  const deleteItem = useDeleteFood()

  const [isEditing, setIsEditing] = useState(false)
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false)
  const [regenerationProgress, setRegenerationProgress] = useState('')
  const [aiConfigured, setAiConfigured] = useState(false)
  const [mealCroppedImages, setMealCroppedImages] = useState<Array<{ mealId: string; mealName: string; image: string }>>([])
  const [allMealsWithFood, setAllMealsWithFood] = useState<Array<{ mealId: string; mealName: string; hasCrop: boolean }>>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [editData, setEditData] = useState({
    name: '',
    category: '',
    brand: '',
    tags: '',
    notes: '',
    // Nutrition data
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    servingSize: 100,
    servingSizeUnit: 'g',
    allergens: [] as string[]
  })

  // Check if AI is configured
  useEffect(() => {
    isGeminiConfigured().then(setAiConfigured)
  }, [])

  // Load cropped images from meals containing this food
  useEffect(() => {
    const loadMealImages = async () => {
      try {
        const { getDatabase } = await import('@/db')
        const db = await getDatabase()

        // Find all meals containing this food
        const mealFoods = await db.meal_foods.find({ selector: { foodId } }).exec()
        console.log('🔍 Found meal-food associations:', mealFoods.length)

        const croppedImages: Array<{ mealId: string; mealName: string; image: string }> = []
        const allMeals: Array<{ mealId: string; mealName: string; hasCrop: boolean }> = []

        for (const mealFood of mealFoods) {
          const mealFoodData = mealFood.toJSON()
          console.log('📋 MealFood data:', mealFoodData)

          // Get the meal
          const meal = await db.meals.findOne(mealFoodData.mealId).exec()
          console.log('🍽️ Meal:', meal ? meal.toJSON() : 'not found')

          if (meal) {
            const mealData = meal.toJSON()
            console.log('Has mealImage:', !!mealData.mealImage, 'Has boundingBox:', !!mealFoodData.boundingBox)

            const hasCropData = !!(mealData.mealImage && mealFoodData.boundingBox)

            // Add to all meals list
            allMeals.push({
              mealId: mealData.id,
              mealName: mealData.name,
              hasCrop: hasCropData
            })

            if (hasCropData) {
              // Crop the image using the bounding box
              try {
                console.log('✂️ Cropping image for meal:', mealData.name)
                const croppedImage = await cropImageFromMeal(mealData.mealImage, mealFoodData.boundingBox)
                croppedImages.push({
                  mealId: mealData.id,
                  mealName: mealData.name,
                  image: croppedImage
                })
                console.log('✅ Successfully cropped image for:', mealData.name)
              } catch (err) {
                console.warn('Failed to crop image from meal:', mealData.id, err)
              }
            }
          }
        }

        console.log('📸 Total cropped images:', croppedImages.length)
        console.log('📋 Total meals with this food:', allMeals.length)
        setMealCroppedImages(croppedImages)
        setAllMealsWithFood(allMeals)
      } catch (err) {
        console.error('Failed to load meal images:', err)
      }
    }

    if (foodId) {
      loadMealImages()
    }
  }, [foodId])

  // Helper function to crop image from meal
  const cropImageFromMeal = async (imageDataUrl: string, boundingBox: any): Promise<string> => {
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

  // Update edit data when item loads
  useEffect(() => {
    if (item) {
      setEditData({
        name: item.name || '',
        category: item.category || '',
        brand: item.brand || '',
        tags: item.tags || '',
        notes: item.notes || '',
        // Nutrition data
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        fiber: item.fiber || 0,
        sugar: item.sugar || 0,
        sodium: item.sodium || 0,
        servingSize: item.servingSize || 100,
        servingSizeUnit: item.servingSizeUnit || 'g',
        allergens: item.allergens || []
      })
    }
  }, [item])

  const handleSaveEdit = async () => {
    try {
      await updateItem.mutateAsync({
        id: foodId,
        data: editData
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update item:', err)
      alert('Failed to update item')
    }
  }

  const handleCancelEdit = () => {
    if (item) {
      setEditData({
        name: item.name || '',
        category: item.category || '',
        brand: item.brand || '',
        tags: item.tags || '',
        notes: item.notes || '',
        // Nutrition data
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        fiber: item.fiber || 0,
        sugar: item.sugar || 0,
        sodium: item.sodium || 0,
        servingSize: item.servingSize || 100,
        servingSizeUnit: item.servingSizeUnit || 'g',
        allergens: item.allergens || []
      })
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return
    }

    try {
      await deleteItem.mutateAsync(foodId)
      navigate({ to: '/pantry' })
    } catch (err) {
      console.error('Failed to delete item:', err)
      alert('Failed to delete item')
    }
  }

  const handleRegenerateImage = async () => {
    if (!item?.photo) {
      alert('No image to regenerate')
      return
    }

    if (!confirm('Regenerate a clean AI-processed version of this food image?')) {
      return
    }

    setIsRegeneratingImage(true)
    setRegenerationProgress('Initializing...')

    try {
      // Try to find the meal that contains this food item to get original image + bounding box
      const { getDatabase } = await import('@/db')
      const db = await getDatabase()

      setRegenerationProgress('Finding original meal photo...')
      const mealFoods = await db.meal_foods.find({ selector: { foodId } }).exec()

      let imageToRegenerate = item.photo // Default to current photo

      if (mealFoods.length > 0) {
        // Use the most recent meal that contains this food
        const mealFood = mealFoods[0].toJSON()
        const meal = await db.meals.findOne(mealFood.mealId).exec()

        if (meal && meal.mealImage && mealFood.boundingBox) {
          setRegenerationProgress('Re-cropping from original meal photo...')
          console.log('Found meal with original image and bounding box, re-cropping...', mealFood.boundingBox)

          // Recrop from the original meal image using the bounding box
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

          imageToRegenerate = await cropImage(meal.mealImage, mealFood.boundingBox)
          console.log('Successfully re-cropped from original meal image')
        }
      }

      const newImage = await generateCleanProductImageFromData(
        imageToRegenerate,
        (message, progress) => {
          setRegenerationProgress(`${message} (${Math.round(progress)}%)`)
          console.log(`${message} (${progress}%)`)
        },
        {
          name: item.name,
          category: item.category,
        }
      )

      setRegenerationProgress('Saving...')
      await updateItem.mutateAsync({
        id: foodId,
        data: { photo: newImage }
      })

      setRegenerationProgress('Complete!')
      setTimeout(() => {
        setRegenerationProgress('')
      }, 1000)
    } catch (err) {
      console.error('Failed to regenerate image:', err)
      alert('Failed to regenerate image. Please try again.')
      setRegenerationProgress('')
    } finally {
      setIsRegeneratingImage(false)
    }
  }

  // Configure unified header based on editing state
  useSetHeader({
    showBack: true,
    backTo: '/pantry',
    section: 'Pantry',
    title: isEditing ? 'Edit' : 'Details',
    pageActions: isEditing ? [
      {
        icon: X,
        label: 'Cancel',
        onClick: handleCancelEdit,
      },
      {
        icon: Check,
        label: 'Save Changes',
        onClick: handleSaveEdit,
      },
    ] : [
      ...(aiConfigured && item?.photo ? [{
        icon: RefreshCw,
        label: isRegeneratingImage ? 'Regenerating...' : 'Regenerate Image',
        onClick: handleRegenerateImage,
        disabled: isRegeneratingImage,
      }] : []),
      {
        icon: Edit,
        label: 'Edit Item',
        onClick: () => setIsEditing(true),
      },
      {
        icon: Trash2,
        label: 'Delete Item',
        onClick: handleDelete,
        variant: 'destructive' as const,
      },
    ],
  })

  // We'll use mealCroppedImages which already has the meal data
  // No need for mealsUsingItem anymore

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading item...</p>
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Item not found</p>
          <button
            onClick={() => navigate({ to: '/pantry' })}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to Pantry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      {/* AI Image Regeneration Loading Overlay */}
      {isRegeneratingImage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-sm mx-4">
            <div className="flex flex-col items-center gap-4">
              <LoaderCircle className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Regenerating Image
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {regenerationProgress || 'Processing...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        <div className="px-4 py-6 space-y-6">
          {/* Item Photo Carousel */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800">
            {(() => {
              // Build array of all available images
              const allImages = []

              // Add current photo first (if exists)
              if (item.photo) {
                allImages.push({
                  src: item.photo,
                  label: 'Current Photo',
                  type: 'current'
                })
              }

              // Add meal cropped images (skip if it matches the current photo to avoid duplicates)
              mealCroppedImages.forEach(mealImg => {
                // Skip if this cropped image is the same as the current photo
                if (item.photo && mealImg.image === item.photo) {
                  console.log('⏭️ Skipping duplicate image from meal:', mealImg.mealName)
                  return
                }

                allImages.push({
                  src: mealImg.image,
                  label: `From "${mealImg.mealName}"`,
                  type: 'meal',
                  mealId: mealImg.mealId
                })
              })

              if (allImages.length === 0) {
                return (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl p-12 border border-blue-200 dark:border-blue-800">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Shirt className="w-20 h-20 text-blue-400 dark:text-blue-600" />
                      <div className="text-center">
                        <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">{item.name}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-500">{item.category}</p>
                      </div>
                    </div>
                  </div>
                )
              }

              const currentImage = allImages[currentImageIndex] || allImages[0]

              return (
                <div className="relative w-full">
                  <img
                    src={currentImage.src}
                    alt={item.name}
                    className="w-full h-96 object-cover"
                  />

                  {/* Image Label */}
                  <div className="absolute top-3 left-3">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      currentImage.type === 'current'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}>
                      {currentImage.label}
                    </div>
                  </div>

                  {/* Navigation Arrows (only show if multiple images) */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-medium">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  )}

                  {/* Food Name Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white font-semibold text-lg">{item.name}</p>
                    <p className="text-white/90 text-sm">{item.category}</p>
                  </div>
                </div>
              )
            })()}
          </section>

          {/* Item Details */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Blue Grilled Chicken"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    <option value="Protein">Protein</option>
                    <option value="Carbs">Carbs</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Fats">Fats</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Prepared">Prepared</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={editData.brand}
                    onChange={(e) => setEditData({ ...editData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Kraft, Organic Valley"
                  />
                </div>

                {/* Nutrition Information Section */}
                <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Nutrition Information</h3>

                  {/* Serving Size */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Serving Size *
                      </label>
                      <input
                        type="number"
                        value={editData.servingSize}
                        onChange={(e) => setEditData({ ...editData, servingSize: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="100"
                        min="0"
                        step="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Unit *
                      </label>
                      <select
                        value={editData.servingSizeUnit}
                        onChange={(e) => setEditData({ ...editData, servingSizeUnit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="oz">oz</option>
                        <option value="cup">cup</option>
                        <option value="piece">piece</option>
                        <option value="serving">serving</option>
                      </select>
                    </div>
                  </div>

                  {/* CARBOHYDRATES SECTION */}
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-3">
                      Carbohydrates
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Total Carbs (g) *
                        </label>
                        <input
                          type="number"
                          value={editData.carbs}
                          onChange={(e) => setEditData({ ...editData, carbs: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fiber (g)
                        </label>
                        <input
                          type="number"
                          value={editData.fiber}
                          onChange={(e) => setEditData({ ...editData, fiber: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sugar (g)
                        </label>
                        <input
                          type="number"
                          value={editData.sugar}
                          onChange={(e) => setEditData({ ...editData, sugar: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>

                    {/* NET CARBS DISPLAY - Calculated */}
                    <div className={`mt-3 p-3 rounded-lg border-2 ${getCarbBorderColor(calculateNetCarbs(editData.carbs || 0, editData.fiber || 0))} ${getCarbBgOpacity(calculateNetCarbs(editData.carbs || 0, editData.fiber || 0))}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 font-medium">
                          Net Carbs (calculated)
                        </span>
                        <span className={`text-xl font-bold ${getCarbTextColor(calculateNetCarbs(editData.carbs || 0, editData.fiber || 0))}`}>
                          {calculateNetCarbs(editData.carbs || 0, editData.fiber || 0)}g
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MACRONUTRIENTS SECTION */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-3">
                      Macronutrients
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Protein (g) *
                        </label>
                        <input
                          type="number"
                          value={editData.protein}
                          onChange={(e) => setEditData({ ...editData, protein: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="31"
                          min="0"
                          step="0.1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Fat (g) *
                        </label>
                        <input
                          type="number"
                          value={editData.fat}
                          onChange={(e) => setEditData({ ...editData, fat: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="3.6"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* OTHER SECTION */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-3">
                      Other
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Calories *
                        </label>
                        <input
                          type="number"
                          value={editData.calories}
                          onChange={(e) => setEditData({ ...editData, calories: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="165"
                          min="0"
                          step="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Sodium (mg)
                        </label>
                        <input
                          type="number"
                          value={editData.sodium}
                          onChange={(e) => setEditData({ ...editData, sodium: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="74"
                          min="0"
                          step="1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Allergens (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editData.allergens.join(', ')}
                      onChange={(e) => setEditData({
                        ...editData,
                        allergens: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., milk, eggs, wheat"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={editData.tags}
                    onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., #protein #grilled #lean"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes about this item..."
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">{item.name}</h2>

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-gray-600 dark:text-gray-400">Category:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{item.category}</span>
                  </div>
                  {item.color && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-600 dark:text-gray-400">Color:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{item.color}</span>
                    </div>
                  )}
                  {item.size && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-600 dark:text-gray-400">Size:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{item.size}</span>
                    </div>
                  )}
                  {item.brand && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-600 dark:text-gray-400">Brand:</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">{item.brand}</span>
                    </div>
                  )}
                  {item.tags && (
                    <div className="py-2">
                      <span className="text-gray-600 dark:text-gray-400">Tags: {item.tags}</span>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-gray-600 dark:text-gray-400 mb-2">Notes:</h3>
                    <div className="min-h-[60px] bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-gray-700 dark:text-gray-300 text-sm">
                      {item.notes}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Nutrition Information */}
          {!isEditing && (
            <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Nutrition Facts</h2>

              <div className="space-y-4">
                {/* Serving Size */}
                <div className="pb-3 border-b-2 border-gray-900 dark:border-gray-100">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Serving Size</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {item.servingSize} {item.servingSizeUnit}
                  </div>
                </div>

                {/* NET CARBS - HERO */}
                <div className={`py-3 px-4 rounded-lg border-2 ${getCarbBorderColor(calculateNetCarbs(item.carbs, item.fiber))} ${getCarbBgOpacity(calculateNetCarbs(item.carbs, item.fiber))}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🥦</span>
                      <span className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 font-medium">Net Carbs</span>
                    </div>
                    <span className={`text-3xl font-bold ${getCarbTextColor(calculateNetCarbs(item.carbs, item.fiber))}`}>
                      {calculateNetCarbs(item.carbs, item.fiber)}g
                    </span>
                  </div>
                </div>

                {/* Carbohydrate Breakdown */}
                <div className="py-3 border-b-2 border-gray-900 dark:border-gray-100">
                  <div className="font-semibold mb-3 text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wide">
                    Carbohydrate Breakdown
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Total Carbs</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.carbs}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Fiber</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.fiber || 0}g</span>
                    </div>
                    {item.sugar !== undefined && item.sugar > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Sugar</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.sugar}g</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Macronutrients */}
                <div className="py-3 border-b-2 border-gray-900 dark:border-gray-100">
                  <div className="font-semibold mb-3 text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wide">
                    Macronutrients
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Protein</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.protein}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Fat</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.fat}g</span>
                    </div>
                  </div>
                </div>

                {/* Other */}
                <div className="py-3">
                  <div className="font-semibold mb-3 text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wide">
                    Other
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Calories</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.calories}</span>
                    </div>
                    {item.sodium !== undefined && item.sodium > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700 dark:text-gray-300">Sodium</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.sodium}mg</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Allergens */}
                {item.allergens && item.allergens.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Allergens:</h3>
                    <div className="flex flex-wrap gap-2">
                      {item.allergens.map((allergen, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-sm font-medium"
                        >
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Used in Meals */}
          {allMealsWithFood.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Appears in Meals ({allMealsWithFood.length})
                </h2>
                <Link
                  to="/meals"
                  className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-500"
                >
                  View All Meals
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {allMealsWithFood.map((mealInfo) => {
                  // Find the meal to get the whole meal image
                  const meal = allMeals?.find(m => m.id === mealInfo.mealId)

                  return (
                    <Link
                      key={mealInfo.mealId}
                      to="/meals/$mealId"
                      params={{ mealId: mealInfo.mealId }}
                      className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                    >
                      {/* Whole Meal Image or Placeholder */}
                      {meal?.mealImage ? (
                        <img
                          src={meal.mealImage}
                          alt={mealInfo.mealName}
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 h-32 flex items-center justify-center">
                          <div className="text-center">
                            <Shirt className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-1" />
                            <p className="text-[10px] text-gray-500 dark:text-gray-500">No image</p>
                          </div>
                        </div>
                      )}

                      {/* Meal Name */}
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {mealInfo.mealName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Tap to view meal
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
