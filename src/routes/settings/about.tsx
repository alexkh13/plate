import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Heart, Github, Mail, Star, Code } from 'lucide-react'
import { useSetHeader } from '@/hooks/useHeaderConfig'

export const Route = createFileRoute('/settings/about')({ component: AboutPage })

function AboutPage() {
  const navigate = useNavigate()

  const appVersion = '1.0.0'
  const buildDate = '2025'

  const features = [
    'Digital pantry management',
    'Meal planning and creation',
    'Calendar integration',
    'Multiple profile support',
    'Dark/Light theme',
    'Local-first data storage',
    'Import/Export functionality'
  ]

  const technologies = [
    { name: 'React 19', version: '^19.2.0' },
    { name: 'TanStack Router', version: '^1.132.0' },
    { name: 'RxDB', version: '^16.20.0' },
    { name: 'Tailwind CSS', version: '^4.0.6' },
    { name: 'Vite', version: '^7.1.7' }
  ]

  // Configure unified header
  useSetHeader({
    showBack: true,
    backTo: '/settings',
    section: 'Settings',
    title: 'About',
  })

  return (
    <div className="bg-gray-50 dark:bg-gray-950 pb-20">
      <div className="max-w-md mx-auto">
        <div className="px-4 py-6 space-y-6">
          {/* App Info */}
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <span className="text-3xl text-white font-bold">P</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Plate
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-1">
              Version {appVersion}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Built with {Heart.name && <Heart className="inline w-4 h-4 text-red-500 fill-red-500" />} in {buildDate}
            </p>
          </div>

          {/* Description */}
          <section>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Plate is a modern meal tracking and nutrition management app that helps you organize your
                pantry, plan meals, and track your nutrition. All your data stays on your device
                with local-first storage.
              </p>
            </div>
          </section>

          {/* Features */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Features
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`px-4 py-3 flex items-center gap-3 ${
                    index !== features.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-800'
                      : ''
                  }`}
                >
                  <Star className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Technologies */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Built With
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              {technologies.map((tech, index) => (
                <div
                  key={index}
                  className={`px-4 py-3 flex items-center justify-between ${
                    index !== technologies.length - 1
                      ? 'border-b border-gray-100 dark:border-gray-800'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Code className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {tech.name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {tech.version}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Links */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2">
              Links
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    GitHub Repository
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    View source code
                  </p>
                </div>
              </a>

              <a
                href="mailto:support@example.com"
                className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Contact Support
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get help and support
                  </p>
                </div>
              </a>
            </div>
          </section>

          {/* License */}
          <section>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © {buildDate} Plate. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Made with care for your nutrition
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
