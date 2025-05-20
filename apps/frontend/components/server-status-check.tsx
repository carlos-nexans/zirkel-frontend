"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useServerStatus } from "@/hooks/use-server-status"
import { Loader2 } from "lucide-react"

export function ServerStatusCheck() {
  const { isServerOnline } = useServerStatus()

  return (
    <>
      <Dialog open={!isServerOnline}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciando servidor</DialogTitle>
            <DialogDescription>
              El servidor está iniciando, espere unos segundos
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}