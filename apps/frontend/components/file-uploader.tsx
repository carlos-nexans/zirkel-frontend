"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileUp, Paperclip, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface FileUploaderProps {
  onUpload: (file: File, provider: string) => void
  isLoading: boolean
  accept?: string
  currentImage?: string
  title?: string
  description?: string
  supportedFormats?: string
}

export function FileUploader({
  onUpload,
  isLoading,
  accept,
  currentImage,
  title,
  description,
  supportedFormats,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [provider, setProvider] = useState<string>("")

  // Mock providers data
  const providers = [
    { id: 1, name: "MediaCorp" },
    { id: 2, name: "PubliMax" },
    { id: 3, name: "VisualAds" },
    { id: 4, name: "OutdoorMedia" },
    { id: 5, name: "CityAds" },
  ]

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (file && provider) {
      onUpload(file, provider)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider selection */}
          <div className="mb-4">
            <Label htmlFor="provider">Proveedor *</Label>
            <Select onValueChange={setProvider} value={provider}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              El proveedor seleccionado se aplicará a todos los medios del archivo
            </p>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? "border-primary bg-primary/5" : "border-gray-300"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileUp className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
                <p className="text-xs text-muted-foreground">{supportedFormats}</p>
              </div>
              <input id="file-upload" type="file" className="hidden" onChange={handleChange} accept={accept} />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={isLoading}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Seleccionar archivo
              </Button>
            </div>
          </div>

          {currentImage && (
            <div className="mt-4">
              <img
                src={currentImage || "/placeholder.svg"}
                alt="Preview"
                className="w-full max-h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {file && !isLoading && (
            <div className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
              </div>
              <Button type="submit" size="sm" disabled={!provider}>
                <Sparkles className="mr-2 h-4 w-4" />
                Procesar
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Procesando archivo...</span>
                <span>Por favor espere</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
