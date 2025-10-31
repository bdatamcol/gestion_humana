export const slashMenuItems = [
    {
      title: "Texto",
      items: [
        {
          name: "Párrafo",
          description: "Texto simple",
          icon: "paragraph",
          command: () => ({ name: "paragraph" }),
        },
        {
          name: "Encabezado 1",
          description: "Título grande",
          icon: "h1",
          command: () => ({ name: "heading", attrs: { level: 1 } }),
        },
        {
          name: "Encabezado 2",
          description: "Título mediano",
          icon: "h2",
          command: () => ({ name: "heading", attrs: { level: 2 } }),
        },
        {
          name: "Encabezado 3",
          description: "Título pequeño",
          icon: "h3",
          command: () => ({ name: "heading", attrs: { level: 3 } }),
        },
      ],
    },
    {
      title: "Listas",
      items: [
        {
          name: "Lista con viñetas",
          description: "Lista simple con viñetas",
          icon: "bulletList",
          command: () => ({ name: "bulletList" }),
        },
        {
          name: "Lista numerada",
          description: "Lista con números",
          icon: "orderedList",
          command: () => ({ name: "orderedList" }),
        },
        {
          name: "Lista de tareas",
          description: "Lista con casillas de verificación",
          icon: "taskList",
          command: () => ({ name: "taskList" }),
        },
      ],
    },
    {
      title: "Elementos",
      items: [
        {
          name: "Tabla",
          description: "Insertar una tabla",
          icon: "table",
          command: () => ({ name: "insertTable" }),
        },
        {
          name: "Imagen",
          description: "Insertar una imagen",
          icon: "image",
          command: () => ({ name: "image" }),
        },
        {
          name: "Bloque de código",
          description: "Código con resaltado de sintaxis",
          icon: "code",
          command: () => ({ name: "codeBlock" }),
        },
        {
          name: "Cita",
          description: "Bloque de cita",
          icon: "quote",
          command: () => ({ name: "blockquote" }),
        },
        {
          name: "Línea horizontal",
          description: "Separador horizontal",
          icon: "horizontalRule",
          command: () => ({ name: "horizontalRule" }),
        },
      ],
    },
  ]
