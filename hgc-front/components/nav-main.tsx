"use client"

import {
  IconCirclePlusFilled,
  IconMail,
  IconChevronDown,
  type Icon,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"

type NavItem = {
  title: string
  url?: string
  icon?: Icon
  items?: {
    title: string
    url: string
  }[]
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="min-w-8 bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>

            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <IconMail />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          {items.map((item) => (
            <Collapsible key={item.title} defaultOpen>
              <SidebarMenuItem>
                
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton className="group">
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>

                    <IconChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                {item.items && (
                  <CollapsibleContent>
                    <div className="ml-6 mt-1 flex flex-col gap-1">
                      {item.items.map((sub) => (
                        <a
                          key={sub.title}
                          href={sub.url}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {sub.title}
                        </a>
                      ))}
                    </div>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
