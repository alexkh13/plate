import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/meals')({ component: OutfitsLayout })

function OutfitsLayout() {
  return <Outlet />
}
