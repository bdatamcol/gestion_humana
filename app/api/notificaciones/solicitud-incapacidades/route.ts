import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { incapacidadId, usuarioId } = await request.json()

    if (!incapacidadId || !usuarioId) {
      return NextResponse.json(
        { error: 'incapacidadId y usuarioId son requeridos' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Obtener datos de la incapacidad
    const { data: incapacidadData, error: incapacidadError } = await supabase
      .from('incapacidades')
      .select('*')
      .eq('id', incapacidadId)
      .single()

    if (incapacidadError || !incapacidadData) {
      return NextResponse.json(
        { error: 'Incapacidad no encontrada' },
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
    const formatDate = (date: string | null | undefined) => {
      if (!date) return 'No especificada'
      
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

    // Función para obtener el nombre del tipo de incapacidad
    const getTipoIncapacidadNombre = (tipo: string) => {
      // Esta función ya no es necesaria ya que no tenemos el campo tipo
      return tipo || 'No especificado'
    }

    // Función para obtener el estado de la incapacidad
    const getEstadoIncapacidad = (estado: string) => {
      switch (estado) {
        case 'en_revision':
          return 'En Revisión'
        case 'aprobada':
          return 'Aprobada'
        case 'rechazada':
          return 'Rechazada'
        default:
          return estado
      }
    }

    const asunto = `Nueva Solicitud de Incapacidad - ${userData.colaborador}`

    // Contenido HTML del correo
    const contenidoHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Solicitud de Incapacidad</title>
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
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
        .content {
            background-color: #ffffff;
            padding: 20px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
        }
        .info-section {
            margin-bottom: 20px;
        }
        .info-title {
            font-weight: bold;
            color: #495057;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .info-item {
            margin-bottom: 8px;
            padding-left: 10px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 10px;
            border-radius: 4px;
            border-left: 4px solid #ffc107;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: #dc3545; margin: 0;">Nueva Solicitud de Incapacidad</h1>
        <p style="margin: 10px 0 0 0; color: #6c757d;">Sistema de Gestión Humana</p>
    </div>
    
    <div class="content">
        <div class="highlight">
            <p><strong>Se ha registrado una nueva solicitud de incapacidad que requiere su revisión.</strong></p>
        </div>
        
        <div class="info-section">
            <div class="info-title">INFORMACIÓN DEL COLABORADOR:</div>
            <div class="info-item"><strong>Nombre:</strong> ${userData.colaborador}</div>
            <div class="info-item"><strong>Cédula:</strong> ${userData.cedula}</div>
            <div class="info-item"><strong>Cargo:</strong> ${userData.cargos?.nombre || 'No especificado'}</div>
            <div class="info-item"><strong>Empresa:</strong> ${userData.empresas?.nombre || 'No especificada'}</div>
        </div>
        
        <div class="info-section">
            <div class="info-title">DETALLES DE LA INCAPACIDAD:</div>
            <div class="info-item"><strong>Fecha de Inicio:</strong> ${formatDate(incapacidadData.fecha_inicio)}</div>
            <div class="info-item"><strong>Fecha de Fin:</strong> ${formatDate(incapacidadData.fecha_fin)}</div>
            <div class="info-item"><strong>Estado:</strong> ${getEstadoIncapacidad(incapacidadData.estado)}</div>
            <div class="info-item"><strong>Fecha de Registro:</strong> ${formatDate(incapacidadData.fecha_subida)}</div>
            <div class="info-item"><strong>Documento:</strong> <a href="${incapacidadData.documento_url}" target="_blank">Ver documento adjunto</a></div>
        </div>
        
        <p style="margin-top: 20px;">
            Por favor, revise esta solicitud en el sistema de gestión humana para proceder con la aprobación o solicitar información adicional.
        </p>
    </div>
    
    <div class="footer">
        <p>Este es un correo automático del Sistema de Gestión Humana.</p>
        <p>Por favor, no responda a este correo.</p>
    </div>
</body>
</html>
    `

    // Contenido de texto plano
    const contenidoTexto = `
Nueva Solicitud de Incapacidad

INFORMACIÓN DEL COLABORADOR:
- Nombre: ${userData.colaborador}
- Cédula: ${userData.cedula}
- Cargo: ${userData.cargos?.nombre || 'No especificado'}
- Empresa: ${userData.empresas?.nombre || 'No especificada'}

DETALLES DE LA INCAPACIDAD:
- Fecha de Inicio: ${formatDate(incapacidadData.fecha_inicio)}
- Fecha de Fin: ${formatDate(incapacidadData.fecha_fin)}
- Estado: ${getEstadoIncapacidad(incapacidadData.estado)}
- Fecha de Registro: ${formatDate(incapacidadData.fecha_subida)}
- Documento: ${incapacidadData.documento_url}

Por favor, revise esta solicitud en el sistema de gestión humana para proceder con la aprobación o solicitar información adicional.

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
      message: `Notificación de solicitud de incapacidades procesada. ${enviosExitosos} correo(s) enviado(s), ${enviosFallidos} fallo(s)`,
      data: {
        incapacidadId,
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
    console.error('Error al enviar notificación de incapacidad:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}