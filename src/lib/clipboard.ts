import { spawn, spawnSync } from "bun";

type ClipboardBackend = {
  command: string;
  args?: string[];
};

function hasCommand(command: string): boolean {
  try {
    return Boolean(Bun.which(command));
  } catch {
    return false;
  }
}

function resolveClipboardBackend(): ClipboardBackend | null {
  if (process.platform === "darwin") {
    return hasCommand("pbcopy") ? { command: "pbcopy" } : null;
  }

  if (process.platform === "win32") {
    return hasCommand("clip.exe") ? { command: "clip.exe" } : null;
  }

  const linuxCandidates: ClipboardBackend[] = [
    { command: "wl-copy" },
    { command: "xclip", args: ["-selection", "clipboard"] },
    { command: "xsel", args: ["--clipboard", "--input"] },
  ];

  for (const candidate of linuxCandidates) {
    if (hasCommand(candidate.command)) {
      return candidate;
    }
  }

  return null;
}

export function copyToClipboard(text: string): void {
  const backend = resolveClipboardBackend();
  if (!backend) {
    console.warn(
      "No clipboard executable found. Install wl-copy, xclip, xsel, or use a platform with pbcopy/clip.exe.",
    );
    return;
  }

  const proc = spawn([backend.command, ...(backend.args ?? [])], { stdin: "pipe" });
  proc.stdin.write(text);
  proc.stdin.end();
}

export async function saveClipboardImage(destPath: string) {
  if (process.platform !== "darwin") {
    throw new Error("clipboard image saving is only supported on macOS");
  }
  // This script converts whatever image is in the clipboard to a PNG
  const script = `
    use framework "AppKit"
    set thePasteboard to current application's NSPasteboard's generalPasteboard()
    set theImage to current application's NSImage's alloc()'s initWithPasteboard:thePasteboard
    if theImage is missing value then return "no image"

    set theTiffData to theImage's TIFFRepresentation()
    set theBitmap to current application's NSBitmapImageRep's imageRepWithData:theTiffData
    set theData to theBitmap's representationUsingType:(current application's NSJPEGFileType) |properties|:{NSImageCompressionFactor:0.8}
    theData's writeToFile:"${destPath}" atomically:true
    return "success"
  `;
  const result = spawnSync(["osascript", "-l", "AppleScript", "-e", script]);
  const output = result.stdout.toString().trim();
  if (output !== "success") {
    throw new Error("failed to save clipboard image with osascript");
  }
}
