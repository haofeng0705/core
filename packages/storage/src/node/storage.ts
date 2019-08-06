import { IDatabaseStorageServer, IUpdateRequest, IDatabaseStoragePathServer } from '../common';
import { Injectable, Autowired } from '@ali/common-di';
import { IFileService } from '@ali/ide-file-service';
import { Deferred } from '@ali/ide-core-common';
import * as path from 'path';

@Injectable()
export class DatabaseStorageServer implements IDatabaseStorageServer {

  @Autowired(IFileService)
  protected readonly fileSystem: IFileService;

  @Autowired(IDatabaseStoragePathServer)
  protected readonly dataStoragePathServer: IDatabaseStoragePathServer;

  private deferredStorageDirPath = new Deferred<string>();
  private databaseStorageDirPath: string | undefined;

  private storageName: string;
  private _cache: any = {};

  public async init() {
    return await this.setupDirectories();
  }

  private async setupDirectories() {
    const storagePath = await this.dataStoragePathServer.provideStorageDirPath();
    this.deferredStorageDirPath.resolve(storagePath);
    this.databaseStorageDirPath = storagePath;
    return storagePath;
  }

  private async getStoragePath(storageName: string): Promise<string | undefined> {
    if (!this.databaseStorageDirPath) {
      await this.deferredStorageDirPath.promise;
    }
    const hasSlash = storageName.indexOf('/') >= 0;

    const storagePath = await this.dataStoragePathServer.getLastStoragePath();

    if (hasSlash) {
      const storagePaths = storageName.split('/');
      storageName = storagePaths[storagePaths.length - 1];
      const subDirPaths = storagePaths.slice(0, -1);
      const subDir = path.join(storagePath || '', ...subDirPaths);
      if (!await this.fileSystem.exists(subDir)) {
        await this.fileSystem.createFolder(subDir);
      }
      return storagePath ? path.join(subDir, `${storageName}.json`) : undefined;
    }

    return storagePath ? path.join(storagePath, `${storageName}.json`) : undefined;
  }

  async getItems(storageName: string) {
    let items = {};
    const storagePath = await this.getStoragePath(storageName);
    if (!storagePath) {
      console.error(`Storage [${this.storageName}] is invalid.`);
    } else {
      if (await this.fileSystem.exists(storagePath)) {
        const data = await this.fileSystem.resolveContent(storagePath);
        try {
          items = JSON.parse(data.content);
        } catch (error) {
          console.error(error);
        }
      }
    }
    this._cache[storageName] = items;
    return items;
  }

  async updateItems(storageName: string, request: IUpdateRequest) {
    let raw = {};
    if (this._cache[storageName]) {
      raw = this._cache[storageName];
    } else {
      raw = await this.getItems(storageName);
    }
    // INSERT
    if (request.insert) {
      raw = {
        ...raw,
        ...request.insert,
      };
    }

    // DELETE
    if (request.delete && request.delete.length > 0) {
      const deleteSet = new Set(request.delete);
      deleteSet.forEach((key) => {
        if (raw[key]) {
          delete raw[key];
        }
      });
    }

    const storagePath = await this.getStoragePath(storageName);

    if (storagePath) {
      let storageFile = await this.fileSystem.getFileStat(storagePath);
      if (!storageFile) {
        storageFile = await this.fileSystem.createFile(storagePath);
      }
      await this.fileSystem.setContent(storageFile, JSON.stringify(raw));
    }
  }

  async close(recovery?: () => Map<string, string>) {
    // do nothing
  }
}
