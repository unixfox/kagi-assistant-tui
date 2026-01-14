import type { HeadersInit } from "bun";
import * as cheerio from "cheerio";

// --- Types & Interfaces ---

export interface AssistantThread {
  id: string;
  title: string;
  excerpt: string;
}

export enum AssistantThreadMessageRole {
  ASSISTANT = "ASSISTANT",
  USER = "USER",
}

export interface Citation {
  url: string;
  title: string;
}

export interface AssistantThreadMessage {
  id: string;
  content: string;
  role: AssistantThreadMessageRole;
  citations?: Citation[];
  documents?: AssistantThreadMessageDocument[];
  branchIds?: string[];
  finishedGenerating?: boolean;
  markdownContent?: string | null;
  metadata?: Record<string, string>;
}

export interface MessageDto {
  id: string;
  prompt?: string;
  reply?: string;
  documents?: DocumentDto[];
  branch_list?: string[];
  references_html?: string;
  md?: string | null;
  metadata?: string;
  state?: string;
}

export interface DocumentDto {
  id: string;
  name: string;
  mime: string;
  data?: string | null;
}

export interface AssistantThreadMessageDocument {
  id: string;
  name: string;
  mime: string;
  data?: string | null; // Base64 or URL
}

export interface KagiPromptRequest {
  focus: {
    thread_id: string | null;
    message_id?: string | null;
    prompt: string;
    branch_id: string | null;
  };
  profile: {
    id: string | null;
    internet_access: boolean;
    lens_id: string | null;
    model: string;
    personalizations: boolean;
  };
  threads?: {
    tag_ids: string[];
    saved: boolean;
    shared: boolean;
  }[];
}

export interface StreamChunk {
  header: string;
  data: string;
  done: boolean;
}

export interface QrRemoteSessionDetails {
  csrfToken: string;
  token: string;
}

export interface KagiCompanion {
  id: string;
  name: string;
  data: string; // SVG string
}

export interface MultipartAssistantPromptFile {
  file: File; // Bun/Web File object
  thumbnail?: File;
  mime: string;
}

export interface AssistantProfile {
  name: string;
  id: string;
  description: string;
  avatar: string; // url
  color: string;
  family: string;
  model: string;
  // Add other fields as necessary from the JSON response
}

// --- Client Implementation ---

export class AssistantClient {
  private sessionToken: string;
  private baseUrl = "https://kagi.com";

  private get headers(): HeadersInit {
    return {
      origin: "https://kagi.com",
      referer: "https://kagi.com/assistant",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      accept: "application/vnd.kagi.stream",
      "cache-control": "no-cache",
      cookie: `kagi_session=${this.extractToken(this.sessionToken)}`,
    };
  }

  constructor(sessionToken: string) {
    this.sessionToken = sessionToken;
  }

  getSessionToken(): string {
    return this.extractToken(this.sessionToken);
  }

  private extractToken(raw: string): string {
    // Simple logic to mimic Kotlin's substringAfter/Before
    const tokenMatch = raw.match(/token=([^&]+)/);
    return tokenMatch ? tokenMatch[1] || "" : raw;
  }

  /**
   * Gets QR Session details for login flow
   */
  async getQrRemoteSession(): Promise<QrRemoteSessionDetails> {
    const response = await fetch(`${this.baseUrl}/signin`);
    if (!response.ok) throw new Error("Failed to get QR remote session");

    const html = await response.text();
    const $ = cheerio.load(html);
    const el = $("#qr-code-auth");

    const token = el.attr("data-token");
    const csrfToken = el.attr("data-csrf");

    if (!token || !csrfToken) throw new Error("Failed to parse QR tokens");

    return { csrfToken, token };
  }

