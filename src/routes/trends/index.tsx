import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Layers, Shirt, Sparkles, Wind, TrendingUp, Palette } from 'lucide-react'

export const Route = createFileRoute('/trends/')({ component: TrendsPage })

function TrendsPage() {
  const navigate = useNavigate()

  const currentTrends = [
    {
      id: 'layered-look',
      name: 'Layered Look',
      icon: Layers,
      color: 'text-amber-600 dark:text-amber-400',
      gradient: 'from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950',
      borderColor: 'border-amber-200 dark:border-amber-800',
      description: 'Master the art of combining different pieces for dimension and warmth'
    },
    {
      id: 'cozy-knits',
      name: 'Cozy Knits',
      icon: Shirt,
      color: 'text-orange-600 dark:text-orange-400',
      gradient: 'from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950',
      borderColor: 'border-orange-200 dark:border-orange-800',
      description: 'Embrace comfort with chunky sweaters and soft textures'
    },
    {
      id: 'earth-tones',
      name: 'Earth Tones',
      icon: Sparkles,
      color: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950',
      borderColor: 'border-green-200 dark:border-green-800',
      description: 'Natural, grounding colors inspired by nature'
    },
  ]

  const upcomingTrends = [
    {
      id: 'bold-accessories',
      name: 'Bold Accessories',
      icon: Sparkles,
      color: 'text-purple-600 dark:text-purple-400',
      gradient: 'from-purple-50 to-fuchsia-50 dark:from-purple-950 dark:to-fuchsia-950',
      borderColor: 'border-purple-200 dark:border-purple-800',
      description: 'Statement pieces that elevate any meal'
    },
    {
      id: 'monochrome-magic',
      name: 'Monochrome Magic',
      icon: Palette,
      color: 'text-slate-600 dark:text-slate-400',
      gradient: 'from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950',
      borderColor: 'border-slate-200 dark:border-slate-800',
      description: 'Head-to-toe single color sophistication'
    },
    {
      id: 'vintage-revival',
      name: 'Vintage Revival',
      icon: TrendingUp,
      color: 'text-rose-600 dark:text-rose-400',
      gradient: 'from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950',
      borderColor: 'border-rose-200 dark:border-rose-800',
      description: 'Timeless pieces with retro inspiration'
    },
  ]

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 sticky top-0 z-10">
          <button
            onClick={() => navigate({ to: '/discover' })}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            Discover Trends
          </button>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 p-8 flex flex-col items-center justify-center text-center border-b border-amber-100 dark:border-amber-900">
          <Wind className="w-16 h-16 text-amber-600 dark:text-amber-400 mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Fall 2025 Trends</h1>
          <p className="text-gray-600 dark:text-gray-400">Stay ahead with the latest fashion trends</p>
        </div>

        <div className="px-4 py-6 space-y-8">
          {/* Current Trends */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Trending Now</h2>
            </div>
            <div className="space-y-4">
              {currentTrends.map((trend) => {
                const Icon = trend.icon
                return (
                  <div
                    key={trend.id}
                    onClick={() => navigate({ to: '/trends/$trendId', params: { trendId: trend.id } })}
                    className={`bg-gradient-to-br ${trend.gradient} rounded-xl p-6 border ${trend.borderColor} cursor-pointer hover:shadow-lg transition-all`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg p-3">
                        <Icon className={`w-10 h-10 ${trend.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                          {trend.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {trend.description}
                        </p>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Upcoming Trends */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Coming Soon</h2>
            </div>
            <div className="space-y-4">
              {upcomingTrends.map((trend) => {
                const Icon = trend.icon
                return (
                  <div
                    key={trend.id}
                    onClick={() => navigate({ to: '/trends/$trendId', params: { trendId: trend.id } })}
                    className={`bg-gradient-to-br ${trend.gradient} rounded-xl p-6 border ${trend.borderColor} cursor-pointer hover:shadow-lg transition-all`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg p-3">
                        <Icon className={`w-10 h-10 ${trend.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
                          {trend.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {trend.description}
                        </p>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Inspiration CTA */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 text-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Ready to try these trends?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create meals inspired by the latest fashion trends
            </p>
            <button
              onClick={() => navigate({ to: '/meals/new' })}
              className="w-full py-3 px-4 bg-amber-600 dark:bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 dark:hover:bg-amber-700 transition-colors"
            >
              Create New Meal
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
