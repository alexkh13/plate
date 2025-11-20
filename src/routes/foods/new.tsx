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
import { extractFoodsFromImage, isGeminiConfigured, generateMealSuggestions, type AIGeneratedItem } from '@/services/ai'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/foods/new')({ component: AddNewItemPage })

interface ItemFormData {
  id?: string // Item ID after saving
  name: string
  category: string
  color: string
  size: string
  brand: string
  tags: string
  notes: string
  hasPhoto: boolean
  aiGenerated?: boolean
  imageData?: string // AI-generated product image (base64 data URL)
  metadata?: AIGeneratedItem['metadata']
  saved?: boolean // Track if item has been saved
}

function AddNewItemPage() {
  const navigate = useNavigate()
  const createItem = useCreateFood()
  const updateItem = useUpdateFood()
  const deleteItem = useDeleteFood()
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
  const [items, setItems] = useState<ItemFormData[]>([{
    name: '',
    category: '',
    color: '',
    size: '',
    brand: '',
    tags: '',
    notes: '',
    hasPhoto: false,
    aiGenerated: false,
  }])
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showMealDialog, setShowMealDialog] = useState(false)
  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false)

  // Query all items to get full details for AI generation
  const { data: allItems } = useFoods(activeProfile?.id)

  // Check if Gemini is configured
  useState(() => {
    isGeminiConfigured().then(setHasGeminiKey)
  })

  const currentItem = items[currentItemIndex]

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
      // Update all items to have photo
      setItems(items => items.map(item => ({ ...item, hasPhoto: true })))
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setSelectedFile(null)
    setItems(items => items.map(item => ({ ...item, hasPhoto: false })))
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
      const extractedItems = await extractFoodsFromImage(selectedFile, (progress) => {
        setAIProgress({ message: progress.message, progress: progress.progress })
      })

      if (extractedItems.length === 0) {
        alert('No foods detected in this image. Please try a different photo.')
        return
      }

      // Convert AI items to form data
      const newItems: ItemFormData[] = extractedItems.map(aiItem => ({
        name: aiItem.name,
        category: aiItem.category,
        color: aiItem.color || '',
        size: '',
        brand: '',
        tags: aiItem.tags || '',
        notes: aiItem.notes || '',
        hasPhoto: true,
        aiGenerated: true,
        imageData: aiItem.imageData, // Store AI-generated product image
        metadata: aiItem.metadata,
      }))

      console.log('✅ Created items with AI-generated images:', newItems.map(item => ({
        name: item.name,
        hasImageData: !!item.imageData,
        imageDataSize: item.imageData?.length
      })))

      setItems(newItems)
      setCurrentItemIndex(0)
    } catch (error) {
      console.error('AI analysis failed:', error)
      alert(error instanceof Error ? error.message : 'AI analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const updateCurrentItem = (updates: Partial<ItemFormData>) => {
    setItems(items =>
      items.map((item, i) => (i === currentItemIndex ? { ...item, ...updates } : item))
    )
  }

  const handleSave = async () => {
    if (!currentItem.name.trim() || !currentItem.category.trim()) {
      alert('Please fill in the required fields: Name and Category')
      return
    }

    if (!activeProfile) {
      alert('No active profile selected')
      return
    }

    try {
      let itemId: string

      // If item is already saved, update it
      if (currentItem.saved && currentItem.id) {
        await updateItem.mutateAsync({
          id: currentItem.id,
          data: {
            name: currentItem.name.trim(),
            category: currentItem.category.trim(),
            hasPhoto: currentItem.hasPhoto,
            photo: currentItem.imageData || photoPreview || '',
            color: currentItem.color.trim() || '',
            size: currentItem.size.trim() || '',
            brand: currentItem.brand.trim() || '',
            tags: currentItem.tags.trim() || '',
            notes: currentItem.notes.trim() || '',
          }
        })
        itemId = currentItem.id
      } else {
        // Otherwise, create a new item
        const savedItem = await createItem.mutateAsync({
          name: currentItem.name.trim(),
          category: currentItem.category.trim(),
          hasPhoto: currentItem.hasPhoto,
          photo: currentItem.imageData || photoPreview || '', // Use AI-generated image if available
          color: currentItem.color.trim() || '',
          size: currentItem.size.trim() || '',
          brand: currentItem.brand.trim() || '',
          tags: currentItem.tags.trim() || '',
          notes: currentItem.notes.trim() || '',
          profileId: activeProfile.id,
        })
        itemId = savedItem.id

        // Mark current item as saved and store its ID
        setItems(items =>
          items.map((item, i) =>
            i === currentItemIndex
              ? { ...item, id: itemId, saved: true }
              : item
          )
        )
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 1000)

      // Check if all items are saved (including the one we just saved)
      const allSaved = items.every((item, i) =>
        i === currentItemIndex || item.saved
      )

      if (allSaved) {
        // All items saved, show meal creation dialog
        setTimeout(() => setShowMealDialog(true), 1000)
      } else {
        // Navigate to first unsaved item
        const nextUnsavedIndex = items.findIndex((item, i) =>
          i !== currentItemIndex && !item.saved
        )
        if (nextUnsavedIndex !== -1) {
          setTimeout(() => setCurrentItemIndex(nextUnsavedIndex), 1000)
        }
      }
    } catch (error) {
      console.error('Failed to save item:', error)
      alert(`Failed to save item: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRemove = async () => {
    // If the item has been saved, delete it from the database
    if (currentItem.saved && currentItem.id) {
      const confirmDelete = confirm(`Are you sure you want to remove "${currentItem.name}"?`)
      if (!confirmDelete) return

      try {
        await deleteItem.mutateAsync(currentItem.id)
      } catch (error) {
        console.error('Failed to delete item:', error)
        alert(`Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return
      }
    }

    // Remove the item from the local array
    const newItems = items.filter((_, i) => i !== currentItemIndex)

    if (newItems.length === 0) {
      // If no items left, navigate to pantry
      navigate({ to: '/pantry' })
    } else {
      setItems(newItems)
      // Adjust current index if needed
      if (currentItemIndex >= newItems.length) {
        setCurrentItemIndex(newItems.length - 1)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave()
    }
  }

  const handleCreateMeal = async () => {
    setIsGeneratingMeal(true)

    // Get saved item IDs and their details
    const savedItemIds = items.filter(item => item.saved && item.id).map(item => item.id!)

    // Get full item details from the database
    const savedItems = allItems?.filter(item => savedItemIds.includes(item.id)) || []

    let aiGeneratedData = null

    // Try to generate AI suggestions if API key is configured
    if (hasGeminiKey && savedItems.length > 0) {
      try {
        const itemNames = savedItems.map(item => item.name)
        const itemColors = savedItems.map(item => item.color || 'Unknown')
        const itemCategories = savedItems.map(item => item.category)

        aiGeneratedData = await generateMealSuggestions(itemNames, itemColors, itemCategories)
      } catch (error) {
        console.error('Failed to generate meal suggestions:', error)
        // Continue without AI suggestions
      }
    }

    setIsGeneratingMeal(false)

    // Navigate to meal creation with pre-selected items and AI data
    navigate({
      to: '/meals/new',
      state: {
        preSelectedItemIds: savedItemIds,
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
        label: currentItem.saved ? 'Remove Item' : 'Discard Item',
        onClick: handleRemove,
        variant: 'destructive' as const,
      },
      {
        icon: Check,
        label: createItem.isPending || updateItem.isPending
          ? (currentItem.saved ? 'Updating...' : 'Saving...')
          : showSuccess
          ? 'Saved!'
          : currentItem.saved
          ? 'Update'
          : 'Save',
        onClick: handleSave,
      },
    ],
  })

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20" onKeyDown={handleKeyDown}>
      <div className="max-w-md mx-auto">
        <div className="px-4 py-6 space-y-6">
          {/* Item navigation and AI indicator */}
          {(items.length > 1 || currentItem.aiGenerated) && (
            <div className="flex items-center justify-between">
              {items.length > 1 ? (
                <div className="flex items-center gap-2">
                  {items.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentItemIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentItemIndex
                          ? 'w-6 bg-purple-500'
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to item ${index + 1}`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {currentItemIndex + 1}/{items.length}
                  </span>
                </div>
              ) : (
                <div />
              )}

              {currentItem.aiGenerated && (
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
              {currentItem.imageData || photoPreview ? (
                <div className="relative w-full aspect-square">
                  <img
                    src={currentItem.imageData || photoPreview}
                    alt="Item preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  {currentItem.aiGenerated && currentItem.imageData && (
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
              {photoPreview && !currentItem.aiGenerated && (
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

          {/* Item Details Form */}
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-4">
              Details
              {items.length > 1 && ` (Item ${currentItemIndex + 1} of ${items.length})`}
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
                  value={currentItem.name}
                  onChange={(e) => updateCurrentItem({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={currentItem.category}
                  onChange={(e) => updateCurrentItem({ category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Select category</option>
                  <option value="Top">Top</option>
                  <option value="Bottom">Bottom</option>
                  <option value="Dress">Dress</option>
                  <option value="Outerwear">Outerwear</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Activewear">Activewear</option>
                  <option value="Swimwear">Swimwear</option>
                  <option value="Underwear">Underwear</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <input
                  type="text"
                  placeholder="e.g., Blue"
                  value={currentItem.color}
                  onChange={(e) => updateCurrentItem({ color: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-medium mb-2">Size</label>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateCurrentItem({ size })}
                      className={`py-2 text-sm rounded-lg border transition-colors ${
                        currentItem.size === size
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or custom size"
                  value={!['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].includes(currentItem.size) ? currentItem.size : ''}
                  onChange={(e) => updateCurrentItem({ size: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium mb-2">Brand</label>
                <input
                  type="text"
                  placeholder="e.g., Nike"
                  value={currentItem.brand}
                  onChange={(e) => updateCurrentItem({ brand: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <input
                  type="text"
                  placeholder="e.g., #casual #summer"
                  value={currentItem.tags}
                  onChange={(e) => updateCurrentItem({ tags: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add notes..."
                  value={currentItem.notes}
                  onChange={(e) => updateCurrentItem({ notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* AI Metadata */}
              {currentItem.metadata && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      AI Insights
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {currentItem.metadata.style && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Style:</span>{' '}
                        <span className="font-medium">{currentItem.metadata.style}</span>
                      </div>
                    )}
                    {currentItem.metadata.occasion && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Occasion:</span>{' '}
                        <span className="font-medium">{currentItem.metadata.occasion}</span>
                      </div>
                    )}
                    {currentItem.metadata.season && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Season:</span>{' '}
                        <span className="font-medium">{currentItem.metadata.season}</span>
                      </div>
                    )}
                    {currentItem.metadata.material && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Material:</span>{' '}
                        <span className="font-medium">{currentItem.metadata.material}</span>
                      </div>
                    )}
                    {currentItem.metadata.pattern && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Pattern:</span>{' '}
                        <span className="font-medium">{currentItem.metadata.pattern}</span>
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
              <span className="font-medium">Item saved!</span>
            </div>
          </div>
        )}

        {/* Meal Creation Dialog */}
        {showMealDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-xl font-semibold mb-3">All Items Saved!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {(() => {
                  const savedCount = items.filter(item => item.saved && item.id).length
                  return `You've successfully saved ${savedCount} ${savedCount === 1 ? 'item' : 'items'}. Would you like to create an meal with ${savedCount === 1 ? 'this item' : 'these items'}?`
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