  async getAccountEmailAddress(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/settings/change_email`, {
      headers: this.headers,
    });
    if (!response.ok) return "";

    const html = await response.text();
    const $ = cheerio.load(html);
    return $("._0_pass_field").attr("value") || "";
  }

  async deleteSession(): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/logout`, {
      headers: this.headers,
    });
    return response.ok;
  }

  async checkQrRemoteSession(details: QrRemoteSessionDetails): Promise<string> {
    const body = JSON.stringify({ n: details.token });
    const response = await fetch(`${this.baseUrl}/login/qr_remote`, {
      method: "POST",
      body: body,
      headers: {
        "content-type": "application/json",
        "x-csrf-token": details.csrfToken,
      },
    });

    if (!response.ok) throw new Error("Failed to check QR remote session");

    const text = await response.text();
    if (text !== "OK") throw new Error("Not authorized yet");

    // Parse Set-Cookie header
    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) throw new Error("No Set-Cookie header found");

    // Simple parse for kagi_session
    const match = setCookie.match(/kagi_session=([^;]+)/);
    if (match && match[1]) {
      return match[1];
    }

    throw new Error("Failed to extract session cookie");
  }

  async deleteChat(threadId: string): Promise<void> {
    const stream = this.fetchStream(
      `${this.baseUrl}/assistant/thread_delete`,
      JSON.stringify({
        threads: [
          {
            id: threadId,
            title: ".",
            saved: true,
            shared: false,
            tag_ids: [],
          },
        ],
      }),
      "POST",
      { "Content-Type": "application/json" },
    );

    // Consume stream
    for await (const _ of stream) {
      /* empty */
    }
  }

  async getKagiCompanions(): Promise<KagiCompanion[]> {
    const response = await fetch(`${this.baseUrl}/settings/companions`, {
      headers: this.headers,
    });
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);

    return $(".friends-card")
      .map((_, el) => {
        const $el = $(el);
        return {
          id: $el.find("input[name='companion_id']").attr("value") || "",
          name: $el.find("h3").text() || "",
          data: $el.find("svg").prop("outerHTML") || "<svg></svg>",
        } as KagiCompanion;
      })
      .get();
  }

  async checkAuthentication(): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/settings/assistant`, {
      headers: this.headers,
    });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes("custom_instructions_input");
  }

  async getProfiles(): Promise<AssistantProfile[]> {
    const profiles: AssistantProfile[] = [];

    const stream = this.fetchStream(
      `${this.baseUrl}/assistant/profile_list`,
      "{}",
      "POST",
      { "Content-Type": "application/json" },
    );

    for await (const chunk of stream) {
      if (chunk.header === "profiles.json") {
        try {
          const parsed = JSON.parse(chunk.data);
          // if (parsed.profiles && Array.isArray(parsed.profiles)) {
          //   profiles.push(...parsed.profiles);
          // }

          for (const profile of parsed.profiles) {
            profiles.push({
              id: profile.id,
              name: profile.name,
              description: decodeHTMLEntities(
                (await extractModelInfoDescription(profile.model_info)) || "",
              ),

              avatar: "",
              color: "",
              family: profile.family,
              model: profile.model,
            });
          }
        } catch (e) {
          console.error("Error parsing profiles JSON", e);
        }
      }
    }

    // Sorting logic (Kagi family first) mimics Kotlin implementation
    return profiles.sort((a, b) => {
      const aIsKagi = a.family?.toLowerCase() === "kagi";
      const bIsKagi = b.family?.toLowerCase() === "kagi";
      return aIsKagi === bIsKagi ? 0 : aIsKagi ? -1 : 1;
    });
  }

  async getThreads(): Promise<Record<string, AssistantThread[]> | null> {
    const stream = this.fetchStream(
      `${this.baseUrl}/assistant/thread_list`,
      "{}",
      "POST",
      { "Content-Type": "application/json" },
    );

    for await (const chunk of stream) {
      if (chunk.header === "thread_list.html") {
        return this.parseThreadListHtml(chunk.data);
      }
    }
    return null;
  }

  /**
   * Specialized multipart request handler for file uploads
   */
  async *sendMultipartRequest(
    url: string,
    requestBody: KagiPromptRequest,
    files: MultipartAssistantPromptFile[],
  ): AsyncGenerator<StreamChunk> {
    const formData = new FormData();

    // Add JSON state
    formData.append("state", JSON.stringify(requestBody));

    // Add files
    files.forEach((f) => {
      formData.append("file", f.file, f.file.name);
      if (f.thumbnail) {
        formData.append("__kagithumbnail", f.thumbnail, "blob");
      }
    });

    // Fetch allows passing FormData directly
    // Note: Do NOT set Content-Type header manually for FormData; browser/bun sets boundary
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        // Remove content-type so fetch sets the boundary
      },
      body: formData,
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    yield* this.streamLoop(response.body);
  }

  /**
   * Main streaming fetch wrapper
   */
  async *fetchStream(
    url: string,
    body: string | null = null,
    method: string = "POST",
    extraHeaders: Record<string, string> = {},
  ): AsyncGenerator<StreamChunk> {
    const reqHeaders = { ...this.headers, ...extraHeaders };

    console.log(reqHeaders);

    const response = await fetch(url, {
      method: method,
      headers: reqHeaders,
      body: body,
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    yield* this.streamLoop(response.body);
  }

  /**
   * Parses the Kagi custom stream format: [Header][:][Body][\0]
   */
  private async *streamLoop(
    stream: ReadableStream<Uint8Array>,
  ): AsyncGenerator<StreamChunk> {
    const reader = stream.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = new Uint8Array(0);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new chunk to buffer
        const newBuffer = new Uint8Array(buffer.length + value.length);
        newBuffer.set(buffer);
        newBuffer.set(value, buffer.length);
        buffer = newBuffer;

        // Process buffer for delimiters
        while (true) {
          // Find null terminator
          const nullIndex = buffer.indexOf(0); // 0 is '\0'
          if (nullIndex === -1) break; // Incomplete chunk, wait for more data

          // We have a full packet. Find the colon within this packet.
          // Note: indexOf in JS doesn't support start/end range cleanly on Uint8Array
          // like Okio, so we slice.
          const packet = buffer.subarray(0, nullIndex);
          const colonIndex = packet.indexOf(58); // 58 is ':'

          if (colonIndex !== -1) {
            const headerBytes = packet.subarray(0, colonIndex);
            const bodyBytes = packet.subarray(colonIndex + 1);

            const header = decoder.decode(headerBytes).trim();
            const body = decoder.decode(bodyBytes);

            yield { header, data: body, done: false };
          }

          // Advance buffer past the processed packet and the null terminator
          buffer = buffer.subarray(nullIndex + 1);
        }
      }
      yield { header: "", data: "", done: true };
    } finally {
      reader.releaseLock();
    }
  }

  // --- HTML Parsing Helpers ---

  public parseThreadListHtml(html: string): Record<string, AssistantThread[]> {
    const threadMap: Record<string, AssistantThread[]> = {};
    const $ = cheerio.load(html);

    let currentHeader = "Threads";

    $(
      ".hide-if-no-threads .thread-list-header, .hide-if-no-threads .thread",
    ).each((_, el) => {
      const $el = $(el);

      if ($el.hasClass("thread-list-header")) {
        currentHeader = $el.text().trim();
      } else if ($el.hasClass("thread")) {
        const title = $el.find(".title").text().trim();
        const excerpt = $el.find(".excerpt").text().trim();
        const id = $el.attr("data-code") || "";

        if (!threadMap[currentHeader]) {
          threadMap[currentHeader] = [];
        }

        threadMap[currentHeader].push({
          id,
          title,
          excerpt,
        });
      }
    });

    return threadMap;
  }
}

// Helper to parse metadata from HTML snippet (translation of Kotlin global function)
export function parseMetadata(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const metadata: Record<string, string> = {};

  $("li").each((_, el) => {
    const key = $(el).find("span.attribute").text() || "";
    const value = $(el).find("span.value").text() || "";
    if (key) metadata[key] = value;
  });

  return metadata;
}

async function extractModelInfoDescription(
  html: string,
): Promise<string | null> {
  let firstParagraphText: string | null = null;
  let isInsideFirstP = false;
  const rewriter = new HTMLRewriter().on("p", {
    element() {
      // Only capture the first <p> we encounter
      if (firstParagraphText === null) {
        isInsideFirstP = true;
        firstParagraphText = "";
      }
    },
    text(text) {
      if (isInsideFirstP) {
        firstParagraphText += text.text;
        // Stop capturing once we reach the end of the text chunks for this element
        if (text.lastInTextNode) {
          isInsideFirstP = false;
        }
      }
    },
  });
  await rewriter.transform(new Response(html)).text();
  return firstParagraphText?.trim() ?? null;
}
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    "&#39;": "'",
    "&quot;": '"',
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
  };
  return text.replace(
    /&#39;|&quot;|&amp;|&lt;|&gt;|&nbsp;/g,
    (match) => entities[match],
  );
}
