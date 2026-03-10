import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'
import * as nodemailer from 'nodemailer'
import { formatLocalDate } from '@/lib/date-utils'

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

    // Función para validar formato de correo
    const validarEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email.trim())
    }

    // Función para formatear fechas correctamente
    const formatDate = (date: string) => {
      // Si la fecha incluye timestamp, extraer solo la parte de fecha
      let fechaLimpia = date
      if (date.includes('T')) {
        fechaLimpia = date.slice(0, 10)
      }
      
      return formatLocalDate(fechaLimpia, 'es-ES', {
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
    const { data: jefesAsignados, error: jefesError } = await supabase
      .from('usuario_jefes')
      .select('jefe_id')
      .eq('usuario_id', usuarioId)

    if (jefesError) {
      console.error('Error obteniendo jefes asignados:', jefesError)
    }

    let notificacionesInternasCreadas = 0
    let notificacionesInternasExistentes = 0

    let jefeIds: string[] = []

    if (jefesAsignados && jefesAsignados.length > 0) {
      jefeIds = [...new Set(jefesAsignados.map((j: any) => j.jefe_id))]

      const { data: notificacionesExistentes, error: existentesError } = await supabase
        .from('notificaciones')
        .select('usuario_id')
        .eq('solicitud_id', solicitudId)
        .eq('tipo', 'permisos')
        .in('usuario_id', jefeIds)

      if (existentesError) {
        console.error('Error consultando notificaciones existentes:', existentesError)
      }

      const usuariosConNotificacion = new Set((notificacionesExistentes || []).map((n: any) => n.usuario_id))
      notificacionesInternasExistentes = usuariosConNotificacion.size

      const tituloJefe = 'Solicitud de permiso pendiente de aprobación'
      const mensajeJefe = `El colaborador ${userData.colaborador} ha solicitado un permiso. Revisa y aprueba/rechaza.`
      const notifs = jefeIds
      .filter((jefeId: string) => !usuariosConNotificacion.has(jefeId))
      .map((jefeId: string) => ({
        usuario_id: jefeId,
        tipo: 'permisos',
        titulo: tituloJefe,
        mensaje: mensajeJefe,
        solicitud_id: solicitudId
      }))

      if (notifs.length > 0) {
        const { error: insertNotifError } = await supabase.from('notificaciones').insert(notifs)
        if (insertNotifError) {
          console.error('Error creando notificaciones internas para jefes:', insertNotifError)
        } else {
          notificacionesInternasCreadas = notifs.length
        }
      }
    }

    // Obtener configuración de correo para notificaciones administrativas
    const { data: configData, error: configError } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .eq('clave', 'correo_notificaciones')
      .single()

    let correosDestinoAdmin: string[] = []
    let motivoCorreoAdmin = ''

    if (!configError && configData?.valor) {
      correosDestinoAdmin = configData.valor
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email.length > 0 && validarEmail(email))

      if (correosDestinoAdmin.length === 0) {
        motivoCorreoAdmin = 'No hay correos válidos en correo_notificaciones.'
      }
    } else {
      motivoCorreoAdmin = 'No se encontró la configuración de correo_notificaciones.'
    }

    // Obtener correos de jefes activos
    const { data: jefesCorreoData, error: jefesCorreoError } = jefeIds.length > 0
      ? await supabase
          .from('usuario_nomina')
          .select('auth_user_id, colaborador, correo_electronico, estado')
          .in('auth_user_id', jefeIds)
          .eq('estado', 'activo')
      : { data: [], error: null }

    if (jefesCorreoError) {
      console.error('Error obteniendo correos de jefes:', jefesCorreoError)
    }

    const jefesActivosConCorreo = (jefesCorreoData || []).filter((jefe: any) =>
      typeof jefe.correo_electronico === 'string' && validarEmail(jefe.correo_electronico)
    )

    const correosDestinoJefes = [...new Set(
      jefesActivosConCorreo.map((jefe: any) => jefe.correo_electronico.trim())
    )]

    if (correosDestinoAdmin.length === 0 && correosDestinoJefes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Notificaciones internas procesadas. No hay correos de jefes ni administrativos válidos para envío.',
        data: {
          solicitudId,
          colaborador: userData.colaborador,
          notificacionesInternas: {
            creadas: notificacionesInternasCreadas,
            ya_existentes: notificacionesInternasExistentes,
          },
          correo: {
            admin: {
              enviados: 0,
              fallidos: 0,
              motivo: motivoCorreoAdmin || 'Sin destinatarios administrativos válidos.'
            },
            jefes: {
              enviados: 0,
              fallidos: 0,
              motivo: 'No se encontraron jefes activos con correo_electronico válido.'
            }
          }
        }
      })
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

    // Crear contenido del correo para administración
    const asunto = `Nueva Solicitud de Permiso - ${userData.colaborador}`
    const cargoNombre = Array.isArray((userData as any).cargos)
      ? (userData as any).cargos[0]?.nombre
      : (userData as any).cargos?.nombre
    const empresaNombre = Array.isArray((userData as any).empresas)
      ? (userData as any).empresas[0]?.nombre
      : (userData as any).empresas?.nombre
    const tipoPermisoNombre = getTipoPermisoNombre(solicitudData.tipo_permiso)
    const urlPanelJefe = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gestionhumana360.co'}/perfil/solicitudes/permisos`
    
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
              <span class="value">${cargoNombre || 'No especificado'}</span>
            </div>
            <div class="info-row">
              <span class="label">Empresa:</span>
              <span class="value">${empresaNombre || 'No especificada'}</span>
            </div>
          </div>

          <div class="info-section">
            <h3>📅 Detalles del Permiso</h3>
            <div class="info-row">
              <span class="label">Tipo de Permiso:</span>
              <span class="value">${tipoPermisoNombre}</span>
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
- Cargo: ${cargoNombre || 'No especificado'}
- Empresa: ${empresaNombre || 'No especificada'}

DETALLES DEL PERMISO:
- Tipo de Permiso: ${tipoPermisoNombre}
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

    const contenidoJefeHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Solicitud Pendiente de Aprobación</title>
      </head>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
        <h2>Tienes una solicitud de permiso pendiente</h2>
        <p>El colaborador <strong>${userData.colaborador}</strong> registró una nueva solicitud que requiere tu aprobación o rechazo.</p>
        <ul>
          <li><strong>Tipo:</strong> ${tipoPermisoNombre}</li>
          <li><strong>Fecha inicio:</strong> ${formatDate(solicitudData.fecha_inicio)}</li>
          <li><strong>Fecha fin:</strong> ${formatDate(solicitudData.fecha_fin)}</li>
          <li><strong>Motivo:</strong> ${solicitudData.motivo || 'No especificado'}</li>
        </ul>
        <p>
          <a href="${urlPanelJefe}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;">
            Ir a mis solicitudes de permisos
          </a>
        </p>
        <p style="font-size: 12px; color: #666;">Este es un correo automático del Sistema de Gestión Humana.</p>
      </body>
      </html>
    `

    const contenidoJefeTexto = `
Tienes una solicitud de permiso pendiente

El colaborador ${userData.colaborador} registró una nueva solicitud que requiere tu aprobación o rechazo.

- Tipo: ${tipoPermisoNombre}
- Fecha inicio: ${formatDate(solicitudData.fecha_inicio)}
- Fecha fin: ${formatDate(solicitudData.fecha_fin)}
- Motivo: ${solicitudData.motivo || 'No especificado'}

Ingresa aquí para revisar: ${urlPanelJefe}

Este es un correo automático del Sistema de Gestión Humana.
    `

    const resultadosEnvioAdmin = []
    let enviosAdminExitosos = 0
    let enviosAdminFallidos = 0

    const resultadosEnvioJefes = []
    let enviosJefesExitosos = 0
    let enviosJefesFallidos = 0

    for (const email of correosDestinoAdmin) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: asunto,
          html: contenidoHTML,
          text: contenidoTexto,
        })
        resultadosEnvioAdmin.push({ email, status: 'enviado' })
        enviosAdminExitosos++
      } catch (emailError) {
        console.error(`Error enviando correo a ${email}:`, emailError)
        const errorMessage = emailError instanceof Error ? emailError.message : 'Error desconocido'
        resultadosEnvioAdmin.push({ email, status: 'error', error: errorMessage })
        enviosAdminFallidos++
      }
    }

    for (const email of correosDestinoJefes) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: 'Solicitud de permiso pendiente de aprobación',
          html: contenidoJefeHTML,
          text: contenidoJefeTexto,
        })
        resultadosEnvioJefes.push({ email, status: 'enviado' })
        enviosJefesExitosos++
      } catch (emailError) {
        console.error(`Error enviando correo de jefe a ${email}:`, emailError)
        const errorMessage = emailError instanceof Error ? emailError.message : 'Error desconocido'
        resultadosEnvioJefes.push({ email, status: 'error', error: errorMessage })
        enviosJefesFallidos++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Notificación de solicitud de permisos procesada. Admin: ${enviosAdminExitosos} enviado(s), ${enviosAdminFallidos} fallo(s). Jefes: ${enviosJefesExitosos} enviado(s), ${enviosJefesFallidos} fallo(s).`,
      data: {
        solicitudId,
        colaborador: userData.colaborador,
        correosEnviados: {
          admin: correosDestinoAdmin,
          jefes: correosDestinoJefes,
        },
        resultadosEnvio: {
          admin: resultadosEnvioAdmin,
          jefes: resultadosEnvioJefes,
        },
        estadisticas: {
          admin: {
            total: correosDestinoAdmin.length,
            exitosos: enviosAdminExitosos,
            fallidos: enviosAdminFallidos,
            motivo: motivoCorreoAdmin,
          },
          jefes: {
            total: correosDestinoJefes.length,
            exitosos: enviosJefesExitosos,
            fallidos: enviosJefesFallidos,
          },
        },
        notificacionesInternas: {
          creadas: notificacionesInternasCreadas,
          ya_existentes: notificacionesInternasExistentes,
        },
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
