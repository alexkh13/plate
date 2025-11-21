import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/meals')({ component: MealsLayout })

function MealsLayout() {
  return <Outlet />
}
