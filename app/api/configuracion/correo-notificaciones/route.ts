import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

// GET - Obtener el correo de notificaciones actual
export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()

    // Usar select('*') para obtener todos los datos correctamente
    // Nota: select('valor') tiene un comportamiento inconsistente con campos de texto largos
    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .eq('clave', 'correo_notificaciones')
      .single()

    if (error) {
      console.error('Error al obtener correo de notificaciones:', error)
      return NextResponse.json(
        { error: 'Error al obtener la configuración' },
        { status: 500 }
      )
    }

    return NextResponse.json({ correo: data?.valor || '' })
  } catch (error) {
    console.error('Error en GET correo-notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar el correo de notificaciones
export async function PUT(request: NextRequest) {
  try {
    const { correo } = await request.json()

    // Validar que se proporcione un correo
    if (!correo || typeof correo !== 'string') {
      return NextResponse.json(
        { error: 'El correo es requerido' },
        { status: 400 }
      )
    }

    // Función para validar formato de correo
    const validarEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email.trim())
    }

    // Función para validar múltiples correos
    const validarMultiplesCorreos = (correos: string): { validos: string[], errores: string[] } => {
      const emails = correos.split(',').map(email => email.trim()).filter(email => email.length > 0)
      const validos: string[] = []
      const errores: string[] = []

      emails.forEach((email, index) => {
        if (validarEmail(email)) {
          validos.push(email)
        } else {
          errores.push(`Correo ${index + 1}: "${email}" no es válido`)
        }
      })

      return { validos, errores }
    }

    // Validar múltiples correos
    const { validos, errores } = validarMultiplesCorreos(correo)
    
    if (errores.length > 0) {
      return NextResponse.json(
        { error: `Se encontraron correos con formato inválido: ${errores.join(', ')}` },
        { status: 400 }
      )
    }

    if (validos.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron correos válidos' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Primero intentar actualizar el registro existente
    const { data: updateData, error: updateError } = await supabase
      .from('configuracion_sistema')
      .update({ 
        valor: validos.join(', '),
        fecha_actualizacion: new Date().toISOString()
      })
      .eq('clave', 'correo_notificaciones')
      .select()

    // Si no existe el registro, crearlo
    if (updateError || !updateData || updateData.length === 0) {
      const { data: insertData, error: insertError } = await supabase
        .from('configuracion_sistema')
        .insert({
          clave: 'correo_notificaciones',
          valor: validos.join(', '),
          descripcion: 'Correo electrónico para recibir notificaciones del sistema',
          tipo: 'string'
        })
        .select()

      if (insertError) {
        console.error('Error al insertar correo de notificaciones:', insertError)
        return NextResponse.json(
          { error: 'Error al guardar la configuración' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        message: `Correos de notificaciones guardados correctamente. ${validos.length} correo(s) configurado(s).`,
        correo: validos.join(', '),
        count: validos.length
      })
    }

    return NextResponse.json({ 
      message: `Correos de notificaciones actualizados correctamente. ${validos.length} correo(s) configurado(s).`,
      correo: validos.join(', '),
      count: validos.length
    })
  } catch (error) {
    console.error('Error en PUT correo-notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}