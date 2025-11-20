import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Sparkles, BookOpen, Lightbulb } from 'lucide-react'

export const Route = createFileRoute('/articles/$articleId')({ component: ArticlePage })

const articlesData: Record<string, {
  title: string
  gradient: string
  category: string
  introduction: string
  mainContent: { subtitle: string; text: string }[]
  keyTakeaways: string[]
}> = {
  'knife-skills': {
    title: 'Essential Knife Skills',
    gradient: 'linear-gradient(135deg, #B8B8B8 0%, #D0D0D0 100%)',
    category: 'Technique',
    introduction: 'Proper knife skills are the foundation of efficient, safe cooking. Mastering basic cuts not only speeds up prep time but also ensures even cooking and professional-looking dishes.',
    mainContent: [
      {
        subtitle: 'Choosing the Right Knife',
        text: 'A sharp chef\'s knife (8-10 inches) handles 90% of kitchen tasks. Pair it with a paring knife for detail work and a serrated knife for bread. Quality over quantity—three good knives beat a full block of mediocre ones.'
      },
      {
        subtitle: 'The Proper Grip',
        text: 'Hold the knife with your thumb and forefinger pinching the blade just in front of the handle, remaining fingers wrapped around the handle. This "pinch grip" offers control and precision. Your other hand should form a claw, fingertips curled inward, guiding the knife while protecting your fingers.'
      },
      {
        subtitle: 'The Rocking Motion',
        text: 'For dicing and mincing, use a rocking motion: keep the knife tip on the cutting board and rock the blade up and down while moving forward. This efficient technique works for onions, herbs, garlic, and most vegetables.'
      },
      {
        subtitle: 'Uniform Cuts Matter',
        text: 'Consistent sizing ensures even cooking. A dice should be cubes, brunoise is tiny cubes (1/8 inch), julienne are thin matchsticks, and chiffonade means thin ribbons (for herbs and leafy greens). Practice makes perfect.'
      },
      {
        subtitle: 'Knife Maintenance',
        text: 'Sharp knives are safer than dull ones—they require less pressure and are less likely to slip. Hone your knife before each use with a honing steel, and sharpen it every few months with a whetstone or professional service.'
      },
      {
        subtitle: 'Safety First',
        text: 'Always cut on a stable surface with a non-slip mat underneath your board. Cut away from your body, keep fingers curled, and never try to catch a falling knife—step back and let it fall. Clean knives should never sit in soapy dishwater where they\'re hidden.'
      }
    ],
    keyTakeaways: [
      'Invest in a quality 8-10" chef\'s knife as your workhorse',
      'Use the pinch grip for control and the claw hand for safety',
      'Master the rocking motion for efficient chopping and mincing',
      'Keep knives sharp—dull knives are dangerous',
      'Practice uniform cuts for even cooking and professional presentation'
    ]
  },
  'flavor-layering': {
    title: 'The Art of Flavor Layering',
    gradient: 'linear-gradient(135deg, #E5B85B 0%, #F5D175 100%)',
    category: 'Theory',
    introduction: 'Great cooking isn\'t about following a recipe—it\'s about building complex, balanced flavors layer by layer. Understanding this technique transforms good cooks into great ones.',
    mainContent: [
      {
        subtitle: 'Start with Aromatics',
        text: 'Most cuisines build flavor on aromatic foundations: onions, garlic, and celery in French cooking; ginger, garlic, and scallions in Chinese; onions, peppers, and tomatoes in Spanish. Sauté these first in fat to release their flavors and create a flavorful base.'
      },
      {
        subtitle: 'Toast Your Spices',
        text: 'Toasting whole or ground spices in a dry pan before adding them to dishes awakens their essential oils and deepens their flavor. Just a minute or two until fragrant makes a dramatic difference in dishes like curries, rice, or roasted vegetables.'
      },
      {
        subtitle: 'Add Depth with Umami',
        text: 'Umami—the savory, meaty fifth taste—adds depth and satisfaction. Incorporate it through ingredients like soy sauce, fish sauce, miso, tomato paste, anchovies, mushrooms, or parmesan. Even a small amount enhances overall flavor.'
      },
      {
        subtitle: 'Balance Sweet, Sour, Salty, Bitter',
        text: 'Great food balances all taste elements. If a dish tastes flat, it might need acid (lemon, vinegar). Too acidic? Add a pinch of sugar. Too sweet? Add salt or acid. Learning to adjust and balance is key to excellent cooking.'
      },
      {
        subtitle: 'Season Throughout',
        text: 'Don\'t wait until the end to season—add salt and spices at different stages of cooking. Salt draws out moisture from vegetables, helps caramelize proteins, and enhances other flavors when added early and adjusted at the end.'
      },
      {
        subtitle: 'Finish with Brightness',
        text: 'A final squeeze of lemon, splash of vinegar, drizzle of good olive oil, or handful of fresh herbs right before serving brightens and lifts all the flavors you\'ve built. This finishing touch separates home cooking from restaurant-quality food.'
      }
    ],
    keyTakeaways: [
      'Build flavor foundations with aromatics sautéed in fat',
      'Toast spices to release their essential oils',
      'Add umami-rich ingredients for depth and complexity',
      'Balance sweet, sour, salty, and bitter elements',
      'Finish dishes with acid, fat, or fresh herbs for brightness'
    ]
  },
  'seasonal-eating': {
    title: 'Eating with the Seasons',
    gradient: 'linear-gradient(135deg, #7BA05B 0%, #94B872 100%)',
    category: 'Philosophy',
    introduction: 'Seasonal eating connects us to natural cycles, supports local farmers, and delivers peak flavor and nutrition. When you cook with the seasons, you cook with nature\'s best.',
    mainContent: [
      {
        subtitle: 'Why Seasonal Matters',
        text: 'Produce harvested at peak ripeness and consumed shortly after tastes dramatically better than items picked early and shipped long distances. Seasonal food is fresher, more flavorful, more nutritious, and often more affordable.'
      },
      {
        subtitle: 'Know Your Seasons',
        text: 'Spring brings tender greens, asparagus, peas, and radishes. Summer offers tomatoes, corn, berries, and stone fruits. Fall brings squash, apples, root vegetables, and brassicas. Winter is for citrus, hearty greens, and stored crops like potatoes and onions.'
      },
      {
        subtitle: 'Shop at Farmers Markets',
        text: 'Farmers markets connect you directly with producers, offering the freshest seasonal produce while supporting local agriculture. Build relationships with farmers—they\'ll share cooking tips and let you know when special items arrive.'
      },
      {
        subtitle: 'Let Seasons Guide Menus',
        text: 'Instead of planning a recipe then shopping for ingredients, let what\'s fresh and beautiful at the market inspire your meals. This approach leads to more flavorful food and creative cooking.'
      },
      {
        subtitle: 'Preserve Peak Season',
        text: 'Extend the season through preservation: freeze berries, can tomatoes, pickle vegetables, or make jams. These preserved foods let you enjoy summer\'s bounty during winter months.'
      },
      {
        subtitle: 'Embrace Regional Differences',
        text: 'Seasons vary by region. California has year-round growing, while Minnesota has distinct seasons. Learn what thrives in your climate and when. Regional and seasonal eating go hand in hand.'
      }
    ],
    keyTakeaways: [
      'Seasonal produce offers superior flavor and nutrition',
      'Visit farmers markets to connect with local growers',
      'Let seasonal availability inspire your menu planning',
      'Learn preservation techniques to extend the season',
      'Understand your region\'s specific growing seasons'
    ]
  },
  'sustainable-seafood': {
    title: 'Sustainable Seafood Guide',
    gradient: 'linear-gradient(135deg, #6B9AC4 0%, #84AED4 100%)',
    category: 'Ethics',
    introduction: 'Choosing sustainable seafood protects ocean ecosystems for future generations while supporting responsible fishing practices. Making informed choices ensures we can enjoy seafood for years to come.',
    mainContent: [
      {
        subtitle: 'Why Sustainability Matters',
        text: 'Overfishing has depleted many fish populations, damaged ocean habitats, and disrupted marine ecosystems. Bycatch (unintended species caught and discarded) and destructive fishing methods compound the problem. Our choices directly impact ocean health.'
      },
      {
        subtitle: 'Use Seafood Watch',
        text: 'The Monterey Bay Aquarium\'s Seafood Watch program provides science-based recommendations, categorizing seafood as "Best Choice," "Good Alternative," or "Avoid." Download their app or check their website before shopping to make informed decisions.'
      },
      {
        subtitle: 'Look for Certifications',
        text: 'Seek MSC (Marine Stewardship Council) certification for wild-caught fish and ASC (Aquaculture Stewardship Council) for farmed fish. These third-party certifications ensure responsible practices, though not all sustainable operations seek certification.'
      },
      {
        subtitle: 'Choose Smaller Species',
        text: 'Smaller fish like sardines, anchovies, and mackerel reproduce quickly and are less likely to be overfished. They\'re also lower in mercury, higher in omega-3s, and incredibly flavorful when prepared properly.'
      },
      {
        subtitle: 'Ask Questions',
        text: 'Don\'t hesitate to ask fishmongers and restaurant servers about sourcing. Where was this caught? How? Is it farmed or wild? Good purveyors are happy to discuss their products and sourcing practices.'
      },
      {
        subtitle: 'Diversify Your Choices',
        text: 'Eating the same few species (salmon, tuna, shrimp) puts pressure on those populations. Explore underutilized species like pollock, rockfish, or domestic catfish. Diversifying your seafood choices helps balance demand.'
      }
    ],
    keyTakeaways: [
      'Use the Seafood Watch app for sustainable recommendations',
      'Look for MSC and ASC certification labels',
      'Choose smaller fish species that reproduce quickly',
      'Ask questions about sourcing at markets and restaurants',
      'Diversify beyond salmon, tuna, and shrimp'
    ]
  },
  'coffee-mastery': {
    title: 'Home Coffee Mastery',
    gradient: 'linear-gradient(135deg, #D4755B 0%, #E69A76 100%)',
    category: 'Beverage',
    introduction: 'Great coffee at home is more accessible than you think. Understanding a few key principles elevates your daily cup from routine to ritual.',
    mainContent: [
      {
        subtitle: 'Start with Fresh Beans',
        text: 'Coffee peaks 2-4 weeks after roasting. Buy whole beans from local roasters with roast dates on the bag. Avoid pre-ground coffee—it goes stale within hours of grinding. Store beans in an airtight container away from light and heat.'
      },
      {
        subtitle: 'Grind Right Before Brewing',
        text: 'Grinding exposes coffee to air, accelerating staling. Invest in a burr grinder (not blade) for consistent particle size. Grind size matters: coarse for French press, medium for drip, fine for espresso. Adjust to taste.'
      },
      {
        subtitle: 'Water Quality Matters',
        text: 'Coffee is 98% water, so water quality dramatically affects flavor. Use filtered water free of chlorine and off-flavors. Water temperature should be 195-205°F—just off boiling. Too hot extracts bitterness, too cool underextracts.'
      },
      {
        subtitle: 'Measure Your Coffee',
        text: 'Use a scale for consistency. A good starting ratio is 1:16 coffee to water (e.g., 25g coffee to 400g water). Adjust to your preference—more coffee for stronger, less for milder. Measuring removes guesswork and ensures repeatability.'
      },
      {
        subtitle: 'Brew Methods',
        text: 'Each method offers different flavors. Pour-over highlights clarity and nuance. French press creates full body. AeroPress is versatile and forgiving. Espresso is concentrated intensity. Experiment to find your preference.'
      },
      {
        subtitle: 'Clean Your Equipment',
        text: 'Coffee oils build up and turn rancid, tainting fresh brews. Rinse brewers after each use and deep clean weekly. A clean brewer lets your coffee\'s true flavors shine through.'
      }
    ],
    keyTakeaways: [
      'Buy fresh whole beans from local roasters',
      'Grind immediately before brewing with a burr grinder',
      'Use filtered water heated to 195-205°F',
      'Measure with a scale using a 1:16 coffee-to-water ratio',
      'Keep equipment clean for pure flavors'
    ]
  },
  'salad-composition': {
    title: 'Beyond Basic Salads',
    gradient: 'linear-gradient(135deg, #94B872 0%, #A4C47F 100%)',
    category: 'Composition',
    introduction: 'A great salad is a study in contrasts—textures, temperatures, flavors, and colors working in harmony. When thoughtfully composed, salads become satisfying main courses, not sad side dishes.',
    mainContent: [
      {
        subtitle: 'Build on Quality Greens',
        text: 'Start with crisp, fresh greens as your foundation. Mix textures—tender butter lettuce with crunchy romaine, peppery arugula with mild spinach. Wash and dry thoroughly (a salad spinner is essential) so dressing clings instead of sliding off.'
      },
      {
        subtitle: 'Add Textural Contrast',
        text: 'Great salads play with texture: crispy croutons, creamy avocado, crunchy nuts, tender roasted vegetables, chewy dried fruit. Every bite should offer different sensations. Think about soft, crunchy, crispy, and creamy in each salad.'
      },
      {
        subtitle: 'Include Protein for Satisfaction',
        text: 'Transform salads into complete meals with protein: grilled chicken, hard-boiled eggs, seared tuna, chickpeas, quinoa, or crumbled cheese. Protein adds staying power and makes salads genuinely satisfying.'
      },
      {
        subtitle: 'Layer Flavors Thoughtfully',
        text: 'Build complexity with layers: sweet (dried fruit, roasted beets), savory (cheese, olives), tangy (pickled onions, citrus), and fresh herbs. Each element should contribute something distinct while complementing the whole.'
      },
      {
        subtitle: 'Dress with Care',
        text: 'The best salad is ruined by poor dressing. Use 3 parts oil to 1 part acid as a base, add salt, pepper, and aromatics. Dress just before serving and with restraint—you want lightly coated leaves, not drowning greens. Toss gently but thoroughly.'
      },
      {
        subtitle: 'Seasonal Thinking',
        text: 'Let seasons guide composition. Summer brings tomatoes, corn, and stone fruits. Fall offers roasted squash, apples, and hearty greens. Winter features citrus and stored vegetables. Spring welcomes peas, radishes, and tender lettuces.'
      }
    ],
    keyTakeaways: [
      'Mix different greens for varied flavors and textures',
      'Include contrasting textures in every salad',
      'Add protein to make salads satisfying main courses',
      'Layer sweet, savory, tangy, and fresh elements',
      'Dress lightly just before serving'
    ]
  }
}

