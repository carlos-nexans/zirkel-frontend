"use client"

import type * as React from "react"
import { FileText, Home, ImageIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  // Navigation data
  const navItems = [
    {
      title: "Principal",
      items: [
        {
          title: "Gestión de espacios",
          url: "/media",
          icon: ImageIcon,
          isActive: pathname === "/media",
        },
        // {
        //   title: "Creador de propuestas",
        //   url: "/proposal",
        //   icon: FileText,
        //   isActive: pathname.startsWith("/proposal"),
        // },
        {
          title: "Propuesta rápida",
          url: "/hot-proposals",
          icon: FileText,
          isActive: pathname.startsWith("/hot-proposals"),
        },
      ],
    },
  ]

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Home className="h-6 w-6 text-primary" />
          <Link href="/">
            <h1 className="text-xl font-bold">Zirkel Media</h1>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <a href={item.url}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
