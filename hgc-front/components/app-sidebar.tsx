"use client"

import * as React from "react"
import {
  IconChartBar,
  IconHelp,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
  IconMathFunction,
  IconRobot,
  IconTrendingUp,
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
      title: "Análisis",
      icon: IconChartBar,
      items: [
        { title: "Clientes", url: "/system/analytics/clients" },
        { title: "Combos", url: "/system/analytics/combos" },
      ],
    },
    {
      title: "Proyecciones",
      icon: IconTrendingUp,
      items: [
        { title: "Segmentación de Clientes", url: "/system/predictions/segmentation" },
        { title: "Valor de Vida (CLV)", url: "/system/predictions/clv" },
        { title: "Ausentismo Laboral", url: "/system/predictions/absenteeism" },
        { title: "Canibalización (Labs)", url: "/system/predictions/cannibalization" },
        { title: "Propensión a Upselling", url: "/system/predictions/upselling" },
        { title: "Fuga de Clientes (Legacy)", url: "/system/predictions/legacy-churn" },
        { title: "Tiempos de Delivery", url: "/system/predictions/delivery" },
        { title: "El Espejo del Negocio", url: "/system/predictions/mirror-dashboard" },
        { title: "El Detective de Rentabilidad", url: "/system/predictions/profit-detective" },
        { title: "Simulador de Apertura", url: "/system/predictions/cbba-simulator" },
      ],
    },
    {
      title: "Econometría",
      icon: IconMathFunction,
      items: [
        { title: "Modelos", url: "#" },
        { title: "Regresiones", url: "#" },
      ],
    },
    {
      title: "Asistente",
      icon: IconRobot,
      items: [
        { title: "Chat", url: "#" },
        { title: "Historial", url: "#" },
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