function ArticlePage() {
  const { articleId } = Route.useParams()
  const navigate = useNavigate()
  const article = articlesData[articleId]

  if (!article) {
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
            <p className="text-gray-600 dark:text-gray-400 mb-4" style={{ fontFamily: 'Source Sans 3, sans-serif' }}>Article not found</p>
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
        .article-page {
          font-family: 'Source Sans 3', sans-serif;
          background: linear-gradient(to bottom, #FAF8F4 0%, #E8E3DD 100%);
          min-height: 100vh;
        }

        .article-page h1, .article-page h2, .article-page h3 {
          font-family: 'Playfair Display', serif;
        }

        .dark .article-page {
          background: linear-gradient(to bottom, #1a1a1a 0%, #0f0f0f 100%);
        }

        .article-section {
          transition: all 0.3s ease;
        }

        .article-section:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
      `}</style>

      <div className="article-page pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div
            className="px-6 py-16 relative overflow-hidden flex flex-col items-center text-center"
            style={{ background: article.gradient }}
          >
            {/* Decorative pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '24px 24px'
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

              <Sparkles className="w-16 h-16 text-white/90 mb-4 mx-auto" />
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                <span className="text-sm font-bold uppercase tracking-wider text-white">{article.category}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
                {article.title}
              </h1>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-8 space-y-6">
            {/* Introduction */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-800">
              <div className="flex items-start gap-3">
                <BookOpen className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#D4755B' }} />
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Introduction</h2>
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                    {article.introduction}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Content Sections */}
            {article.mainContent.map((section, idx) => (
              <div key={idx} className="article-section bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-800">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                  {section.subtitle}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                  {section.text}
                </p>
              </div>
            ))}

            {/* Key Takeaways */}
            <div
              className="rounded-2xl p-6 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #D4755B 0%, #C97D5F 100%)'
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <Lightbulb className="w-7 h-7 text-white" />
                <h2 className="text-2xl font-bold text-white">Key Takeaways</h2>
              </div>
              <ul className="space-y-3">
                {article.keyTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-white/95 pt-1 leading-relaxed text-lg">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border-2 border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">
                Ready to put these tips into practice?
              </p>
              <button
                onClick={() => navigate({ to: '/meals/new' })}
                className="px-8 py-4 text-white rounded-full font-semibold hover:shadow-xl transition-all text-lg"
                style={{ background: 'linear-gradient(135deg, #8B9A7C 0%, #7BA05B 100%)' }}
              >
                Create Your Meal
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
