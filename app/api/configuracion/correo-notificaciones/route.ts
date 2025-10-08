import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

// GET - Obtener el correo de notificaciones actual
export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('valor')
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

    // Validar formato de correo básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(correo)) {
      return NextResponse.json(
        { error: 'El formato del correo no es válido' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Primero intentar actualizar el registro existente
    const { data: updateData, error: updateError } = await supabase
      .from('configuracion_sistema')
      .update({ 
        valor: correo,
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
          valor: correo,
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
        message: 'Correo de notificaciones guardado correctamente',
        correo: correo
      })
    }

    return NextResponse.json({ 
      message: 'Correo de notificaciones actualizado correctamente',
      correo: correo
    })
  } catch (error) {
    console.error('Error en PUT correo-notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}