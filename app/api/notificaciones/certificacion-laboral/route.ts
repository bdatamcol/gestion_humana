import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'
import nodemailer from 'nodemailer'

// Función para obtener configuración SMTP
function getSMTPConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'seleccionth@cbb.com.co',
      pass: process.env.SMTP_PASS || 'ewjqvsntmbadbzah'
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
  }
}

// Función para validar email
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Función para enviar email con reintentos
async function sendEmailWithRetry(transporter: any, mailOptions: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await transporter.sendMail(mailOptions)
      return { success: true, attempt, info: result }
    } catch (error) {
      console.error(`Intento ${attempt}/${maxRetries} fallido:`, error)
      if (attempt === maxRetries) {
        throw error
      }
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const { solicitudId, usuarioId } = await request.json()

    if (!solicitudId || !usuarioId) {
      return NextResponse.json(
        { error: 'solicitudId y usuarioId son requeridos' },
        { status: 400 }
      )
    }

    // 1. Obtener el correo de notificaciones desde configuracion_sistema
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
    const isValidEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email.trim())
    }

    // Procesar múltiples correos destinatarios
    const correosDestino = correoDestino
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0 && isValidEmail(email))

    if (correosDestino.length === 0) {
      console.error('No se encontraron correos válidos en la configuración')
      return NextResponse.json(
        { error: 'No hay correos de destino válidos configurados' },
        { status: 500 }
      )
    }

    // 2. Obtener información del usuario que hizo la solicitud
    const { data: userData, error: userError } = await supabase
      .from('usuario_nomina')
      .select('colaborador, cedula, correo_electronico')
      .eq('auth_user_id', usuarioId)
      .single()

    if (userError || !userData) {
      console.error('Error al obtener datos del usuario:', userError)
      return NextResponse.json(
        { error: 'No se pudo obtener la información del usuario' },
        { status: 500 }
      )
    }

    // 3. Obtener información de la solicitud
    const { data: solicitudData, error: solicitudError } = await supabase
      .from('solicitudes_certificacion')
      .select('dirigido_a, fecha_solicitud, ciudad, salario_contrato')
      .eq('id', solicitudId)
      .single()

    if (solicitudError || !solicitudData) {
      console.error('Error al obtener datos de la solicitud:', solicitudError)
      return NextResponse.json(
        { error: 'No se pudo obtener la información de la solicitud' },
        { status: 500 }
      )
    }

    // 4. Configurar transporter de email
    const smtpConfig = getSMTPConfig()
    const transporter = nodemailer.createTransport(smtpConfig)

    // Verificar conexión SMTP
    try {
      await transporter.verify()
    } catch (smtpError) {
      console.error('Error de conexión SMTP:', smtpError)
      return NextResponse.json(
        { error: 'Error de conexión con el servidor de correo' },
        { status: 500 }
      )
    }

    // 5. Preparar el contenido del correo
    const fechaSolicitud = new Date(solicitudData.fecha_solicitud).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Solicitud de Certificación Laboral</title>
        <style>
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f9f9f9;
                padding: 20px;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .info-section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .info-label {
                font-weight: bold;
                color: #555;
                min-width: 150px;
            }
            .info-value {
                color: #333;
                flex: 1;
                text-align: right;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding: 20px;
                color: #666;
                font-size: 12px;
            }
            .alert {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🏢 Nueva Solicitud de Certificación Laboral</h1>
                <p>Sistema de Gestión Humana</p>
            </div>
            
            <div class="content">
                <div class="alert">
                    <strong>📋 Notificación Automática:</strong> El usuario <strong>${userData.colaborador}</strong> ha solicitado una certificación laboral.
                </div>
                
                <div class="info-section">
                    <h3>📄 Detalles de la Solicitud</h3>
                    <div class="info-row">
                        <span class="info-label">Solicitante:</span>
                        <span class="info-value">${userData.colaborador}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Documento:</span>
                            <span class="info-value">${userData.cedula}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Dirigido a:</span>
                        <span class="info-value">${solicitudData.dirigido_a}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Ciudad:</span>
                        <span class="info-value">${solicitudData.ciudad}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Incluir Salario:</span>
                        <span class="info-value">${solicitudData.salario_contrato === 'Si' ? 'Sí' : 'No'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Fecha de Solicitud:</span>
                        <span class="info-value">${fechaSolicitud}</span>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>📞 Información de Contacto</h3>
                    <div class="info-row">
                        <span class="info-label">Correo del Solicitante:</span>
                        <span class="info-value">${userData.correo_electronico || 'No disponible'}</span>
                    </div>
                </div>
                
                <p><strong>Acción requerida:</strong> Por favor, procese esta solicitud de certificación laboral a través del sistema de administración.</p>
            </div>
            
            <div class="footer">
                <p>Este es un correo automático generado por el Sistema de Gestión Humana.</p>
                <p>Por favor, no responda a este correo electrónico.</p>
                <p>© ${new Date().getFullYear()} Sistema de Gestión Humana</p>
            </div>
        </div>
    </body>
    </html>
    `

    const textContent = `
Nueva Solicitud de Certificación Laboral

El usuario ${userData.colaborador} ha solicitado una certificación laboral.

Detalles de la Solicitud:
- Solicitante: ${userData.colaborador}
- Documento: ${userData.cedula}
- Dirigido a: ${solicitudData.dirigido_a}
- Ciudad: ${solicitudData.ciudad}
- Incluir Salario: ${solicitudData.salario_contrato === 'Si' ? 'Sí' : 'No'}
- Fecha de Solicitud: ${fechaSolicitud}
- Correo del Solicitante: ${userData.correo_electronico || 'No disponible'}

Acción requerida: Por favor, procese esta solicitud de certificación laboral a través del sistema de administración.

Este es un correo automático generado por el Sistema de Gestión Humana.
Por favor, no responda a este correo electrónico.
    `

    // 6. Enviar el email a múltiples destinatarios
    const resultadosEnvio = []
    let enviosExitosos = 0
    let enviosFallidos = 0

    for (const email of correosDestino) {
      try {
        const mailOptions = {
          from: {
            name: 'Sistema de Gestión Humana',
            address: smtpConfig.auth.user
          },
          to: email,
          subject: `Nueva Solicitud de Certificación Laboral - ${userData.colaborador}`,
          html: htmlContent,
          text: textContent
        }

        const result = await sendEmailWithRetry(transporter, mailOptions)
        resultadosEnvio.push({ email, status: 'enviado', intentos: result.attempt })
        enviosExitosos++
      } catch (emailError) {
        console.error(`Error enviando correo a ${email}:`, emailError)
        resultadosEnvio.push({ 
          email, 
          status: 'error', 
          error: emailError instanceof Error ? emailError.message : 'Error desconocido'
        })
        enviosFallidos++
      }
    }

    // Cerrar el transporter
    transporter.close()

    return NextResponse.json({
      success: true,
      message: `Notificación de certificación laboral procesada. ${enviosExitosos} correo(s) enviado(s), ${enviosFallidos} fallo(s)`,
      data: {
        solicitudId,
        colaborador: userData.colaborador,
        correosEnviados: correosDestino,
        resultadosEnvio,
        estadisticas: {
          total: correosDestino.length,
          exitosos: enviosExitosos,
          fallidos: enviosFallidos
        },
        fechaEnvio: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error en POST notificaciones/certificacion-laboral:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}