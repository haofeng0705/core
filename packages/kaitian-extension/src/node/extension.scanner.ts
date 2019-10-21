import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { getLogger } from '@ali/ide-core-node';
import * as semver from 'semver';
import { IExtensionMetaData, ExtraMetaData } from '../common';

function resolvePath(path) {
  if (path[0] === '~') {
      return path.join(os.homedir(), path.slice(1));
  }
  return path;
}

export class ExtensionScanner {

  private results: Map<string, IExtensionMetaData> = new Map();

  private availableExtensions: Map<string, IExtensionMetaData> = new Map();

  constructor(
    private scan: string[],
    private extenionCandidate: string[],
    private extraMetaData: ExtraMetaData,
  ) { }

  public async run(): Promise<IExtensionMetaData[]> {

    const scan = this.scan.map((dir) => {
      return resolvePath(dir);
    });

    await Promise.all(

      scan.map((dir) => {
        return this.scanDir(dir);
      }).concat(
        this.extenionCandidate.map(async (extension) => {
          await this.getExtension(extension);
        }),
      ),
    );

    return Array.from(this.availableExtensions.values());
  }
  private async scanDir(dir: string): Promise<void> {
    getLogger().info('kaitian scanDir', dir);
    try {
      const extensionDirArr = await fs.readdir(dir);
      await Promise.all(extensionDirArr.map((extensionDir) => {
        const extensionPath = path.join(dir, extensionDir);
        return this.getExtension(extensionPath);
      }));
    } catch (e) {
      getLogger().error(e);
    }
  }

  static async getExtension(extensionPath: string, extraMetaData?: ExtraMetaData): Promise<IExtensionMetaData | undefined> {

    // 插件校验逻辑
    const pkgPath = path.join(extensionPath, 'package.json');
    const extendPath = path.join(extensionPath, 'kaitian.js');
    const pkgExist = await fs.pathExists(pkgPath);
    const extendExist = await fs.pathExists(extendPath);

    let pkgCheckResult = pkgExist;
    const extendCheckResult = extendExist;

    if (pkgExist) {
      try {
        const packageJSON = await fs.readJSON(pkgPath);
        if ( !(packageJSON.engines.vscode || packageJSON.engines.kaitian) ) {
          pkgCheckResult = false;
        }
      } catch (e) {
        getLogger().error(e);
        pkgCheckResult = false;
      }
    }

    if ( !(pkgCheckResult || extendCheckResult) ) {
     return;
   }

    const extensionExtraMetaData = {};
    let packageJSON = {} as any;
    try {
      packageJSON = await fs.readJSON(pkgPath);
      if (extraMetaData) {
        for (const extraField of Object.keys(extraMetaData)) {
          try {
            extensionExtraMetaData[extraField] = await fs.readFile(path.join(extensionPath, extraMetaData[extraField]), 'utf-8');
          } catch (e) {
            extensionExtraMetaData[extraField] = null;
          }
        }
      }
    } catch (e) {
      getLogger().error(e);
      return;
    }

    let extendConfig = {};
    if (await fs.pathExists(extendPath)) {
      try {
        extendConfig = require(extendPath);
      } catch (e) {
        getLogger().error(e);
      }
    }

    const extension = {
      // vscode 规范
      id: `${packageJSON.publisher}.${packageJSON.name}`,
      // 使用插件市场的 id
      // 从插件市场下载的插件命名规范为 ${id}-${name}-${version}.zip
      extensionId: path.basename(extensionPath).split('-')[0],
      extendConfig,
      path: extensionPath,
      packageJSON,
      extraMetadata: extensionExtraMetaData,
      realPath: await fs.realpath(extensionPath),
    };
    return extension;
  }

  private isLatestVersion(extension: IExtensionMetaData): boolean {
    if (this.availableExtensions.has(extension.id)) {
      const existedExtension = this.availableExtensions.get(extension.id)!;
      if (!existedExtension.packageJSON) {
        return true;
      }

      const existedPkgJson = existedExtension.packageJSON;
      const incomingPkgJson = extension.packageJSON;
      const compared = semver.compare(existedPkgJson.version, incomingPkgJson.version);

      if (compared === 0) {
        return false;
      // v1 greater
      } else if (compared === 1) {
        return false;
      } else {
      // v2 greater
        return true;
      }
    }

    return true;
  }

  public async getExtension(extensionPath: string, extraMetaData?: ExtraMetaData): Promise<IExtensionMetaData | undefined> {

    if (this.results.has(extensionPath)) {
      return;
    }

    const extension = await ExtensionScanner.getExtension(extensionPath, {
      ...this.extraMetaData,
      ...extraMetaData,
    });

    if (extension) {
      const latest = this.isLatestVersion(extension);
      if (latest) {
        this.availableExtensions.set(extension.id, extension);
      }

      this.results.set(extensionPath, extension);
      return extension;
    }
  }
}
