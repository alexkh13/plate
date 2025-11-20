import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Soup, Flame, Leaf, UtensilsCrossed, ChefHat, Coffee, Salad, Fish } from 'lucide-react'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/discover')({ component: DiscoverPage })

function DiscoverPage() {
  const navigate = useNavigate()

  // Configure unified header - main screen, show logo without back button
  useSetHeader({ section: 'Discovery' })

  const seasonalTrends = [
    { id: 'comfort-bowls', name: 'Comfort Bowls', icon: Soup, color: 'text-[#D4755B]' },
    { id: 'fermented-foods', name: 'Fermented', icon: Leaf, color: 'text-[#8B9A7C]' },
    { id: 'one-pot-wonders', name: 'One-Pot', icon: Flame, color: 'text-[#C97D5F]' },
  ]

  const curatedGuides = [
    {
      id: 'breakfast-rituals',
      title: 'Morning Rituals',
      gradient: 'from-amber-300 via-orange-200 to-rose-200',
      description: 'Start your day intentionally',
      accent: '#D4755B'
    },
    {
      id: 'weeknight-heroes',
      title: 'Weeknight Heroes',
      gradient: 'from-emerald-200 via-teal-200 to-cyan-200',
      description: '30 minutes or less',
      accent: '#8B9A7C'
    },
    {
      id: 'plant-forward',
      title: 'Plant-Forward Plates',
      gradient: 'from-lime-200 via-green-200 to-emerald-200',
      description: 'Vegetables take center stage',
      accent: '#7BA05B'
    },
    {
      id: 'coastal-cuisine',
      title: 'Coastal Cuisine',
      gradient: 'from-sky-200 via-blue-200 to-indigo-200',
      description: 'Fresh from the sea',
      accent: '#6B9AC4'
    },
    {
      id: 'cozy-baking',
      title: 'Cozy Baking',
      gradient: 'from-rose-200 via-pink-200 to-fuchsia-200',
      description: 'Sweet comfort therapy',
      accent: '#D47B9C'
    },
    {
      id: 'global-pantry',
      title: 'Global Pantry',
      gradient: 'from-violet-200 via-purple-200 to-fuchsia-200',
      description: 'Flavors from afar',
      accent: '#9B7BAE'
    },
  ]

  const culinaryArticles = [
    {
      id: 'knife-skills',
      title: 'Essential Knife Skills',
      gradient: 'from-slate-300 to-zinc-200',
      category: 'Technique',
      icon: ChefHat
    },
    {
      id: 'flavor-layering',
      title: 'The Art of Flavor Layering',
      gradient: 'from-amber-200 to-yellow-200',
      category: 'Theory',
      icon: Flame
    },
    {
      id: 'seasonal-eating',
      title: 'Eating with the Seasons',
      gradient: 'from-green-200 to-emerald-200',
      category: 'Philosophy',
      icon: Leaf
    },
    {
      id: 'sustainable-seafood',
      title: 'Sustainable Seafood Guide',
      gradient: 'from-cyan-200 to-blue-200',
      category: 'Ethics',
      icon: Fish
    },
    {
      id: 'coffee-mastery',
      title: 'Home Coffee Mastery',
      gradient: 'from-orange-200 to-amber-200',
      category: 'Beverage',
      icon: Coffee
    },
    {
      id: 'salad-composition',
      title: 'Beyond Basic Salads',
      gradient: 'from-lime-200 to-green-200',
      category: 'Composition',
      icon: Salad
    },
  ]

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        :root {
          --terracotta: #D4755B;
          --sage: #8B9A7C;
          --cream: #FAF8F4;
          --charcoal: #2C2C2C;
          --warm-gray: #E8E3DD;
        }

        .discover-page {
          font-family: 'Source Sans 3', sans-serif;
          background: linear-gradient(to bottom, var(--cream) 0%, var(--warm-gray) 100%);
          min-height: 100vh;
        }

        .discover-page h1, .discover-page h2, .discover-page h3 {
          font-family: 'Playfair Display', serif;
        }

        .featured-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .featured-card:hover {
          transform: translateY(-2px);
        }

        .guide-card {
          position: relative;
          overflow: hidden;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .guide-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
          opacity: 0;
          transition: opacity 0.35s ease;
        }

        .guide-card:hover::before {
          opacity: 1;
        }

        .guide-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }

        .article-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
        }

        .article-card:hover {
          transform: translateY(-3px);
          border-color: var(--terracotta);
          box-shadow: 0 12px 24px rgba(212, 117, 91, 0.2);
        }

        .trend-chip {
          transition: all 0.25s ease;
          cursor: pointer;
          border: 2px solid rgba(139, 154, 124, 0.3);
        }

        .trend-chip:hover {
          transform: scale(1.05);
          border-color: var(--sage);
          box-shadow: 0 4px 12px rgba(139, 154, 124, 0.3);
        }

        .section-title {
          font-weight: 600;
          letter-spacing: -0.02em;
          position: relative;
          display: inline-block;
        }

        .section-title::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 40%;
          height: 3px;
          background: linear-gradient(to right, var(--terracotta), transparent);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards;
        }

        .animate-in-1 { animation-delay: 0.1s; }
        .animate-in-2 { animation-delay: 0.2s; }
        .animate-in-3 { animation-delay: 0.3s; }

        .dark .discover-page {
          background: linear-gradient(to bottom, #1a1a1a 0%, #0f0f0f 100%);
        }

        .dark .section-title::after {
          background: linear-gradient(to right, var(--terracotta), transparent);
        }
      `}</style>

      <div className="discover-page pb-20">
        <div className="max-w-md mx-auto px-4 py-6 space-y-8">

          {/* Hero Featured Trend */}
          <section className="animate-in">
            <div className="featured-card relative overflow-hidden rounded-3xl shadow-2xl cursor-pointer"
                 onClick={() => navigate({ to: '/trends/seasonal-flavors' })}
                 style={{
                   background: 'linear-gradient(135deg, #D4755B 0%, #C97D5F 50%, #B8866B 100%)',
                   boxShadow: '0 20px 60px rgba(212, 117, 91, 0.4)'
                 }}>

              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                     backgroundSize: '32px 32px'
                   }} />

              <div className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="text-white/80 text-sm font-semibold tracking-wider uppercase mb-2">
                      Trending Now
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
                      Autumn's Harvest Table
                    </h1>
                    <p className="text-white/90 text-lg font-light leading-relaxed max-w-sm">
                      Celebrate the season with root vegetables, warming spices, and hearty grains
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                    <UtensilsCrossed className="w-10 h-10 text-white" />
                  </div>
                </div>

                {/* Trend chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {seasonalTrends.map((trend, idx) => {
                    const Icon = trend.icon
                    return (
                      <div
                        key={trend.name}
                        className="trend-chip bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate({ to: '/trends/$trendId', params: { trendId: trend.id } })
                        }}
                      >
                        <Icon className={`w-4 h-4 ${trend.color}`} />
                        <span className="text-sm font-semibold text-gray-800">{trend.name}</span>
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate({ to: '/trends' })
                  }}
                  className="bg-white text-gray-900 px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Explore All Trends
                </button>
              </div>
            </div>
          </section>

          {/* Curated Meal Guides */}
          <section className="animate-in-1">
            <h2 className="section-title text-3xl text-gray-900 dark:text-gray-100 mb-6">
              Curated Collections
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {curatedGuides.map((guide, idx) => (
                <div
                  key={guide.id}
                  onClick={() => navigate({ to: '/guides/$guideId', params: { guideId: guide.id } })}
                  className="guide-card bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div
                    className={`aspect-[4/5] bg-gradient-to-br ${guide.gradient} relative flex items-end p-4`}
                  >
                    {/* Decorative circle */}
                    <div
                      className="absolute top-4 right-4 w-16 h-16 rounded-full opacity-40"
                      style={{ background: guide.accent }}
                    />

                    <div className="relative z-10 text-white drop-shadow-lg">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-90">
                        {guide.description}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                      {guide.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Culinary Knowledge */}
          <section className="animate-in-2">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="section-title text-3xl text-gray-900 dark:text-gray-100">
                Culinary Knowledge
              </h2>
              <button
                onClick={() => navigate({ to: '/articles' })}
                className="text-sm font-semibold text-[#D4755B] hover:text-[#C97D5F] transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {culinaryArticles.map((article, idx) => {
                const Icon = article.icon
                return (
                  <div
                    key={article.id}
                    onClick={() => navigate({ to: '/articles/$articleId', params: { articleId: article.id } })}
                    className="article-card bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-md cursor-pointer flex items-center"
                  >
                    <div
                      className={`w-24 h-24 bg-gradient-to-br ${article.gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-10 h-10 text-white drop-shadow-md" />
                    </div>
                    <div className="flex-1 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider mb-1"
                           style={{ color: 'var(--terracotta)' }}>
                        {article.category}
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                        {article.title}
                      </h3>
                    </div>
                    <div className="pr-4">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        strokeWidth="2"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Inspirational Quote Section */}
          <section className="animate-in-3">
            <div
              className="relative overflow-hidden rounded-3xl p-8 text-center"
              style={{
                background: 'linear-gradient(135deg, #8B9A7C 0%, #7BA05B 100%)',
                boxShadow: '0 20px 40px rgba(139, 154, 124, 0.3)'
              }}
            >
              <div className="absolute inset-0 opacity-10"
                   style={{
                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                   }} />

              <div className="relative z-10">
                <p className="text-2xl md:text-3xl font-serif italic text-white leading-relaxed mb-4">
                  "Cooking is like love. It should be entered into with abandon or not at all."
                </p>
                <p className="text-white/80 font-semibold">
                  — Harriet Van Horne
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  )
}
