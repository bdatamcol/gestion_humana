"use client"

import React, { useState } from "react"
import { Menu, X } from "lucide-react"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-gray-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <a href="/" aria-label="Portal de Gestión Humana">
                <img src="/logo-h-n.webp" alt="Portal de Gestión Humana" className="h-10 sm:h-12" />
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="#novedades"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Novedades
              </a>
              <a
                href="#bienestar"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Bienestar
              </a>
              <a
                href="#actividades"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Actividades
              </a>
              <a
                href="#sst"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                SST
              </a>
              <a
                href="#normatividad"
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
                    { href: "#inicio", label: "Ingresar" },
                    { href: "#novedades", label: "Novedades" },
                    { href: "#bienestar", label: "Bienestar" },
                    { href: "#actividades", label: "Actividades" },
                    { href: "#sst", label: "SST" },
                    { href: "#normatividad", label: "Normatividad" },
                    { href: "#contacto", label: "Contacto" },
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
    </>
  )
}