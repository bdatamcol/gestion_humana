"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Un componente Separator que proporciona una línea divisoria horizontal o vertical
 * para separar contenido en la interfaz de usuario.
 */
const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
    decorative?: boolean
  }
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <div
    ref={ref}
    data-orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
    aria-orientation={orientation}
    role={decorative ? "none" : "separator"}
  />
))
Separator.displayName = "Separator"

export { Separator }
