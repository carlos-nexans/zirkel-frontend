"use client"

import React from "react"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function BreadcrumbNav() {
  const pathname = usePathname()

  // Generate breadcrumb items based on the current path
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean)

    if (paths.length === 0) {
      return [{ label: "Dashboard", path: "/", active: true }]
    }

    return [
      { label: "Inicio", path: "/", active: false },
      ...paths.map((path, index) => {
        const url = `/${paths.slice(0, index + 1).join("/")}`
        const isLast = index === paths.length - 1

        // Map path to readable label
        let label = path.charAt(0).toUpperCase() + path.slice(1)
        if (path === "media") label = "Gestión de espacios"
        if (path === "proposal") label = "Propuestas"
        if (path === "settings") label = "Configuración"

        return {
          label,
          path: url,
          active: isLast,
        }
      }),
    ]
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.active ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.path}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
