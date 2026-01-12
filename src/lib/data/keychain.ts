export class Keychain {
  private service = "space-httpjames-kagi-assistant-tui";
  private account = "kagi_session_token";

  /**
   * Stores the Kagi session token.
   * Uses -U to update the entry if it already exists.
   */
  async setToken(token: string): Promise<boolean> {
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

  /**
   * Retrieves the Kagi session token.
   * Returns null if not found or access is denied.
   */
  async getToken(): Promise<string | null> {
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

  /**
   * Removes the token from the Keychain.
   */
  async deleteToken(): Promise<boolean> {
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
}
