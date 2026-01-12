/**
 * UserPreferences - A simple key-value store for user preferences
 *
 * Stores preferences in a JSON config file in the user's home directory.
 * Provides a simple interface for getting, setting, and deleting preferences.
 */

export class UserPreferences {
  private configPath: string;
  private data: Record<string, unknown>;
  private dirty: boolean;

  /**
   * Creates a new UserPreferences instance
   * @param configName - Name of the config file (without .json extension)
   * @param configDir - Optional directory path for config file. Defaults to ~/.config/kagi-assistant-tui
   */
  constructor(configName: string = "preferences", configDir?: string) {
    const defaultConfigDir = `${process.env.HOME}/.config/kagi-assistant-tui`;
    const dir = configDir || defaultConfigDir;

    // Create config directory if it doesn't exist
    const { existsSync, mkdirSync } = require("node:fs");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.configPath = `${dir}/${configName}.json`;
    this.data = {};
    this.dirty = false;
  }

  /**
   * Initialize the preferences store by loading from disk
   */
  async init(): Promise<void> {
    await this.load();
  }

  /**
   * Load preferences from the config file
   */
  private async load(): Promise<void> {
    try {
      const file = Bun.file(this.configPath);

      if (await file.exists()) {
        const content = await file.text();
        this.data = JSON.parse(content);
      } else {
        this.data = {};
      }
    } catch (error) {
      console.error(
        `Failed to load preferences from ${this.configPath}:`,
        error,
      );
      this.data = {};
    }

    this.dirty = false;
  }

  /**
   * Save preferences to the config file
   */
  async save(): Promise<void> {
    if (!this.dirty) {
      return;
    }

    try {
      const content = JSON.stringify(this.data, null, 2);
      await Bun.write(this.configPath, content);
      this.dirty = false;
    } catch (error) {
      console.error(`Failed to save preferences to ${this.configPath}:`, error);
      throw error;
    }
  }

  /**
   * Get a preference value
   * @param key - The preference key
   * @param defaultValue - Default value if key doesn't exist
   * @returns The preference value or default value
   */
  get<T = unknown>(key: string, defaultValue?: T): T {
    const value = this.data[key];
    return value !== undefined ? (value as T) : (defaultValue as T);
  }

  /**
   * Set a preference value
   * @param key - The preference key
   * @param value - The value to set
   */
  set<T = unknown>(key: string, value: T): void {
    this.data[key] = value;
    this.dirty = true;
  }

  /**
   * Delete a preference
   * @param key - The preference key to delete
   */
  delete(key: string): void {
    if (key in this.data) {
      delete this.data[key];
      this.dirty = true;
    }
  }

  /**
   * Check if a preference key exists
   * @param key - The preference key
   * @returns True if the key exists
   */
  has(key: string): boolean {
    return key in this.data;
  }

  /**
   * Clear all preferences
   */
  clear(): void {
    this.data = {};
    this.dirty = true;
  }

  /**
   * Get all preferences as an object
   * @returns All preferences
   */
  all(): Record<string, unknown> {
    return { ...this.data };
  }

  /**
   * Get the number of stored preferences
   * @returns The count of preferences
   */
  get size(): number {
    return Object.keys(this.data).length;
  }

  /**
   * Check if there are unsaved changes
   * @returns True if there are unsaved changes
   */
  get hasUnsavedChanges(): boolean {
    return this.dirty;
  }
}

// Singleton instance for convenient access
let preferencesInstance: UserPreferences | null = null;

/**
 * Get or create the singleton UserPreferences instance
 * @param configName - Optional config name (only used on first call)
 * @param configDir - Optional config directory (only used on first call)
 * @returns The UserPreferences singleton instance
 */
export function getPreferences(
  configName?: string,
  configDir?: string,
): UserPreferences {
  if (!preferencesInstance) {
    preferencesInstance = new UserPreferences(configName, configDir);
  }
  return preferencesInstance;
}

/**
 * Initialize the preferences singleton
 * @param configName - Optional config name
 * @param configDir - Optional config directory
 * @returns The initialized UserPreferences instance
 */
export async function initPreferences(
  configName?: string,
  configDir?: string,
): Promise<UserPreferences> {
  const prefs = getPreferences(configName, configDir);
  await prefs.init();
  return prefs;
}
