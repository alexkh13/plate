/**
 * Temporary image storage utility using IndexedDB
 * This avoids sessionStorage quota limitations
 */

const DB_NAME = 'plate_temp_storage'
const STORE_NAME = 'temp_images'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })

  return dbPromise
}

/**
 * Compress an image file to reduce size
 * For large images (12MP+), uses aggressive compression
 */
async function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      try {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        console.log(`📏 Original image: ${width}x${height} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

        // For very large images, use more aggressive compression
        let targetWidth = maxWidth
        let targetQuality = quality

        if (width > 3000 || height > 3000) {
          // 12MP+ images - very aggressive
          targetWidth = 600
          targetQuality = 0.5
          console.log('🔧 Using very aggressive compression for large image')
        } else if (width > 2000 || height > 2000) {
          // 4MP+ images - aggressive
          targetWidth = 800
          targetQuality = 0.6
        }

        if (width > targetWidth || height > targetWidth) {
          const ratio = Math.min(targetWidth / width, targetWidth / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }

        console.log(`📐 Resizing to: ${width}x${height}, quality: ${targetQuality}`)

        // Set canvas size
        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to compressed data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', targetQuality)

        // Revoke object URL to free memory
        URL.revokeObjectURL(img.src)

        resolve(compressedDataUrl)
      } catch (error) {
        console.error('❌ Error during compression:', error)
        URL.revokeObjectURL(img.src)
        reject(error)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }

    // Create object URL for the image
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Store images temporarily in IndexedDB
 */
export async function storeTempImages(files: FileList | File[]): Promise<void> {
  try {
    console.log('🖼️ Compressing images...')

    // Step 1: Compress all images first (outside transaction to avoid timeout)
    const fileArray = Array.from(files)
    const compressedImages: string[] = []
    let totalSize = 0

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      try {
        console.log(`🔄 Processing image ${i + 1}/${fileArray.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

        const compressed = await compressImage(file)
        const compressedSizeKB = compressed.length / 1024

        compressedImages.push(compressed)
        totalSize += compressed.length

        const compressionRatio = ((1 - compressed.length / file.size) * 100).toFixed(1)
        console.log(`✅ Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${compressedSizeKB.toFixed(0)}KB (${compressionRatio}% reduction)`)
      } catch (error) {
        console.error(`❌ Failed to compress ${file.name}:`, error)
        throw new Error(`Failed to compress ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    const totalSizeMB = totalSize / 1024 / 1024
    console.log(`📊 Total compressed size: ${totalSizeMB.toFixed(2)}MB for ${compressedImages.length} images`)

    // Check if total size is reasonable (warn if > 10MB)
    if (totalSizeMB > 10) {
      console.warn(`⚠️ Total compressed size is large (${totalSizeMB.toFixed(2)}MB). This might cause issues.`)
    }

    // Step 2: Now store in IndexedDB with a fresh transaction
    console.log('💾 Storing in IndexedDB...')
    const db = await getDB()

    // Clear old data
    await new Promise<void>((resolve, reject) => {
      const clearTransaction = db.transaction(STORE_NAME, 'readwrite')
      const clearStore = clearTransaction.objectStore(STORE_NAME)
      const clearRequest = clearStore.clear()

      clearRequest.onsuccess = () => resolve()
      clearRequest.onerror = () => reject(clearRequest.error)
    })

    // Store compressed images in a fresh transaction
    await new Promise<void>((resolve, reject) => {
      const storeTransaction = db.transaction(STORE_NAME, 'readwrite')
      const store = storeTransaction.objectStore(STORE_NAME)
      const putRequest = store.put(compressedImages, 'aiAnalyzeImages')

      putRequest.onsuccess = () => {
        console.log(`✅ Successfully stored ${compressedImages.length} images in IndexedDB`)
        resolve()
      }

      putRequest.onerror = () => {
        console.error('❌ IndexedDB put error:', putRequest.error)
        reject(putRequest.error)
      }

      storeTransaction.onerror = () => {
        console.error('❌ Transaction error:', storeTransaction.error)
        reject(storeTransaction.error)
      }
    })
  } catch (error) {
    console.error('❌ Failed to store images:', error)
    throw error
  }
}

/**
 * Retrieve temporarily stored images
 */
export async function getTempImages(): Promise<string[]> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get('aiAnalyzeImages')
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('❌ Failed to retrieve images:', error)
    return []
  }
}

/**
 * Clear temporarily stored images
 */
export async function clearTempImages(): Promise<void> {
  try {
    const db = await getDB()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await new Promise((resolve, reject) => {
      const request = store.delete('aiAnalyzeImages')
      request.onsuccess = () => resolve(undefined)
      request.onerror = () => reject(request.error)
    })

    console.log('🧹 Cleared temporary images')
  } catch (error) {
    console.error('❌ Failed to clear images:', error)
  }
}
