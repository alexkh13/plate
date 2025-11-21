import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Download, Upload, Database, Trash2, AlertTriangle, RefreshCw } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { getDatabase } from '@/db'
import { useProfile } from '@/hooks/useProfile'
import { useFoods, useMeals, useCalendarEntries, useProfiles } from '@/hooks/useData'

export const Route = createFileRoute('/settings/data')({ component: DataManagementPage })

function DataManagementPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { activeProfile } = useProfile()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)


  // Get data for statistics
  const { data: profiles } = useProfiles()
  const { data: foods } = useFoods()
  const { data: meals } = useMeals()
  const { data: calendarEntries } = useCalendarEntries()

  const handleExportData = async () => {
    try {
      setIsExporting(true)
      const db = await getDatabase()

      // Export all data
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        profiles: await db.profiles.find().exec().then(docs => docs.map(d => d.toJSON())),
        foods: await db.foods.find().exec().then(docs => docs.map(d => d.toJSON())),
        meals: await db.meals.find().exec().then(docs => docs.map(d => d.toJSON())),
        calendarEntries: await db.calendar_entries.find().exec().then(docs => docs.map(d => d.toJSON()))
      }

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plate-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      alert('Data exported successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate data structure
      if (!data.version || !data.profiles || !data.foods || !data.meals) {
        throw new Error('Invalid backup file format')
      }

      const db = await getDatabase()

      // Import profiles
      for (const profile of data.profiles) {
        try {
          await db.profiles.upsert(profile)
        } catch (error) {
          console.warn('Failed to import profile:', profile.id, error)
        }
      }

      // Import foods
      for (const food of data.foods) {
        try {
          await db.foods.upsert(food)
        } catch (error) {
          console.warn('Failed to import food:', food.id, error)
        }
      }

      // Import meals
      for (const meal of data.meals) {
        try {
          await db.meals.upsert(meal)
        } catch (error) {
          console.warn('Failed to import meal:', meal.id, error)
        }
      }

      // Import calendar entries
      if (data.calendarEntries) {
        for (const entry of data.calendarEntries) {
          try {
            await db.calendar_entries.upsert(entry)
          } catch (error) {
            console.warn('Failed to import calendar entry:', entry.id, error)
          }
        }
      }

      alert('Data imported successfully!')
      window.location.reload()
    } catch (error) {
      console.error('Import failed:', error)
      alert('Failed to import data. Please check the file and try again.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleResetDatabase = () => {
    setShowResetDialog(false)

    // Show instructions for manual reset
    const message = `To reset the database:

1. Open DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Find "IndexedDB" in the left sidebar
4. Right-click on "platedb" and select "Delete database"
5. Refresh the page

This will fix any schema-related errors.`

    alert(message)

    // Also try automatic deletion (may be blocked)
    try {
      const deleteRequest = indexedDB.deleteDatabase('platedb')

      deleteRequest.onsuccess = () => {
        localStorage.clear()
        alert('✅ Database deleted automatically! Refreshing...')
        window.location.reload()
      }

      deleteRequest.onblocked = () => {
        console.warn('Automatic deletion blocked - manual steps required')
      }
    } catch (error) {
      console.error('Automatic deletion failed:', error)
    }
  }

  const handleDeleteAllData = async () => {
    try {
      const db = await getDatabase()

      // Delete all data
      const allFoods = await db.foods.find().exec()
      for (const food of allFoods) {
        await food.remove()
      }

      const allMeals = await db.meals.find().exec()
      for (const meal of allMeals) {
        await meal.remove()
      }

      const allEntries = await db.calendar_entries.find().exec()
      for (const entry of allEntries) {
        await entry.remove()
      }

      const allProfiles = await db.profiles.find().exec()
      for (const profile of allProfiles) {
        await profile.remove()
      }

      // Clear localStorage
      localStorage.clear()

      alert('All data has been deleted.')
      setShowDeleteDialog(false)
      window.location.href = '/'
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete all data. Please try again.')
    }
  }

  // Calculate storage size
  const calculateStorageSize = () => {
    const foodsSize = foods?.reduce((sum, food) => sum + (food.photo?.length || 0), 0) || 0
    const sizeInMB = (foodsSize / (1024 * 1024)).toFixed(2)
    return `~${sizeInMB} MB`
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-16 z-10">
          <button
            onClick={() => navigate({ to: '/settings' })}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            Data Management
          </button>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Storage Statistics */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Storage Statistics
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Profiles</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {profiles?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Foods</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {foods?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Meals</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {meals?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Calendar Entries</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {calendarEntries?.length || 0}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Estimated Size</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {calculateStorageSize()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Backup & Restore */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Backup & Restore
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {isExporting ? 'Exporting...' : 'Export Data'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Download all your data as JSON
                  </p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-green-50 dark:bg-green-950 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {isImporting ? 'Importing...' : 'Import Data'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Restore from backup file
                  </p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="text-sm font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide mb-3 px-2">
              Danger Zone
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-red-200 dark:border-red-800 overflow-hidden">
              <button
                onClick={() => setShowResetDialog(true)}
                className="w-full flex items-center gap-4 p-4 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors border-b border-gray-100 dark:border-gray-800"
              >
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-orange-600 dark:text-orange-400">
                    Reset Database
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Fix schema issues by resetting database
                  </p>
                </div>
              </button>

              <button
                onClick={() => setShowDeleteDialog(true)}
                className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                <div className="w-10 h-10 bg-red-50 dark:bg-red-950 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-red-600 dark:text-red-400">
                    Delete All Data
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Permanently delete everything
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* Info Note */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-semibold">Backup Recommended:</span> Regular backups help protect
              your pantry data. Export your data periodically to keep it safe.
            </p>
          </div>
        </div>
      </div>

      {/* Reset Database Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950 rounded-full flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Reset Database?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  This will completely reset the Plate nutrition app database and recreate it with a fresh schema.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  This action will:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 ml-2">
                  <li>Delete the entire platedb database</li>
                  <li>Remove all nutrition data</li>
                  <li>Clear app preferences</li>
                  <li>Fix any schema-related errors</li>
                </ul>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold mt-3">
                  Use this if you're experiencing database schema errors.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowResetDialog(false)}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDatabase}
                className="flex-1 py-3 px-4 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Delete All Data?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 ml-2">
                  <li>All profiles ({profiles?.length || 0})</li>
                  <li>All foods ({foods?.length || 0})</li>
                  <li>All meals ({meals?.length || 0})</li>
                  <li>All calendar entries ({calendarEntries?.length || 0})</li>
                  <li>All settings and preferences</li>
                </ul>
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold mt-3">
                  This action cannot be undone!
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllData}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}