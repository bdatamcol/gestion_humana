"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Wrench, Cog } from "lucide-react"

export default function AjustesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Settings className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
          <p className="text-gray-600">Configuración y ajustes del sistema</p>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Cog className="h-5 w-5 text-gray-600" />
              <div>
                <CardTitle className="text-lg">Configuración del Sistema</CardTitle>
                <CardDescription>
                  Ajustes generales y configuraciones del sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Vista en Desarrollo
                </h3>
                <p className="text-gray-600 max-w-md">
                  Esta sección está siendo desarrollada. Próximamente estará disponible 
                  con todas las opciones de configuración del sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}