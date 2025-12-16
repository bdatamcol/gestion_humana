import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'
import * as nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { solicitudId, usuarioId } = await request.json()

    if (!solicitudId || !usuarioId) {
      return NextResponse.json(
        { error: 'solicitudId y usuarioId son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Obtener datos de la solicitud de permisos
    const { data: solicitudData, error: solicitudError } = await supabase
      .from('solicitudes_permisos')
      .select('*')
      .eq('id', solicitudId)
      .single()

    if (solicitudError || !solicitudData) {
      return NextResponse.json(
        { error: 'Solicitud de permiso no encontrada' },
        { status: 404 }
      )
    }

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuario_nomina')
      .select(`
        colaborador,
        cedula,
        cargos:cargo_id(nombre),
        empresas:empresa_id(nombre)
      `)
      .eq('auth_user_id', usuarioId)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener configuración de correo
    const { data: configData, error: configError } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .eq('clave', 'correo_notificaciones')
      .single()

    if (configError || !configData) {
      return NextResponse.json(
        { error: 'No se pudo obtener el correo de notificaciones configurado' },
        { status: 500 }
      )
    }

    const correoDestino = configData.valor

    // Función para validar formato de correo
    const validarEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email.trim())
    }

    // Procesar múltiples correos destinatarios
    const correosDestino = correoDestino
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0 && validarEmail(email))

    if (correosDestino.length === 0) {
      console.error('No se encontraron correos válidos en la configuración')
      return NextResponse.json(
        { error: 'No hay correos de destino válidos configurados' },
        { status: 500 }
      )
    }

    // Crear transporter de nodemailer usando configuración del entorno
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Función para formatear fechas correctamente
    const formatDate = (date: string) => {
      // Si la fecha incluye timestamp, extraer solo la parte de fecha
      let fechaLimpia = date
      if (date.includes('T')) {
        fechaLimpia = date.slice(0, 10)
      }
      
      return new Date(fechaLimpia + 'T00:00:00').toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    // Función para formatear hora
    const formatTime = (time: string | null) => {
      if (!time) return 'No especificada'
      return time
    }

    // Función para obtener el nombre del tipo de permiso
    const getTipoPermisoNombre = (tipo: string) => {
      switch (tipo) {
        case 'no_remunerado':
          return 'No Remunerado'
        case 'remunerado':
          return 'Remunerado'
        case 'actividad_interna':
          return 'Actividad Interna'
        default:
          return tipo
      }
    }

    // Notificar en la aplicación a los jefes asignados del usuario
    const { data: jefesAsignados } = await supabase
      .from('usuario_jefes')
      .select('jefe_id')
      .eq('usuario_id', usuarioId)

    if (jefesAsignados && jefesAsignados.length > 0) {
      const tituloJefe = 'Solicitud de permiso pendiente de aprobación'
      const mensajeJefe = `El colaborador ${userData.colaborador} ha solicitado un permiso. Revisa y aprueba/rechaza.`
      const notifs = jefesAsignados.map((j: any) => ({
        usuario_id: j.jefe_id,
        tipo: 'permisos',
        titulo: tituloJefe,
        mensaje: mensajeJefe,
        solicitud_id: solicitudId
      }))
      await supabase.from('notificaciones').insert(notifs)
    }

    // Crear contenido del correo para administración
    const asunto = `Nueva Solicitud de Permiso - ${userData.colaborador}`
    
    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Solicitud de Permiso</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f8fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
            border: 1px solid #e2e8f0;
          }
          .info-section {
            background-color: white;
            padding: 20px;
            margin: 15px 0;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            color: #475569;
          }
          .value {
            color: #1e293b;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background-color: #f1f5f9;
            border-radius: 6px;
            font-size: 14px;
            color: #64748b;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏢 Nueva Solicitud de Permiso</h1>
        </div>
        
        <div class="content">
          <p>Se ha recibido una nueva solicitud de permiso que requiere su revisión.</p>
          
          <div class="info-section">
            <h3>📋 Información del Colaborador</h3>
            <div class="info-row">
              <span class="label">Nombre:</span>
              <span class="value">${userData.colaborador}</span>
            </div>
            <div class="info-row">
              <span class="label">Cédula:</span>
              <span class="value">${userData.cedula}</span>
            </div>
            <div class="info-row">
              <span class="label">Cargo:</span>
              <span class="value">${userData.cargos?.nombre || 'No especificado'}</span>
            </div>
            <div class="info-row">
              <span class="label">Empresa:</span>
              <span class="value">${userData.empresas?.nombre || 'No especificada'}</span>
            </div>
          </div>

          <div class="info-section">
            <h3>📅 Detalles del Permiso</h3>
            <div class="info-row">
              <span class="label">Tipo de Permiso:</span>
              <span class="value">${getTipoPermisoNombre(solicitudData.tipo_permiso)}</span>
            </div>
            <div class="info-row">
              <span class="label">Fecha de Inicio:</span>
              <span class="value">${formatDate(solicitudData.fecha_inicio)}</span>
            </div>
            <div class="info-row">
              <span class="label">Fecha de Fin:</span>
              <span class="value">${formatDate(solicitudData.fecha_fin)}</span>
            </div>
            <div class="info-row">
              <span class="label">Hora de Inicio:</span>
              <span class="value">${formatTime(solicitudData.hora_inicio)}</span>
            </div>
            <div class="info-row">
              <span class="label">Hora de Fin:</span>
              <span class="value">${formatTime(solicitudData.hora_fin)}</span>
            </div>
            ${solicitudData.ciudad ? `
            <div class="info-row">
              <span class="label">Ciudad:</span>
              <span class="value">${solicitudData.ciudad}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="label">Motivo:</span>
              <span class="value">${solicitudData.motivo}</span>
            </div>
            ${solicitudData.compensacion ? `
            <div class="info-row">
              <span class="label">Compensación:</span>
              <span class="value">${solicitudData.compensacion}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="label">Fecha de Solicitud:</span>
              <span class="value">${formatDate(solicitudData.fecha_solicitud)}</span>
            </div>
          </div>

          <div style="text-align: center;">
            <p>Por favor, revise esta solicitud en el sistema de gestión humana.</p>
          </div>
        </div>

        <div class="footer">
          <p>Este es un correo automático del Sistema de Gestión Humana.</p>
          <p>Por favor, no responda a este correo.</p>
        </div>
      </body>
      </html>
    `

    const contenidoTexto = `
Nueva Solicitud de Permiso

INFORMACIÓN DEL COLABORADOR:
- Nombre: ${userData.colaborador}
- Cédula: ${userData.cedula}
- Cargo: ${userData.cargos?.nombre || 'No especificado'}
- Empresa: ${userData.empresas?.nombre || 'No especificada'}

DETALLES DEL PERMISO:
- Tipo de Permiso: ${getTipoPermisoNombre(solicitudData.tipo_permiso)}
- Fecha de Inicio: ${formatDate(solicitudData.fecha_inicio)}
- Fecha de Fin: ${formatDate(solicitudData.fecha_fin)}
- Hora de Inicio: ${formatTime(solicitudData.hora_inicio)}
- Hora de Fin: ${formatTime(solicitudData.hora_fin)}
${solicitudData.ciudad ? `- Ciudad: ${solicitudData.ciudad}` : ''}
- Motivo: ${solicitudData.motivo}
${solicitudData.compensacion ? `- Compensación: ${solicitudData.compensacion}` : ''}
- Fecha de Solicitud: ${formatDate(solicitudData.fecha_solicitud)}

Por favor, revise esta solicitud en el sistema de gestión humana.

---
Este es un correo automático del Sistema de Gestión Humana.
Por favor, no responda a este correo.
    `

    // Enviar el email a múltiples destinatarios
    const resultadosEnvio = []
    let enviosExitosos = 0
    let enviosFallidos = 0

    for (const email of correosDestino) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: asunto,
          html: contenidoHTML,
          text: contenidoTexto,
        })
        resultadosEnvio.push({ email, status: 'enviado' })
        enviosExitosos++
      } catch (emailError) {
        console.error(`Error enviando correo a ${email}:`, emailError)
        resultadosEnvio.push({ email, status: 'error', error: emailError.message })
        enviosFallidos++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notificación de solicitud de permisos procesada. ${enviosExitosos} correo(s) enviado(s), ${enviosFallidos} fallo(s)`,
      data: {
        solicitudId,
        colaborador: userData.colaborador,
        correosEnviados: correosDestino,
        resultadosEnvio,
        estadisticas: {
          total: correosDestino.length,
          exitosos: enviosExitosos,
          fallidos: enviosFallidos
        }
      }
    })

  } catch (error) {
    console.error('Error al enviar notificación de permiso:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
