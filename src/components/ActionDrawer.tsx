import { Camera, Image } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'
import { storeTempImages } from '@/utils/tempImageStorage'

interface ActionDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function ActionDrawer({ isOpen, onClose }: ActionDrawerProps) {
  const navigate = useNavigate()
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const isProcessingRef = useRef(false)

  const handleGalleryClick = () => {
    // Trigger gallery selection
    galleryInputRef.current?.click()
  }

  const handleCameraClick = () => {
    // Trigger camera capture
    cameraInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    console.log('📁 Files selected:', files?.length || 0)

    if (files && files.length > 0) {
      isProcessingRef.current = true

      try {
        // Store images using IndexedDB with compression
        await storeTempImages(files)
        console.log('✅ Images stored successfully, closing drawer and navigating')

        // Close drawer first
        onClose()

        // Navigate to new meal page with AI analysis
        console.log('🚀 Attempting navigation...')
        try {
          await navigate({ to: '/meals/new' })
          console.log('✅ Navigate called successfully')
        } catch (err) {
          console.error('❌ Navigate failed:', err)
          // Fallback to window.location
          console.log('🔄 Trying window.location fallback...')
          window.location.href = '/meals/new'
        }
      } catch (error) {
        console.error('❌ Error storing images:', error)
        isProcessingRef.current = false

        // Show specific error to user
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        alert(`Failed to process images: ${errorMessage}\n\nTip: Try using a smaller image or taking a new photo with lower resolution.`)
      } finally {
        // Reset the file input
        if (e.target) {
          e.target.value = ''
        }
      }
    }
  }

  const handleBackdropClick = () => {
    // Don't close if we're processing files
    if (!isProcessingRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Hidden file input for gallery selection */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden file input for camera capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-64 animate-in slide-in-from-bottom-2 duration-200">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-2 space-y-1">
            {/* Gallery Option */}
            <button
              onClick={handleGalleryClick}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Image className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900 dark:text-white">Add from Gallery</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI meal scan from photos</p>
              </div>
            </button>

            {/* Camera Option */}
            <button
              onClick={handleCameraClick}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900 dark:text-white">Take Photo</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">AI meal scan with camera</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
