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

    // Obtener datos de la solicitud de vacaciones
    const { data: solicitudData, error: solicitudError } = await supabase
      .from('solicitudes_vacaciones')
      .select('*')
      .eq('id', solicitudId)
      .single()

    if (solicitudError || !solicitudData) {
      return NextResponse.json(
        { error: 'Solicitud de vacaciones no encontrada' },
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

    // Obtener configuración de email desde configuracion_sistema
    const { data: configData, error: configError } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'correo_notificaciones')
      .single()

    if (configError || !configData?.valor) {
      console.error('Error al obtener correo de notificaciones:', configError)
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

    // Calcular días de vacaciones con zona horaria local
    const fechaInicio = new Date(solicitudData.fecha_inicio + 'T00:00:00')
    const fechaFin = new Date(solicitudData.fecha_fin + 'T00:00:00')
    let diasVacaciones = 0
    const fechaActual = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate())
    
    while (fechaActual <= fechaFin) {
      if (fechaActual.getDay() !== 0) { // No contar domingos
        diasVacaciones++
      }
      fechaActual.setDate(fechaActual.getDate() + 1)
    }

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

    // Preparar el contenido del email
    const subject = `Nueva Solicitud de Vacaciones - ${userData.colaborador}`
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Solicitud de Vacaciones</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-row { margin: 10px 0; padding: 8px; background-color: white; border-radius: 4px; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; }
          .footer { margin-top: 20px; padding: 15px; background-color: #e8e8e8; text-align: center; border-radius: 4px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏖️ Nueva Solicitud de Vacaciones</h1>
          </div>
          <div class="content">
            <p>Se ha recibido una nueva solicitud de vacaciones con los siguientes detalles:</p>
            
            <div class="info-row">
              <span class="label">Colaborador:</span>
              <span class="value">${userData.colaborador}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Documento:</span>
              <span class="value">${userData.cedula}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Cargo:</span>
              <span class="value">${userData.cargos?.nombre || 'N/A'}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Empresa:</span>
              <span class="value">${userData.empresas?.nombre || 'N/A'}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Fecha de inicio:</span>
              <span class="value">${formatDate(solicitudData.fecha_inicio)}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Fecha de fin:</span>
              <span class="value">${formatDate(solicitudData.fecha_fin)}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Días solicitados:</span>
              <span class="value">${diasVacaciones} días</span>
            </div>
            
            <div class="info-row">
              <span class="label">Fecha de solicitud:</span>
              <span class="value">${formatDate(solicitudData.fecha_solicitud)}</span>
            </div>
            
            <div class="info-row">
              <span class="label">Estado:</span>
              <span class="value">Pendiente de aprobación</span>
            </div>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático del sistema de gestión humana.</p>
            <p>Por favor, no responda a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const textContent = `
Nueva Solicitud de Vacaciones

Se ha recibido una nueva solicitud de vacaciones con los siguientes detalles:

Colaborador: ${userData.colaborador}
Documento: ${userData.cedula}
Cargo: ${userData.cargos?.nombre || 'N/A'}
Empresa: ${userData.empresas?.nombre || 'N/A'}
Fecha de inicio: ${formatDate(solicitudData.fecha_inicio)}
Fecha de fin: ${formatDate(solicitudData.fecha_fin)}
Días solicitados: ${diasVacaciones} días
Fecha de solicitud: ${formatDate(solicitudData.fecha_solicitud)}
Estado: Pendiente de aprobación

---
Este es un mensaje automático del sistema de gestión humana.
Por favor, no responda a este correo.
    `

    // Enviar el email
    const resultadosEnvio = []
    let enviosExitosos = 0
    let enviosFallidos = 0

    for (const email of correosDestino) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: subject,
          html: htmlContent,
          text: textContent,
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
      message: `Notificación de solicitud de vacaciones procesada. ${enviosExitosos} correo(s) enviado(s), ${enviosFallidos} fallo(s)`,
      data: {
        solicitudId,
        colaborador: userData.colaborador,
        diasVacaciones,
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
    console.error('Error al enviar notificación de solicitud de vacaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}