import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Soup, Flame, Leaf, Sparkles, Calendar, Heart, UtensilsCrossed } from 'lucide-react'

export const Route = createFileRoute('/trends/$trendId')({ component: TrendDetailPage })

const trendsData: Record<string, {
  name: string
  icon: any
  color: string
  gradient: string
  description: string
  overview: string
  howToPrepare: { title: string; description: string }[]
  keyIngredients: string[]
  flavorProfile: { name: string; flavors: string[] }
  culinary_tips: string[]
}> = {
  'comfort-bowls': {
    name: 'Comfort Bowls',
    icon: Soup,
    color: 'text-[#D4755B]',
    gradient: 'linear-gradient(135deg, #D4755B 0%, #C97D5F 100%)',
    description: 'Nourishing one-bowl meals that warm the soul',
    overview: 'Comfort bowls are more than just meals—they\'re experiences of warmth, nourishment, and satisfaction in a single vessel. This trend celebrates the art of combining grains, proteins, vegetables, and flavorful sauces in harmonious balance, creating complete meals that are both nutritious and deeply comforting.',
    howToPrepare: [
      {
        title: 'Start with a Grain Base',
        description: 'Begin with a foundation of rice, quinoa, farro, or noodles. This provides substance and soaks up the delicious sauces you\'ll add later.'
      },
      {
        title: 'Layer Your Proteins',
        description: 'Add your choice of protein—grilled chicken, tofu, soft-boiled eggs, or beans. Proteins add satiety and make the bowl a complete meal.'
      },
      {
        title: 'Add Colorful Vegetables',
        description: 'Include a variety of raw and cooked vegetables for nutrition, color, and texture. Think roasted sweet potatoes, fresh greens, pickled carrots, and sautéed mushrooms.'
      },
      {
        title: 'Finish with Sauce & Toppings',
        description: 'Tie everything together with a flavorful sauce—tahini, miso, peanut, or sesame. Top with sesame seeds, crispy onions, fresh herbs, or chili oil for the final flourish.'
      }
    ],
    keyIngredients: [
      'Base grains: rice, quinoa, or noodles',
      'Proteins: tofu, chicken, eggs, or beans',
      'Roasted vegetables: sweet potato, broccoli',
      'Fresh greens: spinach, kale, or lettuce',
      'Flavorful sauces: tahini, miso, or peanut',
      'Toppings: sesame seeds, scallions, crispy onions'
    ],
    flavorProfile: {
      name: 'Warm & Umami-Rich',
      flavors: ['Savory', 'Nutty', 'Slightly Sweet', 'Tangy', 'Warming', 'Balanced']
    },
    culinary_tips: [
      'Prep ingredients in advance for quick assembly',
      'Balance hot and cold components for temperature contrast',
      'Include different textures: crispy, soft, crunchy',
      'Don\'t overdress—add sauce gradually to taste',
      'Customize to dietary needs: vegan, gluten-free, etc.'
    ]
  },
  'fermented-foods': {
    name: 'Fermented Foods',
    icon: Leaf,
    color: 'text-[#8B9A7C]',
    gradient: 'linear-gradient(135deg, #8B9A7C 0%, #7BA05B 100%)',
    description: 'Probiotic-rich foods for gut health and complex flavors',
    overview: 'Fermentation is an ancient preservation technique experiencing a modern renaissance. This trend celebrates the tangy, complex flavors and probiotic benefits of fermented foods—from kimchi and sauerkraut to kombucha and miso. These living foods add depth to dishes while supporting digestive health.',
    howToPrepare: [
      {
        title: 'Start Simple with Store-Bought',
        description: 'Begin by incorporating quality store-bought fermented foods like kimchi, sauerkraut, or kefir into your meals. This lets you experience the flavors before diving into fermentation.'
      },
      {
        title: 'Try Basic Fermentation',
        description: 'Start with simple projects like quick pickles or sauerkraut. These require minimal equipment and teach fundamental fermentation principles.'
      },
      {
        title: 'Use as Condiments & Add-Ins',
        description: 'Add fermented foods as toppings, side dishes, or flavor enhancers. A spoonful of kimchi on rice or sauerkraut on a sandwich transforms the entire dish.'
      },
      {
        title: 'Explore Fermented Beverages',
        description: 'Kombucha, kefir, and drinking vinegars offer probiotic benefits in beverage form. Start with commercial versions or try brewing your own.'
      }
    ],
    keyIngredients: [
      'Kimchi: spicy fermented cabbage',
      'Sauerkraut: fermented cabbage',
      'Miso: fermented soybean paste',
      'Kombucha: fermented tea',
      'Kefir: fermented milk or water',
      'Pickled vegetables: cucumbers, carrots, daikon'
    ],
    flavorProfile: {
      name: 'Tangy & Complex',
      flavors: ['Sour', 'Funky', 'Umami', 'Effervescent', 'Layered', 'Probiotic']
    },
    culinary_tips: [
      'Start with small amounts—fermented flavors are intense',
      'Store properly: refrigeration slows fermentation',
      'Look for "live cultures" on labels for probiotic benefits',
      'Pair tangy ferments with rich, fatty foods for balance',
      'Be patient—good fermentation takes time'
    ]
  },
  'one-pot-wonders': {
    name: 'One-Pot Wonders',
    icon: Flame,
    color: 'text-[#C97D5F]',
    gradient: 'linear-gradient(135deg, #C97D5F 0%, #B8866B 100%)',
    description: 'Complete meals cooked in a single pot for easy cleanup',
    overview: 'One-pot cooking is the ultimate in culinary efficiency without sacrificing flavor. This trend celebrates dishes that build layers of flavor in a single vessel—from Dutch ovens to sheet pans to instant pots. Perfect for busy weeknights, these meals minimize cleanup while maximizing taste.',
    howToPrepare: [
      {
        title: 'Build Flavor Foundation',
        description: 'Start by sautéing aromatics like onions, garlic, and ginger in your pot. This creates a flavorful base that infuses the entire dish.'
      },
      {
        title: 'Layer Ingredients Strategically',
        description: 'Add ingredients in order of cooking time—heartier vegetables first, delicate greens last. This ensures everything cooks perfectly without overcooking.'
      },
      {
        title: 'Use Quality Cookware',
        description: 'Invest in a good Dutch oven, cast-iron skillet, or sheet pan. Quality cookware distributes heat evenly and can go from stovetop to oven.'
      },
      {
        title: 'Let It Simmer',
        description: 'Give your dish time to develop flavors. Low and slow cooking allows ingredients to meld together, creating depth and complexity.'
      }
    ],
    keyIngredients: [
      'Aromatics: onions, garlic, ginger',
      'Proteins: chicken thighs, sausage, beans',
      'Hearty vegetables: potatoes, carrots, celery',
      'Liquid base: broth, wine, tomatoes',
      'Herbs and spices for layered flavor',
      'Finishing touches: fresh herbs, lemon, parmesan'
    ],
    flavorProfile: {
      name: 'Rich & Layered',
      flavors: ['Savory', 'Hearty', 'Comforting', 'Well-Seasoned', 'Aromatic', 'Satisfying']
    },
    culinary_tips: [
      'Deglaze the pan to capture all the flavorful brown bits',
      'Don\'t skip the aromatics—they\'re the flavor foundation',
      'Season in layers: at the beginning, middle, and end',
      'Finish with acid (lemon, vinegar) to brighten flavors',
      'Let stews and braises rest before serving for better flavor'
    ]
  }
}

