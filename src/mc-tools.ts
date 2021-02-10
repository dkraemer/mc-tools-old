import os from 'os';
import path from 'path';
import * as fs from 'fs-extra';
import { McToolsOptions, validateMcToolsOptions } from './mc-tools-options';

export abstract class McToolsBase {
  private readonly tempDirPrefix = 'mc-tools-';
  private readonly envVarOptions = 'MC_TOOLS_OPTIONS';
  private _debugMode = false;

  protected fileOptions: McToolsOptions | undefined;
  protected readonly tempDir: string;
  protected readonly scriptPrefix = 'mc-';
  protected readonly optionsFilename = 'mc-tools.json';
  protected readonly manifestFilename = 'manifest.json';

  protected constructor() {
    const tempDirPrefix = path.join(os.tmpdir(), this.tempDirPrefix);
    this.tempDir = fs.mkdtempSync(tempDirPrefix);

    this.fileOptions = this.tryLoadOptionsFile(path.join(process.cwd(), this.optionsFilename));
    if (!this.fileOptions) {
      this.fileOptions = this.tryLoadOptionsFile(process.env[this.envVarOptions]);
    }
  }

  protected set debugMode(value: boolean | undefined) {
    this._debugMode = value ? true : false;
  }

  protected get debugMode(): boolean | undefined {
    return this._debugMode;
  }

  private tryLoadOptionsFile(filePath: string | undefined): McToolsOptions | undefined {
    if (filePath && fs.existsSync(filePath)) {
      let localOptions: McToolsOptions;

      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        localOptions = require(filePath) as McToolsOptions;
      } catch (error) {
        this.exit(`Unable to load options from ${filePath}`);
        return; // Unreachable, but ts complains otherwise
      }

      if (!validateMcToolsOptions(localOptions)) {
        this.exit(`Invalid options file ${filePath}`);
      }

      return localOptions;
    }
  }

  protected exit(error: Error | string | void): void {
    fs.removeSync(this.tempDir);

    if (error) {
      const message = (typeof error === 'string' || this._debugMode) ? error : error.message;
      console.error(`[ERROR]: ${message}`);
      process.exit(1);
    }

    process.exitCode = 0;
  }

  protected assertPathSync(pathToCheck: string): void {
    if (!fs.existsSync(pathToCheck)) {
      this.exit(`Path not found '${pathToCheck}'`);
    }
  }

  protected assertPathNotExistSync(pathToCheck: string, force: boolean | undefined): void {
    if (fs.existsSync(pathToCheck) && !force) {
      this.exit(`${pathToCheck} exists and option '--force' was not used`);
    }
  }
}
