import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Debug detallado para troubleshooting
function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMAIL-DEBUG] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [EMAIL-DATA]`, JSON.stringify(data, null, 2));
  }
}

// Función para obtener configuración SMTP optimizada por entorno
function getSMTPConfig() {
  const isVercel = process.env.VERCEL === '1';
  const isLocal = process.env.NODE_ENV === 'development';
  
  // Debug de variables de entorno
  debugLog('Variables de entorno SMTP:', {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS ? '***CONFIGURADA***' : 'NO CONFIGURADA',
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
    isVercel,
    isLocal
  });
  
  // Credenciales de Gmail
  const defaultCredentials = {
    host: 'smtp.gmail.com',
    user: 'digital@bdatam.com',
    pass: 'ewjqvsntmbadbzah' // App Password de Gmail
  };
  
  const config: any = {
    host: process.env.SMTP_HOST || defaultCredentials.host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // false para STARTTLS en puerto 587
    auth: {
      user: process.env.SMTP_USER || defaultCredentials.user,
      pass: process.env.SMTP_PASS || defaultCredentials.pass
    },
    // Configuración optimizada por entorno
    connectionTimeout: isVercel ? 60000 : 60000, // Aumentado para Vercel
    greetingTimeout: isVercel ? 30000 : 30000,   // Aumentado para Vercel
    socketTimeout: isVercel ? 60000 : 60000,     // Aumentado para Vercel
    pool: false, // Desactivar pool para mejor compatibilidad
    maxConnections: 1, // Una conexión a la vez
    maxMessages: 1,    // Un mensaje por conexión
    // Configuraciones TLS mejoradas para Vercel
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
      ciphers: 'HIGH:!aNULL:!MD5:!RC4'
    },
    // Configuraciones adicionales para Vercel
    requireTLS: true,
    logger: true,
    debug: isLocal // Solo debug en local para reducir logs en Vercel
  };
  
  debugLog('Configuración SMTP generada:', {
    ...config,
    auth: {
      user: config.auth.user,
      pass: '***OCULTA***'
    }
  });
  
  return config;
}

// Función para validar emails
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para envío con reintentos
async function sendEmailWithRetry(transporter: any, mailOptions: any, maxRetries = 3) {
  debugLog(`Iniciando envío de email a: ${mailOptions.to}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      debugLog(`Intento ${attempt}/${maxRetries} para ${mailOptions.to}`);
      
      const info = await transporter.sendMail(mailOptions);
      
      debugLog(`Email enviado exitosamente a ${mailOptions.to} en intento ${attempt}`, {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });
      
      return { success: true, attempt, info };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const errorCode = (error as any)?.code;
      const errorCommand = (error as any)?.command;
      
      debugLog(`Intento ${attempt}/${maxRetries} fallido para ${mailOptions.to}`, {
        error: errorMessage,
        code: errorCode,
        command: errorCommand,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      if (attempt === maxRetries) {
        debugLog(`Todos los intentos fallaron para ${mailOptions.to}`);
        throw error;
      }
      
      // Espera exponencial entre reintentos (1s, 2s, 4s)
      const delay = Math.pow(2, attempt - 1) * 1000;
      debugLog(`Esperando ${delay}ms antes del siguiente intento para ${mailOptions.to}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { comunicadoId, titulo, contenido } = await request.json();

    if (!comunicadoId || !titulo || !contenido) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Crear cliente de Supabase para el servidor
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aqmlxjsyczqtfansvnqr.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxbWx4anN5Y3pxdGZhbnN2bnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MzM3NTYsImV4cCI6MjA1ODUwOTc1Nn0._dfB0vDYrR4jQ1cFHPXr_6iGTUXctzTeZbIcE4FJ0lk';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Obtener los cargos asociados al comunicado
    const { data: comunicadoCargos, error: cargosError } = await supabase
      .from('comunicados_cargos')
      .select('cargo_id')
      .eq('comunicado_id', comunicadoId);

    if (cargosError) {
      console.error('Error al obtener cargos del comunicado:', cargosError);
      return NextResponse.json(
        { error: 'Error al obtener cargos del comunicado' },
        { status: 500 }
      );
    }

    if (!comunicadoCargos || comunicadoCargos.length === 0) {
      return NextResponse.json(
        { message: 'No hay cargos asociados al comunicado' },
        { status: 200 }
      );
    }

    // Obtener los IDs de los cargos
    const cargoIds = comunicadoCargos.map(cc => cc.cargo_id);

    // Obtener usuarios con esos cargos y sus correos electrónicos (solo usuarios activos)
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuario_nomina')
      .select('correo_electronico, colaborador, estado')
      .in('cargo_id', cargoIds)
      .eq('estado', 'activo')
      .not('correo_electronico', 'is', null);

    if (usuariosError) {
      console.error('Error al obtener usuarios:', usuariosError);
      return NextResponse.json(
        { error: 'Error al obtener usuarios' },
        { status: 500 }
      );
    }

    if (!usuarios || usuarios.length === 0) {
      return NextResponse.json(
        { message: 'No se encontraron usuarios activos con correos electrónicos para los cargos especificados' },
        { status: 200 }
      );
    }

    // Filtrar usuarios con emails válidos
    const usuariosValidos = usuarios.filter(usuario => 
      usuario.correo_electronico && isValidEmail(usuario.correo_electronico)
    );

    if (usuariosValidos.length === 0) {
      return NextResponse.json(
        { message: 'No se encontraron usuarios con correos electrónicos válidos' },
        { status: 200 }
      );
    }

    console.log(`Procesando ${usuariosValidos.length} usuarios activos con emails válidos de ${usuarios.length} usuarios activos totales`);

    debugLog('Iniciando proceso de envío de emails');
    
    // Validar variables de entorno SMTP
    const missingVars = [];
    if (!process.env.SMTP_HOST) missingVars.push('SMTP_HOST');
    if (!process.env.SMTP_USER) missingVars.push('SMTP_USER');
    if (!process.env.SMTP_PASS) missingVars.push('SMTP_PASS');
    
    if (missingVars.length > 0) {
      debugLog('Variables de entorno SMTP faltantes:', { missingVars });
      return NextResponse.json(
        { error: `Variables de entorno faltantes: ${missingVars.join(', ')}` },
        { status: 500 }
      );
    }

    // Configurar nodemailer con configuración optimizada por entorno
    debugLog('Obteniendo configuración SMTP...');
    const smtpConfig = getSMTPConfig();
    
    debugLog('Creando transporter de Nodemailer...');
    const transporter = nodemailer.createTransport(smtpConfig);
    
    debugLog(`Transporter creado para ${process.env.VERCEL ? 'Vercel' : 'Local'}`, {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      poolEnabled: smtpConfig.pool
    });

    // Verificar conexión SMTP
    debugLog('Verificando conexión SMTP...');
    try {
      const verifyStart = Date.now();
      await transporter.verify();
      const verifyTime = Date.now() - verifyStart;
      
      debugLog('Conexión SMTP verificada exitosamente', {
        verificationTime: `${verifyTime}ms`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const errorCode = (error as any)?.code;
      
      debugLog('Error de conexión SMTP', {
        error: errorMessage,
        code: errorCode,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return NextResponse.json(
        { 
          error: 'Error de conexión con el servidor de correo',
          details: errorMessage,
          code: errorCode
        },
        { status: 500 }
      );
    }

    // Preparar el contenido del correo
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Comunicado - Gestión Humana 360</title>
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
            background: linear-gradient(135deg, #BF913B 0%, #805328 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
          }
          .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          .content {
            padding: 40px 30px;
            text-align: center;
          }
          .content-title {
            color: #4a4a4a;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 25px;
            text-align: center;
          }
          .content-body {
            color: #5C3A27;
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
            text-align: center;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #C8A047 0%, #BF913B 100%);
            color: #ffffff !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 8px 20px rgba(200, 160, 71, 0.3);
            text-align: center;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 25px rgba(200, 160, 71, 0.4);
          }
          .footer {
            background: #F1EBD0;
            padding: 25px 20px;
            text-align: center;
            border-top: 1px solid #E5D6A3;
          }
          .footer p {
            font-size: 14px;
            color: #805328;
            margin-bottom: 5px;
          }
          .divider {
            height: 3px;
            background: linear-gradient(135deg, #C8A047 0%, #BF913B 100%);
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Gestión Humana 360</h1>
            <p>Nuevo Comunicado Disponible</p>
          </div>
          
          <div class="divider"></div>
          
          <div class="content">
            <h2 class="content-title">${titulo}</h2>
            <div class="content-body">
              ${contenido.replace(/\n/g, '<br>')}
            </div>
            
            <a href="https://gestionhumana360.co/perfil/comunicados" class="btn">
              📋 Ver Comunicado Completo
            </a>
          </div>
          
          <div class="footer">
            <p><strong>Gestión Humana 360</strong></p>
            <p>Este es un mensaje automático del sistema.</p>
            <p>Por favor, no responda a este correo electrónico.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar correos con reintentos y límite de tiempo
    debugLog('Iniciando envío masivo de correos', {
      totalEmails: usuariosValidos.length,
      usuarios: usuariosValidos.map(u => u.correo_electronico)
    });
    
    const results: Array<{ email: string; status: string; error?: string; attempt?: number; info?: any }> = [];
    const startTime = Date.now();
    
    const emailPromises = usuariosValidos.map(async (usuario, index) => {
      try {
        debugLog(`Preparando email ${index + 1}/${usuariosValidos.length} para ${usuario.correo_electronico}`);
        
        const mailOptions = {
          from: {
            name: 'Sistema de Gestión Humana',
            address: process.env.SMTP_USER!
          },
          to: usuario.correo_electronico,
          subject: `Nuevo Comunicado: ${titulo}`,
          html: htmlContent,
          text: `Nuevo Comunicado: ${titulo}\n\n${contenido}\n\nPuede ver el comunicado completo en: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://gestionhumana360.co'}/perfil/comunicados`
        };
        
        debugLog(`Opciones de email preparadas para ${usuario.correo_electronico}`, {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          hasHtml: !!mailOptions.html,
          hasText: !!mailOptions.text
        });
        
        // Timeout por email individual (45 segundos para dar tiempo a reintentos)
        const emailPromise = sendEmailWithRetry(transporter, mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de 45 segundos')), 45000)
        );
        
        const result = await Promise.race([emailPromise, timeoutPromise]) as { success: boolean; attempt: number; info: any };
        
        debugLog(`Email completado exitosamente para ${usuario.correo_electronico}`, {
          attempt: result.attempt,
          messageId: result.info?.messageId
        });
        
        return { 
          email: usuario.correo_electronico, 
          status: 'success',
          attempt: result.attempt,
          info: result.info
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        const errorCode = (error as any)?.code;
        
        debugLog(`Error final enviando correo a ${usuario.correo_electronico}`, {
          error: errorMessage,
          code: errorCode,
          stack: error instanceof Error ? error.stack : undefined
        });
        
        return { 
          email: usuario.correo_electronico, 
          status: 'failed', 
          error: errorMessage,
          code: errorCode
        };
      }
    });
    
    // Ejecutar todos los envíos en paralelo con límite de tiempo global
    debugLog('Ejecutando envíos en paralelo...');
    
    try {
      const globalTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout global de 5 minutos')), 300000)
      );
      
      const emailResults = await Promise.race([
        Promise.allSettled(emailPromises),
        globalTimeout
      ]) as PromiseSettledResult<{ email: string; status: string; error?: string; attempt?: number; info?: any }>[];
      
      debugLog('Procesando resultados de envío...', {
        totalResults: emailResults.length
      });
      
      // Procesar resultados
      emailResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          debugLog(`Resultado ${index + 1}: Exitoso`, {
            email: result.value.email,
            status: result.value.status,
            attempt: result.value.attempt
          });
          results.push(result.value);
        } else {
          debugLog(`Resultado ${index + 1}: Fallido`, {
            reason: result.reason?.message || 'Error desconocido'
          });
          results.push({ 
            email: 'unknown', 
            status: 'failed', 
            error: result.reason?.message || 'Error desconocido' 
          });
        }
      });
    } catch (error) {
      debugLog('Timeout global alcanzado', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        resultsUntilTimeout: results.length
      });
      
      return NextResponse.json(
        { 
          error: 'Timeout en el envío de correos', 
          details: error instanceof Error ? error.message : 'Error desconocido',
          results 
        },
        { status: 408 }
      );
    }
    
    // Cerrar el transporter
    debugLog('Cerrando transporter SMTP...');
    transporter.close();
    debugLog('Transporter cerrado exitosamente');

    // Calcular métricas
    debugLog('Calculando métricas finales...');
    const endTime = Date.now();
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const avgResponseTime = results.length > 0 ? (endTime - startTime) / results.length : 0;
    const totalRetries = results.reduce((sum, r) => sum + (r.attempt || 1) - 1, 0);
    const totalTime = endTime - startTime;
    
    const metrics = {
      totalEmailsProcessed: results.length,
      totalUsersFound: usuarios.length,
      validEmails: usuariosValidos.length,
      successful,
      failed,
      successRate: results.length > 0 ? ((successful / results.length) * 100).toFixed(2) + '%' : '0%',
      avgResponseTime: Math.round(avgResponseTime),
      totalTime: Math.round(totalTime),
      totalRetries,
      environment: process.env.VERCEL ? 'vercel' : 'local',
      smtpConfig: {
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure
      }
    };

    debugLog('Métricas finales calculadas', metrics);
    
    // Debug detallado de resultados
    debugLog('Resumen detallado de resultados:', {
      successful: results.filter(r => r.status === 'success').map(r => ({
        email: r.email,
        attempt: r.attempt
      })),
      failed: results.filter(r => r.status === 'failed').map(r => ({
        email: r.email,
        error: r.error
      }))
    });

    const response = {
      message: `Notificaciones enviadas: ${successful} exitosas, ${failed} fallidas`,
      ...metrics,
      results
    };
    
    debugLog('Enviando respuesta final', {
      statusCode: 200,
      responseSize: JSON.stringify(response).length
    });

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    debugLog('Error crítico en el proceso de envío de notificaciones', {
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
