import type React from "react"
import type { Metadata } from "next"
import "../globals.css"
import "./leaflet.css"

export const metadata: Metadata = {
  title: "Generador de Propuestas",
  description: "Sistema para generar propuestas de medios publicitarios",
}

export default function ProposalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    {children}
  )
}
