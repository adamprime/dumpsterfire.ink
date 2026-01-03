import { useEffect } from 'react'
import { useAppStore } from './stores/appStore'
import { Welcome } from './components/Welcome'
import { Editor } from './components/Editor'

export default function App() {
  const { folderHandle, theme } = useAppStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  if (!folderHandle) {
    return <Welcome />
  }

  return <Editor />
}
