import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import nodemailer from 'nodemailer';

// Función de debug
function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// Función para obtener configuración SMTP optimizada por entorno
function getSMTPConfig() {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.SMTP_USER || 'seleccionth@cbb.com.co',
      pass: process.env.SMTP_PASS || 'wnqh rnqy rnqy rnqy'
    },
    // Configuraciones adicionales para mejorar la confiabilidad
    connectionTimeout: 60000, // 60 segundos
    greetingTimeout: 30000, // 30 segundos
    socketTimeout: 60000, // 60 segundos
    // Configuraciones específicas para Gmail
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    },
    // Configuraciones de pool para mejor rendimiento
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 14 // máximo 14 mensajes por segundo
  };

  debugLog('Configuración SMTP:', {
    host: config.host,
    port: config.port,
    user: config.auth.user,
    hasPassword: !!config.auth.pass
  });

  return config;
}

// Función para validar email
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Función para enviar email con reintentos
async function sendEmailWithRetry(transporter: any, mailOptions: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      debugLog(`Intento ${attempt} de envío de email a: ${mailOptions.to}`);
      const result = await transporter.sendMail(mailOptions);
      debugLog(`Email enviado exitosamente en intento ${attempt}`, {
        messageId: result.messageId,
        response: result.response
      });
      return { success: true, result };
    } catch (error: any) {
      debugLog(`Error en intento ${attempt}:`, {
        error: error.message,
        code: error.code,
        command: error.command
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Esperar antes del siguiente intento (backoff exponencial)
      const delay = Math.pow(2, attempt) * 1000;
      debugLog(`Esperando ${delay}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    debugLog('=== INICIO DE PROCESAMIENTO DE APLICACIÓN ===');
    
    // Configurar Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Procesar FormData
    debugLog('Procesando FormData...');
    const formData = await request.formData();
    
    // Extraer datos del formulario
    const nombre = formData.get('nombres') as string;
    const apellido = formData.get('apellidos') as string;
    const email = formData.get('email') as string;
    const telefono = formData.get('telefono') as string;
    const documento = formData.get('documento_identidad') as string;
    const tipoDocumento = formData.get('tipo_documento') as string || 'CC';
    const fechaNacimiento = formData.get('fecha_nacimiento') as string;
    const direccion = formData.get('direccion') as string;
    const nivelEducacion = formData.get('nivel_educacion') as string;
    const ciudad = formData.get('ciudad') as string;
    const experienciaLaboral = formData.get('experiencia_laboral') as string;
    const hojaVida = formData.get('hoja_vida') as File;

    debugLog('Datos extraídos:', {
      nombre,
      apellido,
      email,
      telefono,
      documento,
      hasFile: !!hojaVida
    });

    // Validaciones
    if (!nombre || !apellido || !email || !telefono || !documento || !fechaNacimiento || !direccion) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios deben ser completados' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'El formato del email no es válido' },
        { status: 400 }
      );
    }

    // Insertar en la base de datos
    debugLog('Insertando en base de datos...');
    const { data: result, error: dbError } = await supabase
      .from('aplicaciones_trabajo')
      .insert({
        nombres: nombre,
        apellidos: apellido,
        email: email,
        telefono: telefono,
        documento_identidad: documento,
        tipo_documento: tipoDocumento,
        fecha_nacimiento: fechaNacimiento,
        direccion: direccion,
        nivel_educacion: nivelEducacion,
        ciudad: ciudad,
        experiencia_laboral: experienciaLaboral,
        fecha_aplicacion: new Date().toISOString(),
        estado: 'pendiente'
      })
      .select();

    if (dbError) {
      debugLog('Error en base de datos:', dbError);
      return NextResponse.json(
        { error: 'Error al guardar la aplicación' },
        { status: 500 }
      );
    }

    debugLog('Aplicación guardada exitosamente:', result);

    // Configurar transporter de email
    debugLog('Configurando transporter de email...');
    const smtpConfig = getSMTPConfig();
    const transporter = nodemailer.createTransport(smtpConfig);

    // Verificar conexión SMTP
    try {
      debugLog('Verificando conexión SMTP...');
      await transporter.verify();
      debugLog('Conexión SMTP verificada exitosamente');
    } catch (smtpError: any) {
      debugLog('Error de conexión SMTP:', smtpError);
      // Continuar sin enviar emails pero guardar la aplicación
      return NextResponse.json({
        success: true,
        message: 'Aplicación guardada exitosamente (email no enviado)',
        warning: 'No se pudo enviar el email de confirmación'
      });
    }

    // Preparar archivos adjuntos
    let attachments: any[] = [];
    if (hojaVida && hojaVida.size > 0) {
      const buffer = Buffer.from(await hojaVida.arrayBuffer());
      attachments.push({
        filename: hojaVida.name,
        content: buffer,
        contentType: hojaVida.type
      });
      debugLog('Archivo adjunto preparado:', {
        filename: hojaVida.name,
        size: hojaVida.size,
        type: hojaVida.type
      });
    }

    // Contenido HTML para RH
    const htmlContentRH = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nueva Aplicación de Empleo - Gestión Humana 360</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #F9F7ED 0%, #E5D6A3 50%, #C8A047 100%);
            padding: 20px;
            text-align: center;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #C8A047 0%, #B8941F 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
            text-align: left;
          }
          .applicant-info {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            border-left: 4px solid #C8A047;
          }
          .applicant-info h3 {
            color: #C8A047;
            margin-bottom: 15px;
            font-size: 20px;
          }
          .info-row {
            display: flex;
            margin-bottom: 10px;
            color: #555;
            flex-wrap: wrap;
          }
          .info-label {
            font-weight: 600;
            min-width: 140px;
          }
          .position-highlight {
            background: #C8A047;
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-size: 20px;
            font-weight: 600;
            text-align: center;
            margin: 25px 0;
            color: #C8A047;
            text-shadow: none;
          }
          .experience-section {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin-top: 25px;
            border-left: 4px solid #28a745;
          }
          .experience-section h4 {
            color: #28a745;
            margin-bottom: 15px;
            line-height: 1.6;
            color: #555;
          }
          .footer {
            background: #f8f9fa;
            padding: 25px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .timestamp {
            font-style: italic;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📋 Nueva Aplicación de Empleo</h1>
            <p>Sistema de Gestión Humana 360</p>
          </div>
          
          <div class="content">
            <div class="applicant-info">
              <h3>👤 Información del Aplicante</h3>
              <div class="info-row">
                <span class="info-label">Nombre Completo:</span>
                <span>${nombre} ${apellido}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email:</span>
                <span>${email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Teléfono:</span>
                <span>${telefono}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Documento:</span>
                <span>${tipoDocumento} ${documento}</span>
              </div>
              ${nivelEducacion ? `
              <div class="info-row">
                <span class="info-label">Nivel Educativo:</span>
                <span>${nivelEducacion}</span>
              </div>
              ` : ''}
              ${ciudad ? `
              <div class="info-row">
                <span class="info-label">Ciudad:</span>
                <span>${ciudad}</span>
              </div>
              ` : ''}
            </div>

            ${experienciaLaboral ? `
            <div class="experience-section">
              <h4>💼 Experiencia Laboral</h4>
              <p>${experienciaLaboral.replace(/\n/g, '<br>')}</p>
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p><strong>Sistema de Gestión Humana 360</strong></p>
            <p class="timestamp">Aplicación recibida el ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Contenido HTML para el aplicante
    const htmlContentApplicant = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Aplicación - Gestión Humana 360</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #F9F7ED 0%, #E5D6A3 50%, #C8A047 100%);
            padding: 20px;
            text-align: center;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #C8A047 0%, #B8941F 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .success-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          .message {
            font-size: 18px;
            color: #555;
            margin-bottom: 25px;
            line-height: 1.6;
          }
          .applicant-name {
            font-size: 24px;
            font-weight: 600;
            color: #C8A047;
            margin-bottom: 15px;
          }
          .position {
            font-size: 20px;
            color: #666;
            margin-bottom: 30px;
            font-style: italic;
          }
          .next-steps {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: left;
            border-left: 4px solid #C8A047;
          }
          .next-steps h3 {
            color: #C8A047;
            margin-bottom: 15px;
            font-size: 18px;
          }
          .next-steps ul {
            list-style: none;
            padding: 0;
          }
          .next-steps li {
            margin-bottom: 10px;
            padding-left: 25px;
            position: relative;
          }
          .next-steps li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #C8A047;
            font-weight: bold;
          }
          .footer {
            background: #f8f9fa;
            padding: 25px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .contact-info {
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>✅ Aplicación Recibida</h1>
            <p>Gestión Humana 360</p>
          </div>
          
          <div class="content">
            <div class="success-icon">🎉</div>
            
            <div class="applicant-name">¡Hola ${nombre}!</div>
            
            <div class="message">
              Hemos recibido exitosamente tu aplicación para la posición de:
            </div>
            
            <div class="message">
              Gracias por tu interés en formar parte de nuestro equipo. Tu aplicación está siendo revisada por nuestro equipo de Recursos Humanos.
            </div>

            <div class="next-steps">
              <h3>📋 Próximos Pasos:</h3>
              <ul>
                <li>Revisaremos tu aplicación y hoja de vida</li>
                <li>Si tu perfil coincide con nuestros requisitos, te contactaremos</li>
                <li>El proceso de selección puede tomar entre 5 a 10 días hábiles</li>
                <li>Te mantendremos informado sobre el estado de tu aplicación</li>
              </ul>
            </div>

            <div class="message">
              <strong>Número de referencia:</strong> APP-${Date.now()}
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Sistema de Gestión Humana 360</strong></p>
            <div class="contact-info">
              <p>📧 seleccionth@cbb.com.co</p>
              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Configurar opciones de correo para RH
    const mailOptionsRH = {
      from: smtpConfig.auth.user,
      to: 'holalexdesarrolla@gmail.com', // Email real de RH
      subject: `Nueva Aplicación de Empleo - ${nombre} ${apellido}`,
      html: htmlContentRH,
      attachments: attachments
    };

    // Configurar opciones de correo para el aplicante
    const mailOptionsApplicant = {
      from: smtpConfig.auth.user,
      to: email,
      subject: 'Confirmación de Aplicación de Empleo - Gestión Humana 360',
      html: htmlContentApplicant,
    };

    // Enviar correos con reintentos
    try {
      debugLog('Enviando correo a RH...');
      await sendEmailWithRetry(transporter, mailOptionsRH);
      debugLog('Correo a RH enviado exitosamente');

      debugLog('Enviando correo de confirmación al aplicante...');
      await sendEmailWithRetry(transporter, mailOptionsApplicant);
      debugLog('Correo de confirmación enviado exitosamente');

    } catch (emailError) {
      console.error('Error enviando correos:', emailError);
      // No retornamos error aquí para que la aplicación se guarde aunque falle el correo
    } finally {
      // Cerrar la conexión del transporter
      transporter.close();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Aplicación enviada exitosamente',
      id: result[0].id
    });

  } catch (error) {
    console.error('Error en POST /api/aplicaciones-trabajo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}