import {
  StorageError,
  createMemoryRecordAdapter,
  createProjectFileLockKey,
  createProjectFolderHandleStore,
  createProjectFolderStore,
  detectFileSystemAccessSupport,
  guardWritableProjectPath,
  initializeProjectFolderAccess,
  readProjectFolderPermission,
  requestProjectFolderPermission,
  resetProjectFileLockQueuesForTests,
  runWithProjectFileLock,
  sanitizeProjectFileName,
  selectProjectFolder,
  splitProjectRelativePath
} from '../src/index.js';

class MockFileHandle {
  constructor(name, file = null) {
    this.kind = 'file';
    this.name = name;
    this.file = file || new Blob([]);
  }

  async getFile() {
    return this.file;
  }

  async createWritable() {
    const handle = this;
    const chunks = [];
    return {
      async write(value) {
        chunks.push(value);
      },
      async close() {
        handle.file = new Blob(chunks);
      },
      async abort() {
        chunks.length = 0;
      }
    };
  }

  async move(parent, newName) {
    parent.entries.delete(this.name);
    this.name = newName;
    parent.entries.set(newName, this);
  }
}

class MockDirectoryHandle {
  constructor(name = 'root', permission = 'granted') {
    this.kind = 'directory';
    this.name = name;
    this.permission = permission;
    this.entries = new Map();
  }

  async queryPermission() {
    return this.permission;
  }

  async requestPermission() {
    return this.permission;
  }

  async getDirectoryHandle(name, { create = false } = {}) {
    const existing = this.entries.get(name);
    if (existing?.kind === 'directory') return existing;
    if (existing?.kind === 'file') throw Object.assign(new Error('Type mismatch'), { name: 'TypeMismatchError' });
    if (!create) throw Object.assign(new Error('Not found'), { name: 'NotFoundError' });
    const next = new MockDirectoryHandle(name, this.permission);
    this.entries.set(name, next);
    return next;
  }

  async getFileHandle(name, { create = false } = {}) {
    const existing = this.entries.get(name);
    if (existing?.kind === 'file') return existing;
    if (existing?.kind === 'directory') throw Object.assign(new Error('Type mismatch'), { name: 'TypeMismatchError' });
    if (!create) throw Object.assign(new Error('Not found'), { name: 'NotFoundError' });
    const next = new MockFileHandle(name);
    this.entries.set(name, next);
    return next;
  }

  async removeEntry(name, { recursive = false } = {}) {
    const existing = this.entries.get(name);
    if (!existing) throw Object.assign(new Error('Not found'), { name: 'NotFoundError' });
    if (existing.kind === 'directory' && existing.entries.size && !recursive) {
      throw Object.assign(new Error('Not empty'), { name: 'InvalidModificationError' });
    }
    this.entries.delete(name);
  }

  async *values() {
    yield* this.entries.values();
  }
}

describe('project file path utilities', () => {
  test('sanitizeProjectFileName rejects unsafe file names', () => {
    expect(sanitizeProjectFileName(' Example.ttl ')).toBe(' Example.ttl');
    expect(() => sanitizeProjectFileName('../x')).toThrow(StorageError);
    expect(() => sanitizeProjectFileName('CON.txt')).toThrow(StorageError);
    expect(() => sanitizeProjectFileName('bad:name')).toThrow(StorageError);
  });

  test('splitProjectRelativePath and createProjectFileLockKey normalize path segments', () => {
    expect(splitProjectRelativePath('artifacts/source/file.ttl')).toEqual(['artifacts', 'source', 'file.ttl']);
    expect(createProjectFileLockKey('artifacts/source/file.ttl')).toBe('project-file:artifacts/source/file.ttl');
    expect(() => splitProjectRelativePath('artifacts//file.ttl')).toThrow(StorageError);
  });

  test('guardWritableProjectPath rejects reserved metadata writes', () => {
    expect(() => guardWritableProjectPath('artifacts/source/file.ttl')).not.toThrow();
    expect(() => guardWritableProjectPath('.app/version')).toThrow(StorageError);
  });
});

