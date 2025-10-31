'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';

interface Publicacion {
  id: number;
  titulo: string;
  contenido: string;
  imagen_principal?: string;
  galeria_imagenes?: string[];
  fecha_publicacion: string;
  estado: string;
  seccion: string;
  autor_id: number;
  autor?: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

const sectionConfig = {
  bienestar: {
    title: 'Blog de Bienestar',
    color: 'emerald',
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    hoverColor: 'hover:text-emerald-700',
    icon: '💚'
  },
  actividades: {
    title: 'Cronograma de Actividades',
    color: 'amber',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-600',
    hoverColor: 'hover:text-amber-700',
    icon: '🎯'
  },
  sst: {
    title: 'Seguridad y Salud en el Trabajo',
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    hoverColor: 'hover:text-red-700',
    icon: '🛡️'
  },
  normatividad: {
    title: 'Blog de Normatividad',
    color: 'purple',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    hoverColor: 'hover:text-purple-700',
    icon: '📋'
  }
};

export default function PublicacionesSeccion() {
  const params = useParams();
  const seccion = params.seccion as string;
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPublicaciones, setTotalPublicaciones] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const publicacionesPorPagina = 12;

  const config = sectionConfig[seccion as keyof typeof sectionConfig];

  useEffect(() => {
    if (seccion && config) {
      fetchPublicaciones();
    }
  }, [seccion, currentPage]);

  const fetchPublicaciones = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/publicaciones?seccion=${seccion}&page=${currentPage}&limit=${publicacionesPorPagina}`);
      if (response.ok) {
        const data = await response.json();
        setPublicaciones(data.publicaciones || []);
        setTotalPages(Math.ceil((data.total || 0) / publicacionesPorPagina));
      }
    } catch (error) {
      console.error('Error fetching publicaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `Hace ${diffInWeeks} semana${diffInWeeks > 1 ? 's' : ''}`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `Hace ${diffInMonths} mes${diffInMonths > 1 ? 'es' : ''}`;
  };

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
                href="/publicaciones/bienestar"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Bienestar
              </a>
              <a
                href="/publicaciones/actividades"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                Actividades
              </a>
              <a
                href="/publicaciones/sst"
                className="text-gray-800 hover:text-[#F2C36B] font-medium transition-colors duration-200"
              >
                SST
              </a>
              <a
                href="/publicaciones/normatividad"
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
                    { href: "/publicaciones/bienestar", label: "Bienestar" },
                    { href: "/publicaciones/actividades", label: "Actividades" },
                    { href: "/publicaciones/sst", label: "SST" },
                    { href: "/publicaciones/normatividad", label: "Normatividad" },
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

      {/* Sección no encontrada */}
      {!config && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sección no encontrada</h1>
            <p className="text-gray-600 mb-6">La sección solicitada no existe.</p>
            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Volver al inicio
            </a>
          </div>
        </div>
      )}

      {/* Contenido de la sección */}
      {config && (
        <>
          {/* Header Section */}
          <div className="relative py-20 bg-cover bg-center" style={{ backgroundImage: "url('/banner-titulos.webp')" }}>
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-white">{config.title}</h1>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Breadcrumb */}
            <nav className="flex mb-8" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <a href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                    Inicio
                  </a>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">{config.title}</span>
                  </div>
                </li>
              </ol>
            </nav>

            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Publications Grid */}
                {publicaciones.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                    {publicaciones.map((publicacion) => (
                      <article key={publicacion.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                        <div className="h-48 overflow-hidden">
                          {publicacion.imagen_principal ? (
                            <img 
                              src={publicacion.imagen_principal} 
                              alt={publicacion.titulo}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className={`w-full h-full bg-${config.color}-100 flex items-center justify-center`}>
                              <span className={`${config.textColor} text-6xl`}>{config.icon}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <h3 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-2">
                            {publicacion.titulo}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {publicacion.contenido.replace(/<[^>]*>/g, '').substring(0, 150)}...
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(publicacion.fecha_publicacion)}
                            </span>
                            <a 
                              href={`/publicacion/${publicacion.id}`}
                              className={`text-sm ${config.textColor} ${config.hoverColor} font-medium hover:underline`}
                            >
                              Leer más →
                            </a>
                          </div>
                          {publicacion.autor && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500">
                                Por {publicacion.autor.nombre} {publicacion.autor.apellido}
                              </p>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">{config.icon}</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No hay publicaciones disponibles
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Aún no se han publicado contenidos en esta sección.
                    </p>
                    <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                      ← Volver al inicio
                    </a>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? `${config.bgColor} text-white`
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

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
                  { href: "/publicaciones/bienestar", label: "Programas de bienestar" },
                  { href: "/publicaciones/actividades", label: "Cronograma de Actividades" },
                  { href: "/publicaciones/sst", label: "Seguridad y Salud en el Trabajo" },
                  { href: "/publicaciones/normatividad", label: "Blog de Normatividad" },
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
  );
}
