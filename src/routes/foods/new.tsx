import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Camera,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  ChevronRight,
  Settings,
  Trash2,
} from 'lucide-react'
import { useState, useRef } from 'react'
import { useCreateFood, useDeleteFood, useUpdateFood, useFoods } from '@/hooks/useData'
import { useProfile } from '@/hooks/useProfile'
import { extractFoodsFromImage, isGeminiConfigured, generateMealSuggestions, type AIGeneratedFood } from '@/services/ai'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/foods/new')({ component: AddNewFoodPage })

interface FoodFormData {
  id?: string // Food ID after saving
  name: string
  category: string
  hasPhoto: boolean
  aiGenerated?: boolean
  imageData?: string // AI-generated product image (base64 data URL)
  metadata?: AIGeneratedFood['metadata']
  saved?: boolean // Track if food has been saved
}

function AddNewFoodPage() {
  const navigate = useNavigate()
  const createFood = useCreateFood()
  const updateFood = useUpdateFood()
  const deleteFood = useDeleteFood()
  const { activeProfile } = useProfile()

  // Photo state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // AI state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiProgress, setAIProgress] = useState({ message: '', progress: 0 })
  const [hasGeminiKey, setHasGeminiKey] = useState(false)

  // Multi-form state
  const [foods, setFoods] = useState<FoodFormData[]>([{
    name: '',
    category: '',
    hasPhoto: false,
    aiGenerated: false,
  }])
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showMealDialog, setShowMealDialog] = useState(false)
  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false)

  // Query all foods to get full details for AI generation
  const { data: allFoods } = useFoods(activeProfile?.id)

  // Check if Gemini is configured
  useState(() => {
    isGeminiConfigured().then(setHasGeminiKey)
  })

  const currentFood = foods[currentFoodIndex]

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('Photo size must be less than 10MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    setSelectedFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setPhotoPreview(result)
      // Update all foods to have photo
      setFoods(foods => foods.map(food => ({ ...food, hasPhoto: true })))
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setSelectedFile(null)
    setFoods(foods => foods.map(food => ({ ...food, hasPhoto: false })))
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleAIAnalyze = async () => {
    if (!selectedFile) return
    if (!hasGeminiKey) {
      if (confirm('Google AI API key not configured. Go to Settings?')) {
        navigate({ to: '/settings/ai' })
      }
      return
    }

    setIsAnalyzing(true)

    try {
      const extractedFoods = await extractFoodsFromImage(selectedFile, (progress) => {
        setAIProgress({ message: progress.message, progress: progress.progress })
      })

      if (extractedFoods.length === 0) {
        alert('No foods detected in this image. Please try a different photo.')
        return
      }

      // Convert AI foods to form data
      const newFoods: FoodFormData[] = extractedFoods.map(aiFood => ({
        name: aiFood.name,
        category: aiFood.category,
        hasPhoto: true,
        aiGenerated: true,
        imageData: aiFood.imageData, // Store AI-generated product image
        metadata: aiFood.metadata,
      }))

      console.log('✅ Created foods with AI-generated images:', newFoods.map(food => ({
        name: food.name,
        hasImageData: !!food.imageData,
        imageDataSize: food.imageData?.length
      })))

      setFoods(newFoods)
      setCurrentFoodIndex(0)
    } catch (error) {
      console.error('AI analysis failed:', error)
      alert(error instanceof Error ? error.message : 'AI analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const updateCurrentFood = (updates: Partial<FoodFormData>) => {
    setFoods(foods =>
      foods.map((food, i) => (i === currentFoodIndex ? { ...food, ...updates } : food))
    )
  }

  const handleSaveFood = async () => {
    if (!currentFood.name.trim() || !currentFood.category.trim()) {
      alert('Please fill in the required fields: Name and Category')
      return
    }

    if (!activeProfile) {
      alert('No active profile selected')
      return
    }

    try {
      let foodId: string

      // If food is already saved, update it
      if (currentFood.saved && currentFood.id) {
        await updateFood.mutateAsync({
          id: currentFood.id,
          data: {
            name: currentFood.name.trim(),
            category: currentFood.category.trim(),
            hasPhoto: currentFood.hasPhoto,
            photo: currentFood.imageData || photoPreview || '',
          }
        })
        foodId = currentFood.id
      } else {
        // Otherwise, create a new food
        const savedFood = await createFood.mutateAsync({
          name: currentFood.name.trim(),
          category: currentFood.category.trim(),
          hasPhoto: currentFood.hasPhoto,
          photo: currentFood.imageData || photoPreview || '', // Use AI-generated image if available
          profileId: activeProfile.id,
        })
        foodId = savedFood.id

        // Mark current food as saved and store its ID
        setFoods(foods =>
          foods.map((food, i) =>
            i === currentFoodIndex
              ? { ...food, id: foodId, saved: true }
              : food
          )
        )
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1000)

      // Check if all foods are saved (including the one we just saved)
      const allSaved = foods.every((food, i) =>
        i === currentFoodIndex || food.saved
      )

      if (allSaved) {
        // All foods saved, show meal creation dialog
        setTimeout(() => setShowMealDialog(true), 1000)
      } else {
        // Navigate to first unsaved food
        const nextUnsavedIndex = foods.findIndex((food, i) =>
          i !== currentFoodIndex && !food.saved
        )
        if (nextUnsavedIndex !== -1) {
          setTimeout(() => setCurrentFoodIndex(nextUnsavedIndex), 1000)
        }
      }
    } catch (error) {
      console.error('Failed to save food:', error)
      alert(`Failed to save food: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRemoveFood = async () => {
    // If the food has been saved, delete it from the database
    if (currentFood.saved && currentFood.id) {
      const confirmDelete = confirm(`Are you sure you want to remove "${currentFood.name}"?`)
      if (!confirmDelete) return

      try {
        await deleteFood.mutateAsync(currentFood.id)
      } catch (error) {
        console.error('Failed to delete food:', error)
        alert(`Failed to delete food: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return
      }
    }

    // Remove the food from the local array
    const newFoods = foods.filter((_, i) => i !== currentFoodIndex)

    if (newFoods.length === 0) {
      // If no foods left, navigate to pantry
      navigate({ to: '/pantry' })
    } else {
      setFoods(newFoods)
      // Adjust current index if needed
      if (currentFoodIndex >= newFoods.length) {
        setCurrentFoodIndex(newFoods.length - 1)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSaveFood()
    }
  }

  const handleCreateMeal = async () => {
    setIsGeneratingMeal(true)

    // Get saved food IDs and their details
    const savedFoodIds = foods.filter(food => food.saved && food.id).map(food => food.id!)

    // Get full food details from the database
    const savedFoods = allFoods?.filter(food => savedFoodIds.includes(food.id)) || []

    let aiGeneratedData = null

    // Try to generate AI suggestions if API key is configured
    if (hasGeminiKey && savedFoods.length > 0) {
      try {
        const foodNames = savedFoods.map(food => food.name)
        const foodCategories = savedFoods.map(food => food.category)

        aiGeneratedData = await generateMealSuggestions(foodNames, foodCategories)
      } catch (error) {
        console.error('Failed to generate meal suggestions:', error)
        // Continue without AI suggestions
      }
    }

    setIsGeneratingMeal(false)

    // Navigate to meal creation with pre-selected foods and AI data
    navigate({
      to: '/meals/new',
      state: {
        preSelectedFoodIds: savedFoodIds,
        aiGeneratedData: aiGeneratedData,
      }
    })
  }

  // Configure unified header
  useSetHeader({
    showBack: true,
    backTo: '/pantry',
    section: 'Pantry',
    title: 'New',
    pageActions: [
      {
        icon: Trash2,
        label: currentFood.saved ? 'Remove Food' : 'Discard Food',
        onClick: handleRemoveFood,
        variant: 'destructive' as const,
      },
      {
        icon: Check,
        label: createFood.isPending || updateFood.isPending
          ? (currentFood.saved ? 'Updating...' : 'Saving...')
          : showSuccess
          ? 'Saved!'
          : currentFood.saved
          ? 'Update'
          : 'Save',
        onClick: handleSaveFood,
      },
    ],
  })

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20" onKeyDown={handleKeyDown}>
      <div className="max-w-md mx-auto">
        <div className="px-4 py-6 space-y-6">
          {/* Food navigation and AI indicator */}
          {(foods.length > 1 || currentFood.aiGenerated) && (
            <div className="flex items-center justify-between">
              {foods.length > 1 ? (
                <div className="flex items-center gap-2">
                  {foods.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFoodIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentFoodIndex
                          ? 'w-6 bg-purple-500'
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to food ${index + 1}`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {currentFoodIndex + 1}/{foods.length}
                  </span>
                </div>
              ) : (
                <div />
              )}

              {currentFood.aiGenerated && (
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-3 h-3" />
                  AI-generated • Review and edit before saving
                </div>
              )}
            </div>
          )}
          {/* Photo Section */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Photo</h2>

            <div className="flex flex-col items-center gap-4">
              {/* Display AI-generated image if available, otherwise show original photo preview */}
              {currentFood.imageData || photoPreview ? (
                <div className="relative w-full aspect-square">
                  <img
                    src={currentFood.imageData || photoPreview}
                    alt="Food preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {currentFood.aiGenerated && currentFood.imageData && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500/90 text-white text-xs rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Generated
                    </div>
                  )}
                  <button
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-blue-300 dark:text-blue-700" />
                </div>
              )}

              <div className="flex gap-3 w-full">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                  disabled={isAnalyzing}
                >
                  <Camera className="w-5 h-5" />
                  Camera
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 bg-white dark:bg-gray-800 border-2 border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
                  disabled={isAnalyzing}
                >
                  <Upload className="w-5 h-5" />
                  Upload
                </button>
              </div>

              {/* AI Analyze Button */}
              {photoPreview && !currentFood.aiGenerated && (
                <button
                  onClick={handleAIAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {aiProgress.message}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      AI Analyze Photo
                    </>
                  )}
                </button>
              )}

              {!hasGeminiKey && photoPreview && (
                <div className="w-full p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                  <Settings className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-xs text-amber-700 dark:text-amber-300">
                    <button
                      onClick={() => navigate({ to: '/settings/ai' })}
                      className="underline font-medium"
                    >
                      Add Google AI key
                    </button>{' '}
                    to use AI analysis
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Food Details Form */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-4">
              Details
              {foods.length > 1 && ` (Food ${currentFoodIndex + 1} of ${foods.length})`}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Blue Grilled Chicken"
                  value={currentFood.name}
                  onChange={(e) => updateCurrentFood({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={currentFood.category}
                  onChange={(e) => updateCurrentFood({ category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select category</option>
                  <option value="Protein">Protein</option>
                  <option value="Carbohydrate">Carbohydrate</option>
                  <option value="Vegetable">Vegetable</option>
                  <option value="Fruit">Fruit</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Fat">Fat</option>
                  <option value="Snack">Snack</option>
                  <option value="Beverage">Beverage</option>
                  <option value="Other">Other</option>
                </select>
              </div>











              {/* AI Metadata */}
              {currentFood.metadata && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      AI Insights
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {currentFood.metadata.cuisineType && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Cuisine:</span>{' '}
                        <span className="font-medium">{currentFood.metadata.cuisineType}</span>
                      </div>
                    )}
                    {currentFood.metadata.healthScore && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Health Score:</span>{' '}
                        <span className="font-medium">{currentFood.metadata.healthScore}/10</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span className="font-medium">Food saved!</span>
            </div>
          </div>
        )}

        {/* Meal Creation Dialog */}
        {showMealDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-semibold mb-3">All Foods Saved!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {(() => {
                  const savedCount = foods.filter(food => food.saved && food.id).length
                  return `You've successfully saved ${savedCount} ${savedCount === 1 ? 'food' : 'foods'}. Would you like to create an meal with ${savedCount === 1 ? 'this food' : 'these foods'}?`
                })()}
              </p>
              {hasGeminiKey && (
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-4 h-4" />
                    <span>AI will suggest meal details</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMealDialog(false)
                    navigate({ to: '/pantry' })
                  }}
                  disabled={isGeneratingMeal}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  No, Thanks
                </button>
                <button
                  onClick={handleCreateMeal}
                  disabled={isGeneratingMeal}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGeneratingMeal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Create Meal'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}