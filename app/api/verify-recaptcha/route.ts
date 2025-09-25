import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token de reCAPTCHA requerido' },
        { status: 400 }
      )
    }

    // Verificar el token con Google reCAPTCHA
    const secretKey = '6LcY9tQrAAAAAPasG7plKg84rdA2ubYGA48Zl5nJ'
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`

    const verificationResponse = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    })

    const verificationResult = await verificationResponse.json()

    if (verificationResult.success && verificationResult.score >= 0.5) {
      return NextResponse.json({
        success: true,
        score: verificationResult.score,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Verificación reCAPTCHA fallida',
          score: verificationResult.score,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error verificando reCAPTCHA:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}