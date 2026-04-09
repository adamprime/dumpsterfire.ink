/**
 * OPFS filesystem adapter for isomorphic-git.
 * Implements the PromiseFsClient interface (promises.readFile, writeFile, etc.)
 * directly on the Origin Private File System -- the same root OpfsStorage uses.
 * No IndexedDB, no dual stores.
 */

interface StatResult {
  type: 'file' | 'dir'
  mode: number
  size: number
  ino: number
  mtimeMs: number
  ctimeMs: number
  uid: 1
  gid: 1
  dev: 1
  isFile: () => boolean
  isDirectory: () => boolean
  isSymbolicLink: () => boolean
}

function makeStat(type: 'file' | 'dir', size: number): StatResult {
  const now = Date.now()
  return {
    type,
    mode: type === 'file' ? 0o100644 : 0o040000,
    size,
    ino: 0,
    mtimeMs: now,
    ctimeMs: now,
    uid: 1,
    gid: 1,
    dev: 1,
    isFile: () => type === 'file',
    isDirectory: () => type === 'dir',
    isSymbolicLink: () => false,
  }
}

function splitPath(filepath: string): string[] {
  return filepath.replace(/^\/+/, '').split('/').filter(Boolean)
}

async function resolveDir(
  root: FileSystemDirectoryHandle,
  parts: string[],
  create = false,
): Promise<FileSystemDirectoryHandle> {
  let dir = root
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create })
  }
  return dir
}

async function resolveParent(
  root: FileSystemDirectoryHandle,
  filepath: string,
  create = false,
): Promise<{ parent: FileSystemDirectoryHandle; name: string }> {
  const parts = splitPath(filepath)
  const name = parts.pop()!
  const parent = await resolveDir(root, parts, create)
  return { parent, name }
}

export function createOpfsGitFs(root: FileSystemDirectoryHandle) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  return {
    promises: {
      async readFile(filepath: string, opts?: { encoding?: string } | string): Promise<Uint8Array | string> {
        const { parent, name } = await resolveParent(root, filepath)
        const handle = await parent.getFileHandle(name)
        const file = await handle.getFile()
        const buffer = new Uint8Array(await file.arrayBuffer())
        const encoding = typeof opts === 'string' ? opts : opts?.encoding
        if (encoding === 'utf8' || encoding === 'utf-8') return decoder.decode(buffer)
        return buffer
      },

      async writeFile(filepath: string, data: Uint8Array | string, opts?: { mode?: number } | string): Promise<void> {
        void opts
        const { parent, name } = await resolveParent(root, filepath, true)
        const handle = await parent.getFileHandle(name, { create: true })
        const writable = await handle.createWritable()
        const bytes = typeof data === 'string' ? encoder.encode(data) : data
        await writable.write(bytes)
        await writable.close()
      },

      async unlink(filepath: string): Promise<void> {
        const { parent, name } = await resolveParent(root, filepath)
        await parent.removeEntry(name)
      },

      async readdir(filepath: string): Promise<string[]> {
        const parts = splitPath(filepath)
        const dir = await resolveDir(root, parts)
        const entries: string[] = []
        for await (const [name] of dir.entries()) {
          entries.push(name)
        }
        return entries
      },

      async mkdir(filepath: string, _opts?: { mode?: number }): Promise<void> {
        const { parent, name } = await resolveParent(root, filepath, true)
        await parent.getDirectoryHandle(name, { create: true })
      },

      async rmdir(filepath: string): Promise<void> {
        const { parent, name } = await resolveParent(root, filepath)
        await parent.removeEntry(name, { recursive: true })
      },

      async stat(filepath: string): Promise<StatResult> {
        const parts = splitPath(filepath)
        if (parts.length === 0) return makeStat('dir', 0)

        const parentParts = parts.slice(0, -1)
        const name = parts[parts.length - 1]!
        const parent = await resolveDir(root, parentParts)

        try {
          const handle = await parent.getFileHandle(name)
          const file = await handle.getFile()
          return makeStat('file', file.size)
        } catch {
          await parent.getDirectoryHandle(name)
          return makeStat('dir', 0)
        }
      },

      async lstat(filepath: string): Promise<StatResult> {
        return this.stat(filepath)
      },

      async readlink(): Promise<never> {
        throw new Error('Symlinks not supported in OPFS')
      },

      async symlink(): Promise<never> {
        throw new Error('Symlinks not supported in OPFS')
      },
    },
  }
}
