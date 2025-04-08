"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface FileUploaderProps {
  onUpload: (file: File) => void
  isLoading: boolean
}

export function FileUploader({ onUpload, isLoading }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

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

    if (file) {
      onUpload(file)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <h3 className="text-lg font-semibold">Subir archivo</h3>
                <p className="text-sm text-muted-foreground">
                  Arrastra y suelta un archivo o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground">Formatos soportados: PDF, Excel, CSV</p>
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleChange}
                accept=".pdf,.xls,.xlsx,.csv"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={isLoading}
              >
                Seleccionar archivo
              </Button>
            </div>
          </div>

          {file && !isLoading && (
            <div className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
              </div>
              <Button type="submit" size="sm">
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
