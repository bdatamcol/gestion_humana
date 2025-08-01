import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

interface ComunicadoAvatarProps {
  titulo: string;
  imagenUrl?: string | null;
  className?: string;
}

const ComunicadoAvatar: React.FC<ComunicadoAvatarProps> = ({ 
  titulo, 
  imagenUrl, 
  className = '' 
}) => {
  // Función para generar color basado en el título
  const generateColor = (text: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
      'bg-emerald-500',
      'bg-violet-500',
      'bg-rose-500',
      'bg-amber-500',
      'bg-lime-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Función para obtener las iniciales
  const getInitials = (text: string): string => {
    const words = text.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
  };

  const backgroundColor = generateColor(titulo);
  const initials = getInitials(titulo);

  return (
    <Avatar className={`w-full h-full rounded-[10px] ${className}`}>
      {imagenUrl && (
        <AvatarImage 
          src={imagenUrl} 
          alt={titulo}
          className="w-full h-full object-cover rounded-[10px]"
        />
      )}
      <AvatarFallback 
        className={`
          ${backgroundColor} 
          text-white 
          font-bold 
          text-2xl
          w-full 
          h-full 
          flex 
          items-center 
          justify-center
          rounded-[10px]
          aspect-[4/3]
        `}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default ComunicadoAvatar;
