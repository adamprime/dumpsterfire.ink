import { createOpfsGitFs } from '../storage/opfs-git-fs'
import type { SyncStatus, GitSyncConfig } from './types'
import { PROXY_URL } from './types'

// Lazy-load isomorphic-git so it's code-split out of the main bundle.
// Only users who enable GitSync pay the ~89 KB cost.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _git: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _http: any = null

async function getGit() {
  if (!_git) {
    const mod = await import('isomorphic-git')
    _git = mod.default ?? mod
  }
  if (!_http) {
    const httpMod = await import('isomorphic-git/http/web')
    _http = httpMod.default
  }
  return { git: _git as typeof import('isomorphic-git').default, http: _http }
}

export class GitSync {
  private fs: ReturnType<typeof createOpfsGitFs>
  private dir = '/'
  private config: GitSyncConfig
  private pushTimer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private retryCount = 0
  private onStatusChange: (status: SyncStatus) => void

  constructor(
    root: FileSystemDirectoryHandle,
    config: GitSyncConfig,
    onStatusChange: (status: SyncStatus) => void,
  ) {
    this.fs = createOpfsGitFs(root)
    this.config = config
    this.onStatusChange = onStatusChange
  }

  private get corsProxy(): string {
    return this.config.corsProxy || PROXY_URL
  }

