import { useEffect, useRef, useCallback } from 'react'
import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { nord } from '@milkdown/theme-nord'
import '@milkdown/theme-nord/style.css'

type FontFamily = 'sans' | 'serif' | 'mono' | 'handwritten' | 'theme'

interface MilkdownEditorProps {
  value: string
  onChange: (value: string) => void
  fontSize?: number
  lineHeight?: number
  fontFamily?: FontFamily
}

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  theme: 'var(--font-editor)',
  sans: 'system-ui, -apple-system, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'Consolas, "Courier New", monospace',
  handwritten: "'Caveat', cursive",
}

export function MilkdownEditor({ value, onChange, fontSize = 18, lineHeight = 1.6, fontFamily = 'theme' }: MilkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorInstanceRef = useRef<Editor | null>(null)
  const initialValueRef = useRef(value)
  
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const stableOnChange = useCallback((markdown: string) => {
    onChangeRef.current(markdown)
  }, [])

  useEffect(() => {
    if (!editorRef.current) return

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorRef.current!)
        ctx.set(defaultValueCtx, initialValueRef.current)
        ctx.set(editorViewOptionsCtx, { editable: () => true })
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          stableOnChange(markdown)
        })
      })
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .create()

    editor.then((e) => {
      editorInstanceRef.current = e
    })

    return () => {
      editor.then((e) => e.destroy())
    }
  }, [stableOnChange])

  return (
    <div
      ref={editorRef}
      className="milkdown-wrapper prose prose-invert max-w-none min-h-[60vh] focus-within:outline-none"
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: String(lineHeight),
        fontFamily: FONT_FAMILY_MAP[fontFamily],
      }}
    />
  )
}
