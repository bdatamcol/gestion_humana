"use client"

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import { ReactNode } from 'react'

interface RecaptchaProviderProps {
  children: ReactNode
}

export default function RecaptchaProvider({ children }: RecaptchaProviderProps) {
  // Solo cargar reCAPTCHA en producción
  const isProduction = process.env.NODE_ENV === 'production'
  const siteKey = '6LcY9tQrAAAAACIrTbb6xCeWuVxU1sZYKe1Uu2n_'

  if (!isProduction) {
    // En desarrollo, solo renderizar los children sin reCAPTCHA
    return <>{children}</>
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  )
}