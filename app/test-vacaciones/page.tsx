'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestVacaciones() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [users, setUsers] = useState<any[]>([])

  const getUsers = async () => {
    setLoading(true)
    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('usuario_nomina')
        .select('colaborador, auth_user_id')
        .eq('rol', 'usuario')
        .limit(5)
      
      if (error) throw error
      setUsers(data || [])
      setMessage(`Encontrados ${data?.length || 0} usuarios`)
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const insertTestData = async () => {
    if (users.length < 2) {
      setMessage('Necesitas al menos 2 usuarios. Obtén usuarios primero.')
      return
    }

    setLoading(true)
    try {
      const supabase = createSupabaseClient()
      
      const testVacaciones = [
        // Vacaciones activas para el primer usuario
        {
          usuario_id: users[0].auth_user_id,
          fecha_inicio: '2024-12-15',
          fecha_fin: '2024-12-25',
          estado: 'aprobado',
          fecha_solicitud: '2024-12-01'
        },
        // Vacaciones futuras para el primer usuario
        {
          usuario_id: users[0].auth_user_id,
          fecha_inicio: '2025-01-15',
          fecha_fin: '2025-01-25',
          estado: 'aprobado',
          fecha_solicitud: '2024-12-01'
        },
        // Vacaciones pasadas para el primer usuario
        {
          usuario_id: users[0].auth_user_id,
          fecha_inicio: '2024-11-01',
          fecha_fin: '2024-11-10',
          estado: 'aprobado',
          fecha_solicitud: '2024-10-15'
        },
        // Vacaciones pendientes para el segundo usuario
        {
          usuario_id: users[1].auth_user_id,
          fecha_inicio: '2025-02-01',
          fecha_fin: '2025-02-10',
          estado: 'pendiente',
          fecha_solicitud: '2024-12-16'
        }
      ]

      const { data, error } = await supabase
        .from('solicitudes_vacaciones')
        .insert(testVacaciones)
        .select()

      if (error) throw error
      setMessage(`✅ Insertadas ${data?.length || 0} solicitudes de vacaciones de prueba`)
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const clearTestData = async () => {
    if (users.length === 0) {
      setMessage('Obtén usuarios primero')
      return
    }

    setLoading(true)
    try {
      const supabase = createSupabaseClient()
      const userIds = users.map(u => u.auth_user_id)
      
      const { error } = await supabase
        .from('solicitudes_vacaciones')
        .delete()
        .in('usuario_id', userIds)

      if (error) throw error
      setMessage('🗑️ Datos de prueba eliminados')
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test de Datos de Vacaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={getUsers} disabled={loading}>
              Obtener Usuarios
            </Button>
            <Button onClick={insertTestData} disabled={loading || users.length < 2}>
              Insertar Datos de Prueba
            </Button>
            <Button onClick={clearTestData} disabled={loading || users.length === 0} variant="destructive">
              Limpiar Datos
            </Button>
          </div>
          
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          {users.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Usuarios encontrados:</h3>
              <ul className="space-y-1">
                {users.map((user, index) => (
                  <li key={index} className="text-sm">
                    {user.colaborador} - {user.auth_user_id}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
