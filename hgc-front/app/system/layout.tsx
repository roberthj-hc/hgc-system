
import { AppSidebar } from "@/components/app-sidebar"

import {
  SidebarContent,
  SidebarProvider,
} from "@/components/ui/sidebar"

import React from "react"

import { ModeToggle } from "@/components/mode-toggle"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"



export default function Page({ children }: { children: React.ReactNode }) {

  return (
    <SidebarProvider>
      <SidebarContent>
        {children}
      </SidebarContent>
    </SidebarProvider>
  )
}