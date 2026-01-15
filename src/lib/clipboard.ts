import { spawn, spawnSync } from "bun";

export function copyToClipboard(text: string): void {
  const proc = spawn(["pbcopy"], { stdin: "pipe" }); // macOS
  // const proc = spawn(["xclip", "-selection", "clipboard"], { stdin: "pipe" }); // Linux with xclip
  // const proc = spawn(["wl-copy"], { stdin: "pipe" }); // Wayland
  proc.stdin.write(text);
  proc.stdin.end();
}

export async function saveClipboardImage(destPath: string) {
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
