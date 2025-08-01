"use client"

import { useState, useEffect } from "react"

/**
 * Hook personalizado para detectar si el dispositivo es móvil basado en el ancho de la pantalla
 * @returns {boolean} - true si el dispositivo es móvil, false si no lo es
 */
export function useIsMobile(): boolean {
  // Inicializamos con false y actualizaremos en el efecto
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Función para verificar si la pantalla es de tamaño móvil
    const checkIsMobile = () => {
      // Consideramos móvil si el ancho es menor a 768px (estándar para dispositivos móviles)
      setIsMobile(window.innerWidth < 768)
    }

    // Verificamos inmediatamente al montar el componente
    checkIsMobile()

    // Agregamos un listener para actualizar cuando cambie el tamaño de la ventana
    window.addEventListener("resize", checkIsMobile)

    // Limpiamos el listener cuando se desmonte el componente
    return () => window.removeEventListener("resize", checkIsMobile)
  }, []) // El array vacío asegura que el efecto solo se ejecute una vez al montar

  return isMobile
}
