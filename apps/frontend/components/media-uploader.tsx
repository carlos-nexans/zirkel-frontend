"use client"

import type React from "react"

import { useCallback } from "react"
import { FileUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaUploaderProps {
  onUpload: (file: File) => void
  isLoading: boolean
  currentImage?: string
  onRemove?: () => void
}

export function MediaUploader({ onUpload, isLoading, currentImage, onRemove }: MediaUploaderProps) {
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onUpload(e.dataTransfer.files[0])
      }
    },
    [onUpload],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        onUpload(e.target.files[0])
      }
    },
    [onUpload],
  )

  if (currentImage) {
    return (
      <div className="relative">
        <img src={currentImage} alt="Media preview" className="w-[600px] min-h-[200px] object-cover rounded-md" />
        {onRemove && (
          <Button type="button" variant="destructive" size="icon" className="absolute top-2 left-2" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`
        relative
        border-2
        border-dashed
        rounded-lg
        p-4
        transition-colors
        hover:bg-muted/50
        ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !isLoading && document.getElementById("media-upload")?.click()}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="p-2 rounded-full bg-primary/10">
          <FileUp className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium">{isLoading ? "Subiendo..." : "Arrastra o haz clic para subir"}</p>
        <p className="text-xs text-muted-foreground">Soporta: JPG, PNG, GIF</p>
      </div>
      <input
        id="media-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        disabled={isLoading}
      />
    </div>
  )
}
