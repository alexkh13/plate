import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Heart, BookOpen } from 'lucide-react'

export const Route = createFileRoute('/guides/$guideId')({ component: GuidePage })

const guidesData: Record<string, {
  title: string
  gradient: string
  description: string
  introduction: string
  sections: { title: string; content: string; tips?: string[] }[]
}> = {
  'breakfast-rituals': {
    title: 'Morning Rituals',
    gradient: 'linear-gradient(135deg, #D4755B 0%, #E69A76 100%)',
    description: 'Start your day intentionally',
    introduction: 'How you begin your morning sets the tone for your entire day. These breakfast rituals combine nutrition with mindfulness, creating a foundation for energy, focus, and well-being.',
    sections: [
      {
        title: '1. Wake Up with Hydration',
        content: 'Before reaching for coffee, drink a full glass of water with lemon. Your body is dehydrated after sleep, and hydrating first thing helps jump-start metabolism, aids digestion, and increases mental clarity.',
        tips: ['Keep water by your bedside', 'Add fresh lemon for vitamin C', 'Wait 20 minutes before coffee for best effect']
      },
      {
        title: '2. Build a Balanced Plate',
        content: 'A nourishing breakfast includes protein, complex carbs, and healthy fats. This combination provides sustained energy and keeps you satisfied until lunch. Think eggs with whole grain toast and avocado, or Greek yogurt with nuts and berries.',
        tips: ['Aim for 15-20g protein at breakfast', 'Include fiber-rich whole grains', 'Add colorful fruits or vegetables']
      },
      {
        title: '3. Practice Mindful Eating',
        content: 'Instead of scrolling through your phone while eating, take time to truly taste your food. Sit down, breathe, and appreciate each bite. This practice improves digestion and helps you feel more satisfied.',
        tips: ['Put away screens during meals', 'Chew slowly and thoroughly', 'Notice flavors, textures, and aromas']
      },
      {
        title: '4. Prep the Night Before',
        content: 'Set yourself up for success by preparing what you can the evening before. Overnight oats, chia pudding, or simply laying out your coffee cup can remove decision fatigue from busy mornings.',
        tips: ['Try overnight oats for grab-and-go meals', 'Cut fruit the night before', 'Set out your breakfast dishes']
      },
      {
        title: '5. Create Consistency',
        content: 'Having a regular breakfast routine—same time, similar structure—helps regulate your body\'s hunger hormones and energy levels. You don\'t need to eat the exact same thing, but a consistent rhythm makes a difference.',
        tips: ['Eat within an hour of waking', 'Find 2-3 go-to breakfast templates', 'Honor weekend rituals too']
      }
    ]
  },
  'weeknight-heroes': {
    title: 'Weeknight Heroes',
    gradient: 'linear-gradient(135deg, #8B9A7C 0%, #A4B896 100%)',
    description: '30 minutes or less',
    introduction: 'Busy weeknights don\'t mean you have to sacrifice flavor or nutrition. These strategies help you get delicious, wholesome dinners on the table in 30 minutes or less.',
    sections: [
      {
        title: 'Keep It Simple',
        content: 'The best weeknight meals have minimal ingredients and straightforward techniques. A perfectly seasoned protein, a vibrant vegetable side, and a simple starch can be incredibly satisfying without complexity.',
        tips: ['Stick to 5-7 ingredients per dish', 'Master a few versatile cooking methods', 'Let quality ingredients shine']
      },
      {
        title: 'Strategic Meal Prep',
        content: 'Spend an hour on Sunday prepping components: wash and chop vegetables, cook a batch of grains, marinate proteins. Having these ready makes weeknight assembly incredibly fast.',
        tips: ['Cook grains in bulk on weekends', 'Pre-cut hardy vegetables', 'Keep pre-washed salad greens on hand']
      },
      {
        title: 'One-Pan Solutions',
        content: 'Sheet pan dinners and one-pot meals minimize both cooking and cleanup time. Throw protein and vegetables on a sheet pan with olive oil and seasoning, roast at 425°F for 20-25 minutes, and dinner is done.',
        tips: ['Use parchment paper for easier cleanup', 'Start with longer-cooking items', 'Finish with a squeeze of lemon']
      },
      {
        title: 'Smart Pantry Staples',
        content: 'A well-stocked pantry is your weeknight secret weapon. Keep canned beans, pasta, rice, canned tomatoes, and versatile spices on hand. These staples can become countless quick meals.',
        tips: ['Stock versatile proteins like canned beans and tuna', 'Keep quick-cooking grains like couscous', 'Always have onions, garlic, and lemons']
      },
      {
        title: 'Embrace Shortcuts',
        content: 'Pre-washed greens, rotisserie chicken, frozen vegetables, and quality jarred sauces aren\'t cheating—they\'re smart cooking. These shortcuts free up your time while still delivering homemade goodness.',
        tips: ['Use rotisserie chicken for instant protein', 'Frozen vegetables are just as nutritious', 'Doctor up store-bought sauce with fresh herbs']
      }
    ]
  },
  'plant-forward': {
    title: 'Plant-Forward Plates',
    gradient: 'linear-gradient(135deg, #7BA05B 0%, #94B872 100%)',
    description: 'Vegetables take center stage',
    introduction: 'Plant-forward eating doesn\'t mean vegetarian or vegan—it means centering your meals around vegetables, fruits, legumes, and whole grains while still including meat when desired. This approach celebrates the incredible flavors and nutrition plants offer.',
    sections: [
      {
        title: 'Rethink Your Plate',
        content: 'Instead of meat as the centerpiece with sides, make vegetables the star. Let a beautiful roasted cauliflower steak, hearty grain bowl, or vibrant vegetable curry take center stage, with animal protein as an optional addition.',
        tips: ['Fill half your plate with vegetables', 'Try "Meatless Monday" to experiment', 'Let seasonal produce inspire your meals']
      },
      {
        title: 'Explore Legumes',
        content: 'Beans, lentils, and chickpeas are protein powerhouses with fiber, minerals, and satisfying texture. They\'re incredibly versatile—pureed into dips, simmered in stews, roasted for crunch, or mashed into veggie burgers.',
        tips: ['Keep various canned beans stocked', 'Try lentils—they cook in just 20 minutes', 'Experiment with chickpea flour for baking']
      },
      {
        title: 'Master Vegetable Techniques',
        content: 'Learn to coax maximum flavor from vegetables through roasting, grilling, and caramelizing. High heat transforms ordinary vegetables into sweet, crispy, umami-rich delights that need little embellishment.',
        tips: ['Roast vegetables at 425°F for caramelization', 'Don\'t overcrowd the pan', 'Add salt at the end for best texture']
      },
      {
        title: 'Add Umami & Richness',
        content: 'Plant-based meals satisfy when they include umami-rich ingredients like mushrooms, miso, soy sauce, tomato paste, and nutritional yeast. Healthy fats from nuts, seeds, avocado, and olive oil add richness and satisfaction.',
        tips: ['Use mushrooms for meaty texture', 'Add miso for depth of flavor', 'Finish with good olive oil or tahini']
      },
      {
        title: 'Celebrate Whole Grains',
        content: 'Move beyond white rice to explore farro, quinoa, barley, and bulgur. These grains offer nutty flavors, interesting textures, and more fiber and nutrients than refined grains.',
        tips: ['Cook grains in vegetable broth for flavor', 'Make extra to use throughout the week', 'Try grain bowls with various toppings']
      }
    ]
  },
  'coastal-cuisine': {
    title: 'Coastal Cuisine',
    gradient: 'linear-gradient(135deg, #6B9AC4 0%, #84AED4 100%)',
    description: 'Fresh from the sea',
    introduction: 'Coastal cooking celebrates the bounty of the ocean with simple preparations that let fresh seafood shine. These techniques and tips help you cook fish and shellfish with confidence.',
    sections: [
      {
        title: 'Choose Fresh Fish',
        content: 'Look for bright, clear eyes, firm flesh that springs back when pressed, and a fresh, ocean smell—not fishy. Build a relationship with a good fishmonger who can guide you to the freshest options.',
        tips: ['Ask what came in that day', 'Look for sustainable certifications', 'Fresh fish should smell like the ocean, not "fishy"']
      },
      {
        title: 'Keep It Simple',
        content: 'The best seafood preparations are often the simplest. A quick sear, gentle poach, or brief broil with olive oil, lemon, and herbs is often all fish needs to shine.',
        tips: ['Don\'t overcook—fish continues cooking after heat', 'Use high heat for crispy skin', 'Acid brightens fish beautifully']
      },
      {
        title: 'Master Cooking Times',
        content: 'Fish cooks quickly—usually 4-6 minutes per inch of thickness. Shellfish are done when they turn opaque. Overcooked seafood becomes tough and dry, so watch carefully.',
        tips: ['Fish is done when it flakes easily', 'Shrimp cook in just 2-3 minutes', 'Use an instant-read thermometer: 145°F']
      },
      {
        title: 'Complementary Flavors',
        content: 'Mediterranean ingredients like lemon, garlic, olive oil, capers, and tomatoes naturally complement seafood. Asian flavors like ginger, soy, sesame, and chili also work beautifully.',
        tips: ['Pair rich fish with acidic flavors', 'Delicate fish need gentle seasonings', 'Fresh herbs add brightness']
      },
      {
        title: 'Sustainability Matters',
        content: 'Choose seafood from sustainable sources to protect ocean ecosystems. Look for MSC (Marine Stewardship Council) certification, use the Monterey Bay Aquarium Seafood Watch guide, and vary the species you eat.',
        tips: ['Download the Seafood Watch app', 'Ask about sourcing at restaurants', 'Try underutilized species']
      }
    ]
  },
  'cozy-baking': {
    title: 'Cozy Baking',
    gradient: 'linear-gradient(135deg, #D47B9C 0%, #E395B0 100%)',
    description: 'Sweet comfort therapy',
    introduction: 'Baking is more than making dessert—it\'s a meditative practice that fills your home with warmth and wonderful aromas. These fundamentals will help you bake with confidence and joy.',
    sections: [
      {
        title: 'Measure Accurately',
        content: 'Baking is science, and accurate measurements matter. Use measuring cups for dry ingredients (scoop and level) and liquid measures for wet ingredients. Even better, use a kitchen scale for precision.',
        tips: ['Invest in a simple kitchen scale', 'Spoon flour into cups, don\'t pack', 'Level with a straight edge']
      },
      {
        title: 'Room Temperature Matters',
        content: 'Many recipes call for room temperature butter, eggs, and dairy for good reason—they incorporate more easily and create better texture. Plan ahead and let ingredients sit out for 30-60 minutes.',
        tips: ['Set butter out an hour before baking', 'Warm eggs in warm water for 5 minutes', 'Room temp ingredients mix more evenly']
      },
      {
        title: 'Don\'t Overmix',
        content: 'Overmixing develops gluten, making baked goods tough instead of tender. Mix just until ingredients are combined, even if a few flour streaks remain. They\'ll incorporate during baking.',
        tips: ['Mix muffins and quick breads just until combined', 'Fold gently with a spatula', 'Some lumps are okay']
      },
      {
        title: 'Oven Temperature',
        content: 'Invest in an oven thermometer—most ovens run hot or cold. Preheat fully before baking (usually 15-20 minutes), and position racks before preheating for safety.',
        tips: ['Use an oven thermometer for accuracy', 'Rotate pans halfway through for even baking', 'Don\'t open the oven door frequently']
      },
      {
        title: 'Cool Properly',
        content: 'Letting baked goods cool completely helps them set properly. Cookies continue firming as they cool, cakes are easier to frost when cold, and bread slices better after resting.',
        tips: ['Cool cookies on the pan for 5 minutes, then transfer', 'Cool cakes in pans for 10 minutes before unmolding', 'Wait until bread is completely cool to slice']
      }
    ]
  },
  'global-pantry': {
    title: 'Global Pantry',
    gradient: 'linear-gradient(135deg, #9B7BAE 0%, #B595C4 100%)',
    description: 'Flavors from afar',
    introduction: 'Exploring global cuisines from your own kitchen opens up a world of flavors and techniques. Building a well-stocked international pantry lets you travel through food.',
    sections: [
      {
        title: 'Start with the Basics',
        content: 'Begin building your global pantry with versatile staples: soy sauce, fish sauce, miso paste, tahini, harissa, and curry paste. These ingredients add authentic flavor to countless dishes.',
        tips: ['Buy small amounts to start', 'Read labels for quality ingredients', 'Store properly to maintain freshness']
      },
      {
        title: 'Learn the Flavor Foundations',
        content: 'Every cuisine has its flavor base: French mirepoix, Italian soffritto, Cajun holy trinity, Chinese aromatics. Learning these foundations helps you understand and recreate authentic flavors.',
        tips: ['Master the aromatics of each cuisine', 'Understand the role of acids and fats', 'Study traditional spice combinations']
      },
      {
        title: 'Respect the Cuisine',
        content: 'Approach global cooking with respect and curiosity. Research traditional preparations, understand cultural context, and seek out authentic recipes from native cooks and sources.',
        tips: ['Follow authentic recipes first', 'Learn the cultural context', 'Support immigrant-owned food businesses']
      },
      {
        title: 'Invest in Key Tools',
        content: 'Certain cuisines benefit from specific tools: a wok for Chinese cooking, a molcajete for Mexican, a tagine for Moroccan. While not essential, these tools make authentic preparation easier.',
        tips: ['Start with a wok or cast iron for high heat', 'A rice cooker is invaluable', 'Mortar and pestle for fresh pastes']
      },
      {
        title: 'Explore Mindfully',
        content: 'Trying global cuisines isn\'t about "exotic" foods—it\'s about expanding your palate and appreciating diverse culinary traditions. Be curious, be respectful, and be willing to learn.',
        tips: ['Try one new cuisine at a time', 'Visit ethnic grocery stores', 'Watch cooking videos from native cooks']
      }
    ]
  }
}

