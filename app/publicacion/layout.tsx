"use client"

import type React from "react"
import { useState } from "react"
import { Menu, X } from "lucide-react"

export default function PublicacionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-gray-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/">
                <img src="/logo-h-n.webp" alt="Portal de Gestión Humana" className="h-10 sm:h-12" />
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="/#novedades"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Novedades
              </a>
              <a
                href="/#bienestar"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Bienestar
              </a>
              <a
                href="/#actividades"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Actividades
              </a>
              <a
                href="/#sst"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                SST
              </a>
              <a
                href="/#normatividad"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Normatividad
              </a>
            </nav>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-colors duration-200"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Abrir menú</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999] md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed inset-y-0 left-0 flex w-full max-w-sm">
            <div className="relative flex w-full flex-col backdrop-blur-md bg-white/90 border-r border-gray-200/30 shadow-xl transform transition-transform duration-300 ease-out">
              {/* Header with logo and close button */}
              <div className="flex h-16 flex-shrink-0 items-center justify-between px-4 border-b border-gray-200/30">
                <img src="/logo-h-n.webp" alt="Portal de Gestión Humana" className="h-8 w-auto" />
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Cerrar menú</span>
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-y-auto">
                <nav className="px-4 py-4 space-y-1">
                  {[
                    { href: "/", label: "Inicio" },
                    { href: "/#novedades", label: "Novedades" },
                    { href: "/#bienestar", label: "Bienestar" },
                    { href: "/#actividades", label: "Actividades" },
                    { href: "/#sst", label: "SST" },
                    { href: "/#normatividad", label: "Normatividad" },
                    { href: "/#contacto", label: "Contacto" },
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block px-3 py-3 text-base font-medium text-gray-800 hover:text-emerald-600 hover:bg-gray-100/50 rounded-md transition-all duration-200 transform hover:scale-105"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer id="contacto" className="bg-[#0D0D0D] text-gray-300 pt-12 lg:pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Logo and Description */}
            <div className="lg:col-span-1">
              <div className="flex justify-center md:justify-start mb-4">
                <img src="/logo-h-b.webp" alt="Logo GH" className="w-32 sm:w-40" />
              </div>
              <p className="text-gray-400 leading-relaxed text-center md:text-left">
                Tu centro de información y recursos para el desarrollo profesional y personal. Conectando a nuestro
                equipo con las mejores oportunidades de crecimiento.
              </p>
            </div>

            {/* Enlaces Rápidos */}
            <div className="text-center md:text-left">
              <h4 className="text-white font-semibold text-lg mb-4">Enlaces Rápidos</h4>
              <ul className="space-y-2">
                {[
                  { href: "/#bienestar", label: "Programas de bienestar" },
                  { href: "/#actividades", label: "Cronograma de Actividades" },
                  { href: "/#sst", label: "Seguridad y Salud en el Trabajo" },
                  { href: "/#normatividad", label: "Blog de Normatividad" },
                  { href: "/#cumpleaños", label: "Cumpleañeros de la Semana" },
                ].map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="text-gray-400 hover:text-[#F2C36B] transition-colors duration-200">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recursos */}
            <div className="text-center md:text-left">
              <h4 className="text-white font-semibold text-lg mb-4">Recursos</h4>
              <ul className="space-y-2">
                {["Certificacion laboral", "Vacaciones", "Permisos", "Incapacidades", "Comunicados"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-[#F2C36B] transition-colors duration-200">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contacto */}
            <div className="text-center md:text-left">
              <h4 className="text-white font-semibold text-lg mb-4">Contacto</h4>
              <ul className="space-y-2">
                {[
                  { icon: "📧", text: "digital@bdatam.com" },
                  { icon: "📞", text: "+57 310 6456 861" },
                  { icon: "📍", text: "Cúcuta, Colombia" },
                  { icon: "🕒", text: "Lun - Vie: 8:00 AM - 6:00 PM" },
                ].map((contact, index) => (
                  <li key={index} className="flex items-center justify-center md:justify-start gap-2 text-gray-400">
                    <span>{contact.icon}</span>
                    <span>{contact.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-gray-700 pt-8 text-center space-y-2">
            <p className="text-gray-500 text-sm">© 2025 Gestión Humana 360. Todos los derechos reservados.</p>
            <p className="text-gray-500 text-sm">
              Hecho con ♥️ por{" "}
              <a href="https://bdatam.com/" className="text-blue-400 hover:text-blue-300 transition-colors">
                Bdatam
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