function TrendDetailPage() {
  const { trendId } = Route.useParams()
  const navigate = useNavigate()
  const trend = trendsData[trendId]

  if (!trend) {
    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
        <div className="bg-[#FAF8F4] dark:bg-gray-950 min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4" style={{ fontFamily: 'Source Sans 3, sans-serif' }}>Trend not found</p>
            <button
              onClick={() => navigate({ to: '/discover' })}
              className="px-6 py-3 bg-[#D4755B] text-white rounded-full font-semibold hover:bg-[#C97D5F] transition-all"
              style={{ fontFamily: 'Source Sans 3, sans-serif' }}
            >
              Back to Discover
            </button>
          </div>
        </div>
      </>
    )
  }

  const Icon = trend.icon

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
        .trend-detail-page {
          font-family: 'Source Sans 3', sans-serif;
          background: linear-gradient(to bottom, #FAF8F4 0%, #E8E3DD 100%);
          min-height: 100vh;
        }

        .trend-detail-page h1, .trend-detail-page h2, .trend-detail-page h3 {
          font-family: 'Playfair Display', serif;
        }

        .dark .trend-detail-page {
          background: linear-gradient(to bottom, #1a1a1a 0%, #0f0f0f 100%);
        }

        .content-card {
          transition: all 0.3s ease;
        }

        .content-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
      `}</style>

      <div className="trend-detail-page pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div
            className="relative overflow-hidden px-6 py-16 flex flex-col items-center justify-center text-center"
            style={{ background: trend.gradient }}
          >
            {/* Decorative pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px'
              }}
            />

            <div className="relative z-10">
              <button
                onClick={() => navigate({ to: '/discover' })}
                className="mb-6 flex items-center gap-2 text-white/90 hover:text-white transition-colors mx-auto"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium">Back to Discover</span>
              </button>

              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 inline-block mb-4">
                <Icon className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
                {trend.name}
              </h1>
              <p className="text-xl text-white/90 font-light max-w-md mx-auto">
                {trend.description}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-8 space-y-6">
            {/* Overview */}
            <div className="content-card bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">What's This Trend About?</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                {trend.overview}
              </p>
            </div>

            {/* How to Prepare */}
            <div className="content-card bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">How to Prepare</h2>
              <div className="space-y-5">
                {trend.howToPrepare.map((step, idx) => (
                  <div key={idx} className="border-l-4 pl-5" style={{ borderColor: '#D4755B' }}>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Ingredients */}
            <div className="content-card bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-5">
                <UtensilsCrossed className="w-6 h-6" style={{ color: '#8B9A7C' }} />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Key Ingredients</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trend.keyIngredients.map((ingredient, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <span className="text-[#8B9A7C] text-lg mt-0.5">✓</span>
                    <span className="text-gray-700 dark:text-gray-300">{ingredient}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flavor Profile */}
            <div className="content-card bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6" style={{ color: '#D4755B' }} />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Flavor Profile</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 font-semibold uppercase tracking-wide">
                {trend.flavorProfile.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {trend.flavorProfile.flavors.map((flavor, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 rounded-full text-sm font-semibold shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #D4755B20 0%, #8B9A7C20 100%)',
                      color: '#2C2C2C',
                      border: '1px solid #D4755B40'
                    }}
                  >
                    {flavor}
                  </span>
                ))}
              </div>
            </div>

            {/* Culinary Tips */}
            <div
              className="content-card rounded-2xl p-6 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8B9A7C 0%, #7BA05B 100%)'
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <Heart className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Pro Culinary Tips</h2>
              </div>
              <ul className="space-y-3">
                {trend.culinary_tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-white/95 pt-1 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button
                onClick={() => navigate({ to: '/meals/new' })}
                className="py-4 px-4 text-white rounded-2xl font-semibold hover:shadow-xl transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #D4755B 0%, #C97D5F 100%)' }}
              >
                <UtensilsCrossed className="w-5 h-5" />
                Create Meal
              </button>
              <button
                onClick={() => navigate({ to: '/calendar' })}
                className="py-4 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Plan Meal
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