function GuidePage() {
  const navigate = useNavigate()
  const { guideId } = Route.useParams()
  const guide = guidesData[guideId]

  if (!guide) {
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
            <p className="text-gray-600 dark:text-gray-400 mb-4" style={{ fontFamily: 'Source Sans 3, sans-serif' }}>Guide not found</p>
            <button
              onClick={() => navigate({ to: '/discover' })}
              className="px-6 py-3 bg-[#8B9A7C] text-white rounded-full font-semibold hover:bg-[#7BA05B] transition-all"
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
        .guide-page {
          font-family: 'Source Sans 3', sans-serif;
          background: linear-gradient(to bottom, #FAF8F4 0%, #E8E3DD 100%);
          min-height: 100vh;
        }

        .guide-page h1, .guide-page h2, .guide-page h3 {
          font-family: 'Playfair Display', serif;
        }

        .dark .guide-page {
          background: linear-gradient(to bottom, #1a1a1a 0%, #0f0f0f 100%);
        }

        .section-card {
          transition: all 0.3s ease;
        }

        .section-card:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
      `}</style>

      <div className="guide-page pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Header Banner */}
          <div className="px-6 py-16 relative overflow-hidden" style={{ background: guide.gradient }}>
            {/* Decorative pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative z-10">
              <button
                onClick={() => navigate({ to: '/discover' })}
                className="flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="font-medium">Back to Discover</span>
              </button>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                {guide.title}
              </h1>
              <p className="text-xl text-white/90 font-light">
                {guide.description}
              </p>
            </div>
          </div>

          {/* Introduction */}
          <div className="px-6 py-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-800 mb-8">
              <div className="flex items-start gap-3">
                <BookOpen className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#D4755B' }} />
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {guide.introduction}
                </p>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-6">
              {guide.sections.map((section, index) => (
                <div
                  key={index}
                  className="section-card bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border-2 border-gray-100 dark:border-gray-800"
                >
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {section.title}
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    {section.content}
                  </p>

                  {section.tips && section.tips.length > 0 && (
                    <div className="mt-5 pl-5 border-l-4 rounded" style={{ borderColor: '#8B9A7C' }}>
                      <p className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: '#8B9A7C' }}>
                        Quick Tips
                      </p>
                      <ul className="space-y-2">
                        {section.tips.map((tip, tipIndex) => (
                          <li
                            key={tipIndex}
                            className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                          >
                            <span className="mt-0.5" style={{ color: '#8B9A7C' }}>•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Call to Action */}
            <div
              className="mt-12 rounded-3xl p-8 text-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #8B9A7C 0%, #7BA05B 100%)'
              }}
            >
              <Heart className="w-12 h-12 text-white mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-3">
                Ready to get started?
              </h3>
              <p className="text-white/90 mb-6 text-lg">
                Put these tips into practice and create delicious meals
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={() => navigate({ to: '/foods/new' })}
                  className="px-6 py-3 bg-white text-gray-900 rounded-full font-semibold hover:shadow-xl transition-all"
                >
                  Add Ingredient
                </button>
                <button
                  onClick={() => navigate({ to: '/meals/new' })}
                  className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white border-2 border-white/40 rounded-full font-semibold hover:bg-white/30 transition-all"
                >
                  Create Meal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
