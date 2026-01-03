import { useAppStore } from '../stores/appStore'
import { initializeFolder } from '../lib/filesystem'

export function Welcome() {
  const { setFolderHandle } = useAppStore()

  const handleSelectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      })
      await initializeFolder(handle)
      setFolderHandle(handle)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to select folder:', err)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-accent)' }}>
          Dumpster Fire
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--color-text-muted)' }}>
          Where your messy thoughts go to burn bright
        </p>

        <div
          className="rounded-lg p-8 mb-6"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Choose a folder where your writing will be stored. Everything stays on your
            computer - no cloud, no servers, just you and your words.
          </p>

          <button
            onClick={handleSelectFolder}
            className="w-full py-3 px-6 rounded-lg font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white',
            }}
          >
            Select Writing Folder
          </button>
        </div>

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Your data never leaves your device. We use the File System Access API
          to read and write directly to your chosen folder.
        </p>
      </div>
    </div>
  )
}
