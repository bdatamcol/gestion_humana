'use client'
import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface PermissionsManagerProps {
  usuarioId: string
  onPermissionsChange: (permisos: any[]) => void
  disabled?: boolean
}

export function PermissionsManager({ usuarioId, onPermissionsChange, disabled = false }: PermissionsManagerProps) {
  
  useEffect(() => {
    // Notificar al componente padre que no hay permisos granulares
    onPermissionsChange([])
  }, [onPermissionsChange])

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription>
        El sistema de permisos granulares ha sido simplificado. Los usuarios ahora tienen acceso basado únicamente en su rol:
        <br />
        <strong>Administrador:</strong> Acceso completo a todas las funciones
        <br />
        <strong>Usuario:</strong> Acceso a su perfil y solicitudes
      </AlertDescription>
    </Alert>
  )
}
