import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

import { AppSidebar } from "@/components/app-sidebar"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Gestión de Zirkel Media",
  description: "Plataforma para gestionar medios publicitarios",
  // generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <BreadcrumbNav />
            </header>
            <div className="flex flex-1 flex-col p-4">
              <Toaster />
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}


import './globals.css'