describe('project file locks', () => {
  afterEach(() => resetProjectFileLockQueuesForTests());

  test('runWithProjectFileLock serializes fallback operations for the same key', async () => {
    const order = [];
    await Promise.all([
      runWithProjectFileLock('same', async () => {
        order.push('a-start');
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push('a-end');
      }, { lockManager: null }),
      runWithProjectFileLock('same', async () => {
        order.push('b-start');
        order.push('b-end');
      }, { lockManager: null })
    ]);
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
  });
});

describe('File System Access project folder store', () => {
  test('detectFileSystemAccessSupport and selectProjectFolder report support without throwing', async () => {
    expect(detectFileSystemAccessSupport({ windowRef: {} }).ok).toBe(false);
    const picked = new MockDirectoryHandle('picked');
    const result = await selectProjectFolder({
      windowRef: {
        showDirectoryPicker: async () => picked
      }
    });
    expect(result.ok).toBe(true);
    expect(result.value).toBe(picked);
  });

  test('readProjectFolderPermission and requestProjectFolderPermission expose permission state', async () => {
    const handle = new MockDirectoryHandle('project', 'granted');
    expect(await readProjectFolderPermission({ handle })).toBe('granted');
    expect(await requestProjectFolderPermission({ handle })).toBe('granted');
  });

  test('initializeProjectFolderAccess rejects ungranted handles', async () => {
    await expect(initializeProjectFolderAccess({ handle: new MockDirectoryHandle('project', 'denied') }))
      .rejects.toMatchObject({ code: 'PROJECT_FOLDER_PERMISSION_NOT_GRANTED' });
  });

  test('writes, reads, lists, renames, and removes project files', async () => {
    const store = await createProjectFolderStore(new MockDirectoryHandle(), { dataPath: 'ontology-workbench' }).initialize();
    await store.createProjectDirectory('artifacts/source');
    await store.writeProjectFileText('artifacts/source/input.ttl', '@prefix ex: <http://example.org/> .');
    expect(await store.readProjectFileText('artifacts/source/input.ttl')).toBe('@prefix ex: <http://example.org/> .');
    expect((await store.listProjectFolderEntries('artifacts/source')).map((entry) => entry.name)).toEqual(['input.ttl']);
    await store.renameProjectFileEntry('artifacts/source/input.ttl', 'renamed.ttl');
    expect(await store.readProjectFileText('artifacts/source/renamed.ttl')).toBe('@prefix ex: <http://example.org/> .');
    await store.deleteProjectFileEntry('artifacts/source/renamed.ttl');
    expect(await store.listProjectFolderEntries('artifacts/source')).toEqual([]);
  });

  test('rejects public writes into reserved metadata folder', async () => {
    const store = await createProjectFolderStore(new MockDirectoryHandle()).initialize();
    await expect(store.writeProjectFileText('.app/version', 'x'))
      .rejects.toMatchObject({ code: 'RESERVED_PROJECT_FILE_PATH' });
  });
});

describe('project folder handle store', () => {
  test('stores, lists, updates, reads, and deletes FSA handle records', async () => {
    const adapter = createMemoryRecordAdapter();
    const handles = createProjectFolderHandleStore(adapter, { now: () => '2026-07-31T12:00:00.000Z' });
    const handle = new MockDirectoryHandle('folder');
    const stored = await handles.storeProjectFolderHandleRecord({
      projectId: 'project:x',
      label: 'Folder X',
      handle,
      dataPath: 'ontology-workbench'
    });
    expect(stored.handleId).toMatch(/^fsa:/);
    expect(await handles.readProjectFolderHandleRecord(stored.handleId)).toMatchObject({ projectId: 'project:x', label: 'Folder X' });
    expect(await handles.listProjectFolderHandleRecords({ projectId: 'project:x' })).toHaveLength(1);
    await handles.updateProjectFolderHandleRecord(stored.handleId, { label: 'Renamed Folder' });
    expect(await handles.readProjectFolderHandleRecord(stored.handleId)).toMatchObject({ label: 'Renamed Folder' });
    expect(await handles.deleteProjectFolderHandleRecord(stored.handleId)).toBe(true);
    expect(await handles.readProjectFolderHandleRecord(stored.handleId)).toBeNull();
  });
});
