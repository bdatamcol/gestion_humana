import { createLowlight } from 'lowlight'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'

const lowlight = createLowlight()

// Register languages
lowlight.register({
  html: xml,
  css,
  javascript,
  typescript,
  python
})

export { lowlight }
