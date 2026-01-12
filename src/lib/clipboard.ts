import { spawn } from "bun";

export function copyToClipboard(text: string): void {
  const proc = spawn(["pbcopy"], { stdin: "pipe" }); // macOS
  // const proc = spawn(["xclip", "-selection", "clipboard"], { stdin: "pipe" }); // Linux with xclip
  // const proc = spawn(["wl-copy"], { stdin: "pipe" }); // Wayland
  proc.stdin.write(text);
  proc.stdin.end();
}
