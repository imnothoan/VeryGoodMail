"use client"

import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "animate-in slide-in-from-right fade-in-0 duration-300",
            "flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg",
            "max-w-md",
            toast.variant === "destructive" && "border-destructive bg-destructive/10"
          )}
        >
          <div className="flex-1 space-y-1">
            {toast.title && (
              <div className={cn(
                "text-sm font-semibold",
                toast.variant === "destructive" && "text-destructive"
              )}>
                {toast.title}
              </div>
            )}
            {toast.description && (
              <div className="text-sm text-muted-foreground">
                {toast.description}
              </div>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      ))}
    </div>
  )
}