  private proxyUrl(url: string): string {
    const stripped = url.replace(/^https:\/\//, '')
    return `${this.corsProxy}/${stripped}`
  }

  private get author(): { name: string; email: string } {
    return { name: 'Dumpster Fire', email: 'sync@dumpsterfire.ink' }
  }

  async clone(): Promise<void> {
    this.onStatusChange({ state: 'syncing', operation: 'clone' })
    try {
      const { git, http } = await getGit()
      await git.clone({
        fs: this.fs,
        http,
        dir: this.dir,
        url: this.proxyUrl(this.config.repoUrl),
        depth: 50,
        singleBranch: true,
        onAuth: () => ({ username: this.config.pat }),
      })
      this.onStatusChange({ state: 'synced' })
    } catch (err) {
      this.onStatusChange({ state: 'error', message: `Clone failed: ${(err as Error).message}` })
      throw err
    }
  }

  async init(): Promise<void> {
    try {
      const { git } = await getGit()
      await git.init({ fs: this.fs, dir: this.dir, defaultBranch: 'main' })
      await git.setConfig({ fs: this.fs, dir: this.dir, path: 'remote.origin.url', value: this.proxyUrl(this.config.repoUrl) })
    } catch (err) {
      this.onStatusChange({ state: 'error', message: `Init failed: ${(err as Error).message}` })
      throw err
    }
  }

  async commit(message: string): Promise<void> {
    this.onStatusChange({ state: 'syncing', operation: 'commit' })
    try {
      const { git } = await getGit()
      const status = await git.statusMatrix({ fs: this.fs, dir: this.dir })
      let hasChanges = false

      for (const [filepath, head, workdir, stage] of status) {
        if (head !== workdir || head !== stage) {
          if (workdir === 0) {
            await git.remove({ fs: this.fs, dir: this.dir, filepath })
          } else {
            await git.add({ fs: this.fs, dir: this.dir, filepath })
          }
          hasChanges = true
        }
      }

      if (!hasChanges) {
        this.onStatusChange({ state: 'synced' })
        return
      }

      await git.commit({
        fs: this.fs,
        dir: this.dir,
        message,
        author: this.author,
      })

      this.schedulePush()
    } catch (err) {
      this.onStatusChange({ state: 'error', message: `Commit failed: ${(err as Error).message}` })
    }
  }

  async push(): Promise<void> {
    this.onStatusChange({ state: 'syncing', operation: 'push' })
    try {
      const { git, http } = await getGit()
      await git.push({
        fs: this.fs,
        http,
        dir: this.dir,
        remote: 'origin',
        ref: 'main',
        onAuth: () => ({ username: this.config.pat }),
      })
      this.retryCount = 0
      this.onStatusChange({ state: 'synced' })
    } catch (err) {
      const message = (err as Error).message
      if (message.includes('not fast-forward')) {
        await this.handlePushConflict()
      } else {
        this.scheduleRetry()
        this.onStatusChange({ state: 'error', message: `Push failed: ${message}` })
      }
    }
  }

  async pull(): Promise<void> {
    this.onStatusChange({ state: 'syncing', operation: 'pull' })
    try {
      const { git, http } = await getGit()
      await git.pull({
        fs: this.fs,
        http,
        dir: this.dir,
        ref: 'main',
        singleBranch: true,
        author: this.author,
        onAuth: () => ({ username: this.config.pat }),
      })
      this.onStatusChange({ state: 'synced' })
    } catch (err) {
      this.onStatusChange({ state: 'error', message: `Pull failed: ${(err as Error).message}` })
    }
  }

  async status(): Promise<SyncStatus> {
    try {
      const { git } = await getGit()
      const status = await git.statusMatrix({ fs: this.fs, dir: this.dir })
      const dirty = status.some(([, head, workdir, stage]) => head !== workdir || head !== stage)

      if (dirty) {
        return { state: 'offline', pendingCommits: 1 }
      }
      return { state: 'synced' }
    } catch {
      return { state: 'disconnected' }
    }
  }

  private async handlePushConflict(): Promise<void> {
    try {
      const { git, http } = await getGit()
      await git.fetch({
        fs: this.fs,
        http,
        dir: this.dir,
        ref: 'main',
        singleBranch: true,
        onAuth: () => ({ username: this.config.pat }),
      })

      const localRef = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'main' })
      const remoteRef = await git.resolveRef({ fs: this.fs, dir: this.dir, ref: 'origin/main' })

      if (localRef === remoteRef) {
        this.onStatusChange({ state: 'synced' })
        return
      }

      // Try fast-forward merge first
      const isAncestor = await git.isDescendent({
        fs: this.fs,
        dir: this.dir,
        oid: remoteRef,
        ancestor: localRef,
      })

      if (isAncestor) {
        // Remote is ahead, fast-forward
        await git.pull({
          fs: this.fs,
          http,
          dir: this.dir,
          ref: 'main',
          singleBranch: true,
          author: this.author,
          onAuth: () => ({ username: this.config.pat }),
        })
        // Re-push our local changes
        await this.push()
      } else {
        // True divergence -- rename conflicting files with device suffix
        await this.resolveConflictByRename()
        await this.push()
      }
    } catch (err) {
      this.onStatusChange({ state: 'error', message: `Conflict resolution failed: ${(err as Error).message}` })
    }
  }

  private async resolveConflictByRename(): Promise<void> {
    const { git, http } = await getGit()
    const statusMatrix = await git.statusMatrix({ fs: this.fs, dir: this.dir })
    const suffix = this.config.deviceId

    for (const [filepath, head, workdir] of statusMatrix) {
      if (head !== workdir && filepath.endsWith('.md') && !filepath.endsWith('.meta.json')) {
        const conflictName = filepath.replace('.md', `-conflict-${suffix}.md`)
        try {
          const content = await this.fs.promises.readFile(filepath, 'utf8') as string
          await this.fs.promises.writeFile(conflictName, content)
          await git.add({ fs: this.fs, dir: this.dir, filepath: conflictName })
        } catch {
          // Skip files we can't read
        }
      }
    }

    // Pull remote version (overwrites local)
    await git.pull({
      fs: this.fs,
      http,
      dir: this.dir,
      ref: 'main',
      singleBranch: true,
      author: this.author,
      onAuth: () => ({ username: this.config.pat }),
    })

    // Commit the conflict copies
    await git.commit({
      fs: this.fs,
      dir: this.dir,
      message: `conflict: keep local changes from device ${suffix}`,
      author: this.author,
    })
  }

  private schedulePush(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer)
    this.pushTimer = setTimeout(() => this.push(), 5000)
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    const delays = [5000, 15000, 45000, 120000, 300000]
    const delay = delays[Math.min(this.retryCount, delays.length - 1)]!
    this.retryCount++
    this.retryTimer = setTimeout(() => this.push(), delay)
  }

  destroy(): void {
    if (this.pushTimer) clearTimeout(this.pushTimer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
  }
}
