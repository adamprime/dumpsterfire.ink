import { useState } from 'react'
import { saveSyncConfig, generateDeviceId } from '../lib/sync/pat-store'
import { PROXY_URL } from '../lib/sync/types'

interface GitSyncSetupProps {
  onComplete: () => void
  onCancel: () => void
}

const GITHUB_NEW_REPO_URL = 'https://github.com/new?name=dumpsterfire-sync&visibility=private&description=My+Dumpster+Fire+writing+sync'
const GITHUB_PAT_URL = 'https://github.com/settings/personal-access-tokens/new'

export function GitSyncSetup({ onComplete, onCancel }: GitSyncSetupProps) {
  const [step, setStep] = useState(1)
  const [repoUrl, setRepoUrl] = useState('')
  const [pat, setPat] = useState('')
  const [patExpiresAt, setPatExpiresAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const handleVerifyAndConnect = async () => {
    if (!repoUrl || !pat) return

    setVerifying(true)
    setError(null)

    try {
      const response = await fetch(`${PROXY_URL}/api.github.com/user`, {
        headers: {
          'Authorization': `Bearer ${pat}`,
          'User-Agent': 'DumpsterFire/1.0',
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.message || `GitHub returned ${response.status}. Check your PAT.`)
        return
      }

      await saveSyncConfig({
        repoUrl: repoUrl.replace(/\/$/, '').replace(/\.git$/, '') + '.git',
        pat,
        patExpiresAt: patExpiresAt || null,
        deviceId: generateDeviceId(),
      })

      onComplete()
    } catch {
      setError('Failed to connect. Check your internet connection and try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50 pt-16 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg max-w-lg w-full mx-4 mb-8"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-lg font-semibold">Set Up GitHub Sync</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Step {step} of 3
          </p>
        </div>

        <div className="p-4">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Create an empty <strong>private</strong> repository on GitHub. This will store your writing.
              </p>
              <a
                href={GITHUB_NEW_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-lg font-medium text-center transition-colors text-sm"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                Create Private Repo on GitHub
              </a>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Already have a repo? Skip to the next step.
              </p>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2 rounded text-sm"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Create a <strong>fine-grained Personal Access Token</strong> scoped to your sync repo.
              </p>
              <div className="text-xs rounded p-3" style={{ backgroundColor: 'var(--color-bg)' }}>
                <p className="font-medium mb-2">Required permissions:</p>
                <ul className="space-y-1 pl-4 list-disc" style={{ color: 'var(--color-text-muted)' }}>
                  <li>Contents: <strong>Read and Write</strong></li>
                  <li>Metadata: <strong>Read</strong></li>
                </ul>
                <p className="mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  Select only your sync repo. No other permissions needed.
                </p>
              </div>
              <a
                href={GITHUB_PAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 rounded-lg font-medium text-center transition-colors text-sm"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                Create PAT on GitHub
              </a>
              <button
                onClick={() => setStep(3)}
                className="w-full py-2 rounded text-sm"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
              >
                Next
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Repository URL</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/dumpsterfire-sync"
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Personal Access Token</label>
                <input
                  type="password"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="github_pat_..."
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Token Expiration Date <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
                </label>
                <input
                  type="date"
                  value={patExpiresAt}
                  onChange={(e) => setPatExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  We'll remind you before it expires so sync doesn't break.
                </p>
              </div>

              {error && (
                <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
              )}

              <button
                onClick={handleVerifyAndConnect}
                disabled={!repoUrl || !pat || verifying}
                className="w-full py-3 rounded-lg font-medium text-sm transition-colors"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  opacity: !repoUrl || !pat || verifying ? 0.5 : 1,
                }}
              >
                {verifying ? 'Verifying...' : 'Connect & Sync'}
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--color-border)' }}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
              Back
            </button>
          )}
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
