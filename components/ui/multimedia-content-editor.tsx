"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Link, Video, Code, Type } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ContentBlock {
  id: string
  type: 'text' | 'link' | 'video' | 'embed'
  content: string
  title?: string
  description?: string
}

interface MultimediaContentEditorProps {
  value: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  className?: string
}

export function MultimediaContentEditor({ value, onChange, className }: MultimediaContentEditorProps) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(value.length > 0 ? value : [
    { id: '1', type: 'text', content: '', title: '', description: '' }
  ])

  const updateBlocks = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks)
    onChange(newBlocks)
  }

  const addBlock = (type: ContentBlock['type']) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      title: '',
      description: ''
    }
    updateBlocks([...blocks, newBlock])
  }

  const updateBlock = (id: string, field: keyof ContentBlock, value: string) => {
    const updatedBlocks = blocks.map(block => 
      block.id === id ? { ...block, [field]: value } : block
    )
    updateBlocks(updatedBlocks)
  }

  const removeBlock = (id: string) => {
    if (blocks.length > 1) {
      updateBlocks(blocks.filter(block => block.id !== id))
    }
  }

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(block => block.id === id)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blocks.length) return

    const newBlocks = [...blocks]
    const [movedBlock] = newBlocks.splice(index, 1)
    newBlocks.splice(newIndex, 0, movedBlock)
    updateBlocks(newBlocks)
  }

  const getBlockIcon = (type: ContentBlock['type']) => {
    switch (type) {
      case 'text': return React.createElement(Type, { className: "h-4 w-4" })
      case 'link': return React.createElement(Link, { className: "h-4 w-4" })
      case 'video': return React.createElement(Video, { className: "h-4 w-4" })
      case 'embed': return React.createElement(Code, { className: "h-4 w-4" })
    }
  }

  const getBlockTitle = (type: ContentBlock['type']) => {
    switch (type) {
      case 'text': return 'Texto'
      case 'link': return 'Enlace'
      case 'video': return 'Video'
      case 'embed': return 'Código Embebido'
    }
  }

  const renderBlockContent = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        return React.createElement('div', { className: "space-y-3" },
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `title-${block.id}` }, 'Título (opcional)'),
            React.createElement(Input, {
              id: `title-${block.id}`,
              value: block.title || '',
              onChange: (e: any) => updateBlock(block.id, 'title', e.target.value),
              placeholder: "Título del texto"
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `content-${block.id}` }, 'Contenido *'),
            React.createElement(Textarea, {
              id: `content-${block.id}`,
              value: block.content,
              onChange: (e: any) => updateBlock(block.id, 'content', e.target.value),
              placeholder: "Escriba el contenido del texto...",
              className: "min-h-[100px]"
            })
          )
        )
      
      case 'link':
        return React.createElement('div', { className: "space-y-3" },
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `title-${block.id}` }, 'Texto del enlace *'),
            React.createElement(Input, {
              id: `title-${block.id}`,
              value: block.title || '',
              onChange: (e: any) => updateBlock(block.id, 'title', e.target.value),
              placeholder: "Texto que se mostrará"
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `content-${block.id}` }, 'URL *'),
            React.createElement(Input, {
              id: `content-${block.id}`,
              value: block.content,
              onChange: (e: any) => updateBlock(block.id, 'content', e.target.value),
              placeholder: "https://ejemplo.com",
              type: "url"
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `description-${block.id}` }, 'Descripción (opcional)'),
            React.createElement(Input, {
              id: `description-${block.id}`,
              value: block.description || '',
              onChange: (e: any) => updateBlock(block.id, 'description', e.target.value),
              placeholder: "Descripción del enlace"
            })
          )
        )
      
      case 'video':
        return React.createElement('div', { className: "space-y-3" },
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `title-${block.id}` }, 'Título del video (opcional)'),
            React.createElement(Input, {
              id: `title-${block.id}`,
              value: block.title || '',
              onChange: (e: any) => updateBlock(block.id, 'title', e.target.value),
              placeholder: "Título del video"
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `content-${block.id}` }, 'URL del video *'),
            React.createElement(Input, {
              id: `content-${block.id}`,
              value: block.content,
              onChange: (e: any) => updateBlock(block.id, 'content', e.target.value),
              placeholder: "https://youtube.com/watch?v=... o https://vimeo.com/...",
              type: "url"
            }),
            React.createElement('p', { className: "text-xs text-muted-foreground mt-1" },
              'Soporta YouTube, Vimeo y otros servicios de video'
            )
          ),
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `description-${block.id}` }, 'Descripción (opcional)'),
            React.createElement(Textarea, {
              id: `description-${block.id}`,
              value: block.description || '',
              onChange: (e: any) => updateBlock(block.id, 'description', e.target.value),
              placeholder: "Descripción del video",
              className: "min-h-[60px]"
            })
          )
        )
      
      case 'embed':
        return React.createElement('div', { className: "space-y-3" },
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `title-${block.id}` }, 'Título (opcional)'),
            React.createElement(Input, {
              id: `title-${block.id}`,
              value: block.title || '',
              onChange: (e: any) => updateBlock(block.id, 'title', e.target.value),
              placeholder: "Título del contenido embebido"
            })
          ),
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `content-${block.id}` }, 'URL del contenido *'),
            React.createElement(Input, {
              id: `content-${block.id}`,
              value: block.content,
              onChange: (e: any) => updateBlock(block.id, 'content', e.target.value),
              placeholder: 'https://www.ejemplo.com/contenido',
              type: "url"
            }),
            React.createElement('p', { className: "text-xs text-muted-foreground mt-1" },
              'Ingrese la URL del contenido que desea embeber'
            )
          ),
          React.createElement('div', null,
            React.createElement(Label, { htmlFor: `description-${block.id}` }, 'Descripción (opcional)'),
            React.createElement(Input, {
              id: `description-${block.id}`,
              value: block.description || '',
              onChange: (e: any) => updateBlock(block.id, 'description', e.target.value),
              placeholder: "Descripción del contenido"
            })
          )
        )
      
      default:
        return null
    }
  }

  return React.createElement('div', { className: cn("space-y-4", className) },
    blocks.map((block, index) => 
      React.createElement(Card, { key: block.id, className: "relative" },
        React.createElement(CardHeader, { className: "pb-3" },
          React.createElement('div', { className: "flex items-center justify-between" },
            React.createElement(CardTitle, { className: "text-sm font-medium flex items-center gap-2" },
              getBlockIcon(block.type),
              getBlockTitle(block.type) + ' #' + (index + 1)
            ),
            React.createElement('div', { className: "flex items-center gap-1" },
              index > 0 && React.createElement(Button, {
                type: "button",
                variant: "ghost",
                size: "sm",
                onClick: () => moveBlock(block.id, 'up'),
                className: "h-8 w-8 p-0"
              }, '↑'),
              index < blocks.length - 1 && React.createElement(Button, {
                type: "button",
                variant: "ghost",
                size: "sm",
                onClick: () => moveBlock(block.id, 'down'),
                className: "h-8 w-8 p-0"
              }, '↓'),
              blocks.length > 1 && React.createElement(Button, {
                type: "button",
                variant: "ghost",
                size: "sm",
                onClick: () => removeBlock(block.id),
                className: "h-8 w-8 p-0 text-red-500 hover:text-red-700"
              }, React.createElement(Trash2, { className: "h-4 w-4" }))
            )
          )
        ),
        React.createElement(CardContent, null,
          renderBlockContent(block)
        )
      )
    ),
    React.createElement('div', { className: "flex flex-wrap gap-2" },
      React.createElement(Button, {
        type: "button",
        variant: "outline",
        size: "sm",
        onClick: () => addBlock('text'),
        className: "flex items-center gap-2"
      },
        React.createElement(Type, { className: "h-4 w-4" }),
        'Agregar Texto'
      ),
      React.createElement(Button, {
        type: "button",
        variant: "outline",
        size: "sm",
        onClick: () => addBlock('link'),
        className: "flex items-center gap-2"
      },
        React.createElement(Link, { className: "h-4 w-4" }),
        'Agregar Enlace'
      ),
      React.createElement(Button, {
        type: "button",
        variant: "outline",
        size: "sm",
        onClick: () => addBlock('video'),
        className: "flex items-center gap-2"
      },
        React.createElement(Video, { className: "h-4 w-4" }),
        'Agregar Video'
      ),
      React.createElement(Button, {
        type: "button",
        variant: "outline",
        size: "sm",
        onClick: () => addBlock('embed'),
        className: "flex items-center gap-2"
      },
        React.createElement(Code, { className: "h-4 w-4" }),
        'Agregar Embed'
      )
    )
  )
}

