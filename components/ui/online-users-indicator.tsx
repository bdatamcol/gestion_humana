"use client"

import React, { useState } from 'react'
import { Users, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useOnlineUsers } from '@/hooks/use-online-users'
import { cn } from '@/lib/utils'

interface OnlineUsersIndicatorProps {
  className?: string
}

export function OnlineUsersIndicator({ className }: OnlineUsersIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { onlineCount, onlineUsers, loading, error } = useOnlineUsers()

  const formatLastSeen = (lastSeenAt: string) => {
    const now = new Date()
    const lastSeen = new Date(lastSeenAt)
    const diffInSeconds = Math.floor((now.getTime() - lastSeen.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'Ahora'
    } else if (diffInSeconds < 120) {
      return 'Hace 1 minuto'
    } else {
      return `Hace ${Math.floor(diffInSeconds / 60)} minutos`
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  if (loading) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 h-10 w-10 rounded-full hover:bg-gray-100"
          disabled
        >
          <Users className="h-5 w-5 text-gray-400" />
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 h-10 w-10 rounded-full hover:bg-gray-100"
          title="Error al cargar usuarios en línea"
        >
          <Users className="h-5 w-5 text-red-400" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2 h-10 w-10 rounded-full hover:bg-gray-100"
        onClick={() => setIsOpen(!isOpen)}
        title={`${onlineCount} usuario${onlineCount !== 1 ? 's' : ''} en línea`}
      >
        <Users className="h-5 w-5 text-green-600" />
        {onlineCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-green-500 hover:bg-green-600 border-2 border-white"
          >
            {onlineCount > 99 ? '99+' : onlineCount}
          </Badge>
        )}
        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
      </Button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-hidden shadow-lg border z-50 animate-in slide-in-from-top-2 duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Wifi className="h-4 w-4 text-green-500" />
                Usuarios en línea
                <Badge variant="secondary" className="ml-auto">
                  {onlineCount}
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <Separator />
            
            <CardContent className="p-0">
              {onlineUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No hay usuarios en línea
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {onlineUsers.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={user.avatar_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/${user.avatar_path}` : undefined}
                            alt={user.colaborador || 'Usuario'}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-blue-500 text-white text-xs">
                            {getInitials(user.colaborador || 'Usuario')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.colaborador || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatLastSeen(user.last_seen_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
