import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SyncStatus } from './types'

vi.mock('isomorphic-git', () => ({
  default: {
    clone: vi.fn(),
    init: vi.fn(),
    setConfig: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
    pull: vi.fn(),
    fetch: vi.fn(),
    statusMatrix: vi.fn(),
    resolveRef: vi.fn(),
    isDescendent: vi.fn(),
  },
}))

vi.mock('isomorphic-git/http/web', () => ({
  default: {},
}))

vi.mock('../storage/opfs-git-fs', () => ({
  createOpfsGitFs: vi.fn(() => ({
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
      readdir: vi.fn(),
      mkdir: vi.fn(),
      rmdir: vi.fn(),
      stat: vi.fn(),
      lstat: vi.fn(),
    },
  })),
}))

import git from 'isomorphic-git'
import { GitSync } from './git'

const mockGit = git as unknown as {
  clone: ReturnType<typeof vi.fn>
  init: ReturnType<typeof vi.fn>
  setConfig: ReturnType<typeof vi.fn>
  add: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  commit: ReturnType<typeof vi.fn>
  push: ReturnType<typeof vi.fn>
  pull: ReturnType<typeof vi.fn>
  fetch: ReturnType<typeof vi.fn>
  statusMatrix: ReturnType<typeof vi.fn>
  resolveRef: ReturnType<typeof vi.fn>
  isDescendent: ReturnType<typeof vi.fn>
}

describe('GitSync', () => {
  let sync: GitSync
  let statuses: SyncStatus[]
  const fakeRoot = {} as FileSystemDirectoryHandle
  const config = {
    repoUrl: 'https://github.com/user/repo.git',
    pat: 'ghp_test123',
    patExpiresAt: null,
    deviceId: 'ab12',
    corsProxy: 'https://git-proxy.dumpsterfire.ink/proxy',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    statuses = []
    sync = new GitSync(fakeRoot, config, (s) => statuses.push(s))
  })

  describe('clone', () => {
    it('calls isomorphic-git clone with proxy URL and depth 50', async () => {
      mockGit.clone.mockResolvedValue(undefined)

      await sync.clone()

      expect(mockGit.clone).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://git-proxy.dumpsterfire.ink/proxy/github.com/user/repo.git',
          depth: 50,
          singleBranch: true,
        }),
      )
    })

    it('reports syncing then synced status', async () => {
      mockGit.clone.mockResolvedValue(undefined)

      await sync.clone()

      expect(statuses).toEqual([
        { state: 'syncing', operation: 'clone' },
        { state: 'synced' },
      ])
    })

    it('reports error on clone failure', async () => {
      mockGit.clone.mockRejectedValue(new Error('network error'))

      await expect(sync.clone()).rejects.toThrow('network error')
      expect(statuses[1]).toEqual({ state: 'error', message: 'Clone failed: network error' })
    })
  })

  describe('commit', () => {
    it('skips commit when no changes', async () => {
      mockGit.statusMatrix.mockResolvedValue([
        ['file.md', 1, 1, 1],
      ])

      await sync.commit('test')

      expect(mockGit.commit).not.toHaveBeenCalled()
      expect(statuses).toContainEqual({ state: 'synced' })
    })

    it('stages and commits dirty files', async () => {
      mockGit.statusMatrix.mockResolvedValue([
        ['file.md', 1, 2, 1], // modified
      ])
      mockGit.add.mockResolvedValue(undefined)
      mockGit.commit.mockResolvedValue('abc123')

      await sync.commit('entry: 2026-04-08T14:32:11')

      expect(mockGit.add).toHaveBeenCalledWith(
        expect.objectContaining({ filepath: 'file.md' }),
      )
      expect(mockGit.commit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'entry: 2026-04-08T14:32:11',
          author: { name: 'Dumpster Fire', email: 'sync@dumpsterfire.ink' },
        }),
      )
    })

    it('uses git.remove for deleted files (workdir=0)', async () => {
      mockGit.statusMatrix.mockResolvedValue([
        ['deleted.md', 1, 0, 1], // deleted
      ])
      mockGit.remove.mockResolvedValue(undefined)
      mockGit.commit.mockResolvedValue('abc123')

      await sync.commit('cleanup')

      expect(mockGit.remove).toHaveBeenCalledWith(
        expect.objectContaining({ filepath: 'deleted.md' }),
      )
    })
  })

  describe('push', () => {
    it('calls git.push and reports synced', async () => {
      mockGit.push.mockResolvedValue(undefined)

      await sync.push()

      expect(mockGit.push).toHaveBeenCalledWith(
        expect.objectContaining({
          remote: 'origin',
          ref: 'main',
        }),
      )
      expect(statuses).toContainEqual({ state: 'synced' })
    })

    it('reports error on push failure', async () => {
      mockGit.push.mockRejectedValue(new Error('auth failed'))

      await sync.push()

      expect(statuses).toContainEqual({ state: 'error', message: 'Push failed: auth failed' })
    })
  })

  describe('pull', () => {
    it('calls git.pull and reports synced', async () => {
      mockGit.pull.mockResolvedValue(undefined)

      await sync.pull()

      expect(mockGit.pull).toHaveBeenCalled()
      expect(statuses).toContainEqual({ state: 'synced' })
    })
  })

  describe('status', () => {
    it('returns synced when no dirty files', async () => {
      mockGit.statusMatrix.mockResolvedValue([
        ['file.md', 1, 1, 1],
      ])

      const result = await sync.status()
      expect(result).toEqual({ state: 'synced' })
    })

    it('returns offline with pending commits when dirty', async () => {
      mockGit.statusMatrix.mockResolvedValue([
        ['file.md', 1, 2, 1],
      ])

      const result = await sync.status()
      expect(result).toEqual({ state: 'offline', pendingCommits: 1 })
    })

    it('returns disconnected when statusMatrix throws', async () => {
      mockGit.statusMatrix.mockRejectedValue(new Error('no git'))

      const result = await sync.status()
      expect(result).toEqual({ state: 'disconnected' })
    })
  })

  describe('PAT never logged', () => {
    it('does not include PAT in error messages', async () => {
      mockGit.push.mockRejectedValue(new Error('auth failed'))
      await sync.push()

      const errorStatus = statuses.find((s) => s.state === 'error')
      expect(JSON.stringify(errorStatus)).not.toContain(config.pat)
    })

    it('does not include PAT in status updates', async () => {
      mockGit.clone.mockRejectedValue(new Error('unauthorized'))
      try { await sync.clone() } catch { /* expected */ }

      const allStatusStrings = statuses.map((s) => JSON.stringify(s)).join('')
      expect(allStatusStrings).not.toContain(config.pat)
    })
  })

  describe('destroy', () => {
    it('clears timers without error', () => {
      expect(() => sync.destroy()).not.toThrow()
    })
  })
})
