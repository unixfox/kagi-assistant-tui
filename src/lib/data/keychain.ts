import { chmodSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

const CONFIG_DIR = `${process.env.HOME || "."}/.config/kagi-assistant-tui`;
const TOKEN_PATH = `${CONFIG_DIR}/session_token`;

type StorageMode = "keychain" | "file";

export class Keychain {
  private service = "space-httpjames-kagi-assistant-tui";
  private account = "kagi_session_token";
  private mode: StorageMode;

  constructor() {
    this.mode = process.platform === "darwin" ? "keychain" : "file";
  }

  /**
   * Stores the Kagi session token.
   * Uses macOS Keychain when available, otherwise a file in ~/.config.
   */
  async setToken(token: string): Promise<boolean> {
    return this.mode === "keychain"
      ? this.setTokenKeychain(token)
      : this.setTokenFile(token);
  }

  /**
   * Retrieves the Kagi session token or null when it cannot be found.
   */
  async getToken(): Promise<string | null> {
    return this.mode === "keychain"
      ? this.getTokenKeychain()
      : this.getTokenFile();
  }

  /**
   * Removes the token from whichever backend is active.
   */
  async deleteToken(): Promise<boolean> {
    return this.mode === "keychain"
      ? this.deleteTokenKeychain()
      : this.deleteTokenFile();
  }

  private async setTokenKeychain(token: string): Promise<boolean> {
    const proc = Bun.spawn([
      "security",
      "add-generic-password",
      "-s",
      this.service,
      "-a",
      this.account,
      "-w",
      token,
      "-U",
    ]);

    await proc.exited;
    return proc.exitCode === 0;
  }

  private async getTokenKeychain(): Promise<string | null> {
    const proc = Bun.spawn(
      [
        "security",
        "find-generic-password",
        "-s",
        this.service,
        "-a",
        this.account,
        "-w",
      ],
      {
        stderr: "ignore",
      },
    );

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    return proc.exitCode === 0 ? output.trim() : null;
  }

  private async deleteTokenKeychain(): Promise<boolean> {
    const proc = Bun.spawn(
      [
        "security",
        "delete-generic-password",
        "-s",
        this.service,
        "-a",
        this.account,
      ],
      {
        stderr: "ignore",
      },
    );

    await proc.exited;
    return proc.exitCode === 0;
  }

  private ensureFileStorage(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    const dir = dirname(TOKEN_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  private async setTokenFile(token: string): Promise<boolean> {
    this.ensureFileStorage();
    await Bun.write(TOKEN_PATH, token);
    try {
      chmodSync(TOKEN_PATH, 0o600);
    } catch (error) {
      console.warn("Failed to set permissions for token file", error);
    }
    return true;
  }

  private async getTokenFile(): Promise<string | null> {
    this.ensureFileStorage();
    const file = Bun.file(TOKEN_PATH);
    if (!(await file.exists())) {
      return null;
    }
    const token = (await file.text()).trim();
    return token || null;
  }

  private async deleteTokenFile(): Promise<boolean> {
    if (!existsSync(TOKEN_PATH)) {
      return true;
    }

    try {
      unlinkSync(TOKEN_PATH);
      return true;
    } catch (error) {
      console.error("Failed to remove token file", error);
      return false;
    }
  }
}
