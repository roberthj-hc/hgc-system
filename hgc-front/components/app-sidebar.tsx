"use client"

import * as React from "react"
import {
  IconHelp,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
  IconMathFunction,
  IconRobot,
  IconTrendingUp,
  IconChartLine,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Predicciones",
      icon: IconTrendingUp,
      items: [
        { title: "Canibalización", url: "/system/predictions/cannibalization" },
        { title: "Fuga de clientes", url: "/system/predictions/churn" },
        { title: "Matriz BCG", url: "/system/predictions/bcg-clustering" },
        { title: "Rentabilidad sucursales", url: "/system/predictions/branch-performance" },
        { title: "Valor de vida (CLV)", url: "/system/predictions/clv" },
      ],
    },
    {
      title: "Series de tiempo",
      icon: IconChartLine,
      items: [
        { title: "Espejo del negocio", url: "/system/time-series/mirror-dashboard" },
        { title: "Detección de rentabilidad", url: "/system/time-series/profit-detective" },
        { title: "Apertura de sucursales", url: "/system/time-series/cbba-simulator" },
      ],
    },
    {
      title: "Econometría",
      icon: IconMathFunction,
      items: [
        { title: "Optimizador de margen", url: "/system/econometrics/price-optimizer" },
        { title: "Monitor de eficiencia", url: "/system/econometrics/efficiency-monitor" },
      ],
    },
    {
      title: "Asistente",
      icon: IconRobot,
      items: [
        { title: "Chat", url: "#" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:h-18! "
            >
              <a href="#">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">HGC</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
