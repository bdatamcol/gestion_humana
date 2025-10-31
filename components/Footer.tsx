"use client"

import React from "react"

export default function Footer() {
  return (
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
                { href: "#bienestar", label: "Programas de bienestar" },
                { href: "#actividades", label: "Cronograma de Actividades" },
                { href: "#sst", label: "Seguridad y Salud en el Trabajo" },
                { href: "#normatividad", label: "Blog de Normatividad" },
                { href: "#cumpleaños", label: "Cumpleañeros de la Semana" },
                { href: "/trabaja-con-nosotros", label: "Trabaja con nosotros" },
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
  )
}