import { useEffect, useRef } from 'react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { nord } from '@milkdown/theme-nord'
import '@milkdown/theme-nord/style.css'

interface MilkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MilkdownEditor({ value, onChange }: MilkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorInstanceRef = useRef<Editor | null>(null)
  const initialValueRef = useRef(value)

  useEffect(() => {
    if (!editorRef.current) return

    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, editorRef.current!)
        ctx.set(defaultValueCtx, initialValueRef.current)
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          onChange(markdown)
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
  }, [onChange])

  return (
    <div
      ref={editorRef}
      className="prose prose-invert max-w-none min-h-[60vh] focus-within:outline-none"
      style={{
        fontSize: '18px',
        lineHeight: '1.75',
      }}
    />
  )
}
