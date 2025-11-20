import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { ThemeProvider } from '../hooks/useTheme'
import { ProfileProvider } from '../hooks/useProfile'
import { HeaderConfigProvider } from '../hooks/useHeaderConfig'
import { QueryProvider } from '../providers/QueryProvider'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Plate',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <ProfileProvider>
              <HeaderConfigProvider>
                <Header />
                {children}
                <BottomNav />
              </HeaderConfigProvider>
            </ProfileProvider>
          </ThemeProvider>
        </QueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
