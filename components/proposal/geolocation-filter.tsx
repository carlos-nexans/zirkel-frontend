"use client"

import { useState, useEffect, useRef } from "react"
import { MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import "leaflet/dist/leaflet.css"

interface GeolocationFilterProps {
  onLocationSelect: (location: { lat: number; lng: number; radius: number }) => void
  isLoading: boolean
}

export function GeolocationFilter({ onLocationSelect, isLoading }: GeolocationFilterProps) {
  const [mapInitialized, setMapInitialized] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [radius, setRadius] = useState<number>(500)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const circleRef = useRef<any>(null)

  useEffect(() => {
    // Load Leaflet only on client-side
    if (typeof window !== "undefined" && !mapInitialized) {
      import("leaflet").then((L) => {
        // Fix Leaflet's icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        })

        // Create map if it doesn't exist
        if (!mapRef.current) {
          // Default to Mexico City
          const defaultLocation = { lat: 19.4326, lng: -99.1332 }

          // Initialize map
          const map = L.map("map").setView([defaultLocation.lat, defaultLocation.lng], 12)

          // Add tile layer
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map)

          // Add click handler
          map.on("click", (e: any) => {
            const { lat, lng } = e.latlng
            setSelectedLocation({ lat, lng })

            // Update marker
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng])
            } else {
              markerRef.current = L.marker([lat, lng]).addTo(map)
            }

            // Update circle
            if (circleRef.current) {
              circleRef.current.setLatLng([lat, lng])
            } else {
              circleRef.current = L.circle([lat, lng], {
                radius: radius,
                color: "blue",
                fillColor: "#30b3ff",
                fillOpacity: 0.2,
              }).addTo(map)
            }
          })

          mapRef.current = map
          setMapInitialized(true)
        }
      })
    }
  }, [mapInitialized])

  // Update circle radius when radius changes
  useEffect(() => {
    if (mapInitialized && circleRef.current && selectedLocation) {
      import("leaflet").then((L) => {
        circleRef.current.setRadius(radius)
      })
    }
  }, [radius, mapInitialized, selectedLocation])

  const handleSearch = () => {
    if (selectedLocation) {
      onLocationSelect({
        ...selectedLocation,
        radius,
      })
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div id="map" className="h-[250px] rounded-md border relative z-0" style={{ background: '#f0f0f0' }}></div>

        <div className="space-y-4">
          <div>
            <Label>Radio de búsqueda (metros)</Label>
            <div className="pt-4 px-2">
              <Slider value={[radius]} min={100} max={5000} step={100} onValueChange={(value) => setRadius(value[0])} />
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>100m</span>
              <span>{radius}m</span>
              <span>5000m</span>
            </div>
          </div>

          {selectedLocation && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="latitude">Latitud</Label>
                <Input id="latitude" value={selectedLocation.lat.toFixed(6)} readOnly />
              </div>
              <div>
                <Label htmlFor="longitude">Longitud</Label>
                <Input id="longitude" value={selectedLocation.lng.toFixed(6)} readOnly />
              </div>
            </div>
          )}

          <Button onClick={handleSearch} className="w-full" disabled={!selectedLocation || isLoading}>
            <MapPin className="mr-2 h-4 w-4" />
            {isLoading ? "Buscando..." : "Buscar en esta ubicación"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