// Función helper para convertir bloques a HTML para mostrar en el frontend
export function renderContentBlocks(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'text':
        const title = block.title ? `<h3 class="text-lg font-semibold mb-2">${block.title}</h3>` : ''
        return `${title}<div class="prose max-w-none">${block.content.replace(/\n/g, '<br>')}</div>`
      
      case 'link':
        const linkDesc = block.description ? `<p class="text-sm text-gray-600 mb-1">${block.description}</p>` : ''
        return `${linkDesc}<a href="${block.content}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-600 hover:text-blue-800 underline">${block.title || block.content}</a>`
      
      case 'video':
        const videoTitle = block.title ? `<h3 class="text-lg font-semibold mb-2">${block.title}</h3>` : ''
        const videoDesc = block.description ? `<p class="text-sm text-gray-600 mb-2">${block.description}</p>` : ''
        let videoEmbed = ''
        
        // Convertir URLs de YouTube a embed
        if (block.content.includes('youtube.com/watch') || block.content.includes('youtu.be/')) {
          const videoId = block.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
          if (videoId) {
            videoEmbed = `<div class="relative w-full" style="aspect-ratio: 16/9;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen class="absolute inset-0 w-full h-full rounded-lg"></iframe></div>`
          }
        }
        // Convertir URLs de Vimeo a embed
        else if (block.content.includes('vimeo.com/')) {
          const videoId = block.content.match(/vimeo\.com\/(\d+)/)?.[1]
          if (videoId) {
            videoEmbed = `<div class="relative w-full" style="aspect-ratio: 16/9;"><iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allowfullscreen class="absolute inset-0 w-full h-full rounded-lg"></iframe></div>`
          }
        }
        
        if (!videoEmbed) {
          videoEmbed = `<a href="${block.content}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">Ver video</a>`
        }
        
        return `${videoTitle}${videoDesc}<div class="video-container mb-4">${videoEmbed}</div>`
      
      case 'embed':
        const embedTitle = block.title ? `<h3 class="text-lg font-semibold mb-2">${block.title}</h3>` : ''
        const embedDesc = block.description ? `<p class="text-sm text-gray-600 mb-2">${block.description}</p>` : ''
        // Generar código embed automáticamente desde la URL con proporción 16:9 y border-radius
        const embedCode = `<div class="relative w-full" style="aspect-ratio: 16/9;"><embed src="${block.content}" class="absolute inset-0 w-full h-full rounded-lg" allowfullscreen></div>`
        return `${embedTitle}${embedDesc}<div class="embed-container mb-4">${embedCode}</div>`
      
      default:
        return ''
    }
  }).join('<div class="mb-6"></div>')
}