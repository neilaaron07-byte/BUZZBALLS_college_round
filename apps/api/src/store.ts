import { copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface RepositoryOptions<T> {
  filePath: string;
  initial: T | (() => T | Promise<T>);
}

export class JsonRepository<T> {
  readonly filePath: string;
  private readonly backupPath: string;
  private readonly initial: T | (() => T | Promise<T>);
  private queue: Promise<unknown> = Promise.resolve();

  constructor(options: RepositoryOptions<T>) {
    this.filePath = options.filePath;
    this.backupPath = `${options.filePath}.bak`;
    this.initial = options.initial;
  }

  async read(): Promise<T> {
    try {
      return this.parse(await readFile(this.filePath, "utf8"));
    } catch (error) {
      if (!this.isMissing(error)) {
        try {
          const backup = this.parse(await readFile(this.backupPath, "utf8"));
          await this.atomicWrite(backup, false);
          return backup;
        } catch {
          await this.recoverCorruptFile();
        }
      }
      const value = await this.initialValue();
      await this.atomicWrite(value);
      return value;
    }
  }

  async write(value: T): Promise<T> {
    await this.enqueue(() => this.atomicWrite(value));
    return value;
  }

  async update(mutator: (current: T) => T | Promise<T>): Promise<T> {
    let result!: T;
    await this.enqueue(async () => {
      const current = await this.readUnlocked();
      result = await mutator(current);
      await this.atomicWrite(result);
    });
    return result;
  }

  private async readUnlocked(): Promise<T> {
    return this.read();
  }

  private parse(contents: string): T {
    const value: unknown = JSON.parse(contents);
    if (value === null || typeof value !== "object") throw new Error("Repository root must be an object.");
    return value as T;
  }

  private async initialValue(): Promise<T> {
    return typeof this.initial === "function" ? await (this.initial as () => T | Promise<T>)() : structuredClone(this.initial);
  }

  private async atomicWrite(value: T, preserveBackup = false): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = join(dirname(this.filePath), `.${this.filePath.split("/").pop() ?? "state"}.${process.pid}.${Date.now()}.tmp`);
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    try {
      if (!preserveBackup) try { await copyFile(this.filePath, this.backupPath); } catch { /* first write has no backup */ }
      await writeFile(temporaryPath, serialized, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    } finally {
      try { await unlink(temporaryPath); } catch { /* already renamed */ }
    }
  }

  private async recoverCorruptFile(): Promise<void> {
    try {
      await rename(this.filePath, `${this.filePath}.corrupt-${Date.now()}`);
    } catch {
      // A missing file is recovered by the initial seed on the next read.
    }
  }

  private isMissing(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.queue.then(operation, operation);
    this.queue = next.catch(() => undefined);
    await next;
  }
}
