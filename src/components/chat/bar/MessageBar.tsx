import { tmpdir } from "node:os";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import * as cheerio from "cheerio";
import { prefs, useAppContext } from "../../..";
import {
  AssistantThreadMessageRole,
  type KagiPromptRequest,
  type AssistantThreadMessage,
  type Citation,
  type MessageDto,
  type MultipartAssistantPromptFile,
} from "../../../lib/data/kagiClient";
import type { SubmitEvent } from "@opentui/core";
import {
  convertDetailsToBlockquote,
  preprocessCodeBlocks,
} from "../../../lib/preprocess";
import turndownService from "../../../lib/tdown";
import { Keychain } from "../../../lib/data/keychain";
import { colors } from "../../../lib/theme";
import { randomUUID } from "node:crypto";
import { saveClipboardImage } from "../../../lib/clipboard";
import { join } from "node:path";
import { createThumbnailFromImage } from "../../../lib/thumbs";
function parseReferencesHtml(html: string): Citation[] {
  const $ = cheerio.load(html);
  return $("ol[data-ref-list] > li > a[href]")
    .map((_, el) => ({
      url: $(el).attr("href") || "",
      title: $(el).text() || "",
    }))
    .get();
}

function parseMetadata(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const metadata: Record<string, string> = {};
  $("li").each((_, el) => {
    const key = $(el).find("span.attribute").text() || "";
    const value = $(el).find("span.value").text() || "";
    if (key) metadata[key] = value;
  });
  return metadata;
}

enum MessageBarAttachmentSource {
  CLIPBOARD,
}

interface MessageBarAttachment {
  name: string;
  path: string;
  source: MessageBarAttachmentSource;
  sizeBytes: number;
  thumbnailPath: string;
}

const MessageBar = () => {
  const textareaRef = useRef<any>(null);
  const currentThreadIdRef = useRef<string | null>(null);

  // Destructure all necessary state from context
  const {
    messageBarFocused,
    setShowModelSelectorModal,
    selectedProfile,
    setCurrentThreadTitle,
    setCurrentThreadId,
    setMessages,
    messages,
    currentThreadId,
    client,
    setThreads,
  } = useAppContext();
  const messagesRef = useRef(messages);
  const selectedProfileRef = useRef(selectedProfile);

  const [attachments, setAttachments] = useState<MessageBarAttachment[]>([]);

  const attachmentsRef = useRef(attachments);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedProfileRef.current = selectedProfile;
  }, [selectedProfile]);

  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  // Core logic adapted from Kotlin MainViewModel.sendMessage
  const handleSendMessage = async (text: string) => {
    if (!text.trim() && !attachmentsRef.current.length) return;

    setAttachments([]);

    // 1. Setup IDs
    let messageId = crypto.randomUUID();
    let inProgressId = `${messageId}.reply`;
    let currentInProgressId = inProgressId; // Mutable tracker for ID updates during stream

    const messages = messagesRef.current;
    const selectedProfile = selectedProfileRef.current;
    // Get context from previous messages
    const assistantMessages = messages.filter(
      (m: AssistantThreadMessage) =>
        m.role === AssistantThreadMessageRole.ASSISTANT,
    );
    const latestAssistantMessageId =
      assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1].id
        : null;

    const lastMessage =
      messages.length > 0 ? messages[messages.length - 1] : null;
    const branchIds = lastMessage?.branchIds || [];
    const branchId =
      branchIds.length > 0 ? branchIds[branchIds.length - 1] : null;

    // 2. Optimistic Update: Add User Message and Empty Assistant Placeholder
    const userMsg: AssistantThreadMessage = {
      id: messageId,
      content: text,
      role: AssistantThreadMessageRole.USER,
      branchIds: branchIds,
    };

    const assistantMsg: AssistantThreadMessage = {
      id: inProgressId,
      content: "",
      role: AssistantThreadMessageRole.ASSISTANT,
      branchIds: branchIds,
      markdownContent: "",
      metadata: {},
      finishedGenerating: false,
    };

    setMessages((prev: AssistantThreadMessage[]) => [
      ...prev,
      userMsg,
      assistantMsg,
    ]);

    // 3. Prepare Request Body
    const requestBody: KagiPromptRequest = {
      focus: {
        thread_id: currentThreadIdRef.current,
        message_id: latestAssistantMessageId?.replace(".reply", "") || null,
        prompt: text.trim(),
        branch_id: branchId || "00000000-0000-0000-4000-000000000000",
      },
      profile: {
        id: selectedProfile?.id || null,
        internet_access: false, // Defaulting based on typical usage, could be a toggle
        lens_id: null,
        model: selectedProfile?.model || "Kagi Assistant", // Fallback
        personalizations: false,
      },
      threads: currentThreadIdRef.current
        ? undefined
        : [
            {
              tag_ids: [],
              saved: true, // Assuming default to saved chat
              shared: false,
            },
          ],
    };

    if (requestBody.focus.message_id === null) {
      delete requestBody["focus"]["message_id"];
    }

    // 4. Start Streaming
    // Note: Assuming standard prompt URL. Regeneration logic would check editingMessageId here.
    const url = "https://kagi.com/assistant/prompt";
    const jsonString = JSON.stringify(requestBody);

    console.log(`sending ${jsonString}`);

    try {
      let stream;
      if (attachmentsRef.current.length > 0) {
        const multipartFiles = attachmentsRef.current.map((a) => {
          const f = Bun.file(a.path);
          let nf: MultipartAssistantPromptFile = {
            file: f,
            mime: f.type,
          };

          if (f.type.startsWith("image/")) {
            nf.thumbnail = Bun.file(a.thumbnailPath);
          }

          return nf;
        });

        stream = client.sendMultipartRequest(url, requestBody, multipartFiles);
      } else {
        stream = client.fetchStream(url, jsonString, "POST", {
          "Content-Type": "application/json",
        });
      }

      // Helper to update specific message in state safely
      const updateMessageById = (
        targetId: string,
        updater: (msg: AssistantThreadMessage) => AssistantThreadMessage,
      ) => {
        setMessages((prev: AssistantThreadMessage[]) =>
          prev.map((msg) => (msg.id === targetId ? updater(msg) : msg)),
        );
      };

      for await (const chunk of stream) {
        if (chunk.header === "tokens.json") {
          // Streaming text tokens
          const json = JSON.parse(chunk.data);
          const newText = json.text || "";
          const incomingId = json.id || "";
          const targetId = `${incomingId}.reply`;

          const md = turndownService.turndown(
            await preprocessCodeBlocks(
              await convertDetailsToBlockquote(newText),
            ),
          );

          updateMessageById(targetId, (msg) => ({
            ...msg,
            content: newText,
            markdownContent: md,
          }));
        } else if (chunk.header === "thread_list.html") {
          const threads = client.parseThreadListHtml(chunk.data);
          setThreads(threads);
        } else if (chunk.header === "new_message.json") {
          // Final message confirmation
          const dto = JSON.parse(chunk.data) as MessageDto;

          // 1. Update User Message ID with real server ID
          updateMessageById(messageId, (msg) => ({ ...msg, id: dto.id }));

          const newInProgressId = `${dto.id}.reply`;

          // 2. Update Assistant Placeholder ID
          updateMessageById(currentInProgressId, (msg) => ({
            ...msg,
            id: newInProgressId,
          }));

          // Update local trackers
          messageId = dto.id;
          currentInProgressId = newInProgressId;

          // 3. If done, update final content, citations, and metadata
          if (dto.state === "done") {
            const citations = parseReferencesHtml(dto.references_html || "");
            const metadata = parseMetadata(dto.metadata || "");

            updateMessageById(newInProgressId, (msg) => ({
              ...msg,
              content: dto.reply || msg.content,
              citations: citations,
              markdownContent: dto.md,
              metadata: metadata,
            }));
          }
        } else if (chunk.header === "thread.json") {
          // Thread creation/update info
          const json = JSON.parse(chunk.data);
          setCurrentThreadId(json.id);
          setCurrentThreadTitle(json.title);
          setThreads((prev) => {
            if (!prev) return prev;
            return Object.fromEntries(
              Object.entries(prev).map(([category, threads]) => [
                category,
                threads.map((thread) =>
                  thread.id === json.id
                    ? { ...thread, title: json.title }
                    : thread,
                ),
              ]),
            );
          });
        } else if (chunk.header === "location.json") {
          // Branch ID updates
          const json = JSON.parse(chunk.data);
          const newBranchId = json.branch_id;
          if (newBranchId) {
            updateMessageById(currentInProgressId, (msg) => {
              if (!msg.branchIds?.includes(newBranchId)) {
                return {
                  ...msg,
                  branchIds: [...(msg.branchIds || []), newBranchId],
                };
              }
              return msg;
            });
          }
        }

        // Handle done state
        if (chunk.done) {
          updateMessageById(currentInProgressId, (msg) => ({
            ...msg,
            finishedGenerating: true,
          }));
        }
      }
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  const newChat = () => {
    setCurrentThreadId(null);
    setMessages([]);
    setCurrentThreadTitle("New Chat");
    setAttachments([]);
  };

  const handlePasteImage = async () => {
    const dir = tmpdir();
    const uuid = randomUUID();
    const out = join(dir, uuid + ".jpg");
    try {
      await saveClipboardImage(out);
    } catch (e) {
      console.error(
        "Failed to save clipboard image. Probably never had one anyways.",
      );
      return;
    }

    const f = Bun.file(out);
    const size = f.size;

    const sum =
      attachments.reduce((acc, curr) => acc + curr.sizeBytes, 0) + size;

    if (sum >= 16 * 1000 * 1000) {
      return;
    }

    const thumbnailPath = join(dir, `${randomUUID()}.webp`);

    if (out.endsWith(".jpg")) {
      try {
        await createThumbnailFromImage(out, thumbnailPath);
      } catch (e) {
        console.error(`Failed to create thumbnail for ${out}.`);
      }
    }

    setAttachments((prev) => [
      ...prev,
      {
        name: `clipboard-${attachments.filter((a) => a.source === MessageBarAttachmentSource.CLIPBOARD).length}.jpg`,
        path: out,
        source: MessageBarAttachmentSource.CLIPBOARD,
        sizeBytes: size,
        thumbnailPath,
      },
    ]);
  };

  useKeyboard((key) => {
    if (key.name === "o" && key.ctrl) {
      newChat();
      return;
    }

    if (!messageBarFocused) return;

    if (key.name === "c" && key.ctrl) {
      if (textareaRef.current) {
        textareaRef.current.clear();
      }
      return;
    }

    if (key.name === "backspace" && textareaRef.current.plainText.length <= 0) {
      setAttachments((prev) => prev.slice(0, -1));
      return;
    }

    if (key.name === "v" && key.ctrl) {
      handlePasteImage();
    }
  });

  const handleSubmit = (e: SubmitEvent) => {
    const value = textareaRef.current?.plainText;

    if (value === "/model") {
      setShowModelSelectorModal(true);
    } else if (value === "/new") {
      newChat();
    } else if (value === "/logout") {
      client.deleteSession().then(() => {
        prefs.clear();
        new Keychain().deleteToken().then(() => {
          process.exit(0);
        });
      });
    } else {
      // Call the implementation
      handleSendMessage(value);
    }

    textareaRef.current?.clear();
  };

  return (
    <box marginBottom={2} flexDirection="column">
      <box width="100%" flexDirection="row" gap={1} height={1}>
        {attachments.map((a) => (
          <box
            key={a.name}
            backgroundColor="#FF966C"
            justifyContent="center"
            alignItems="center"
          >
            <text fg="black">
              <strong>[{a.name}]</strong>
            </text>
          </box>
        ))}
      </box>

      <box
        backgroundColor={colors.surface}
        flexDirection="row"
        gap={1}
        minHeight={5}
        marginBottom={1}
        marginTop={1}
      >
        <box height="100%" width={1} backgroundColor={colors.primaryAlt} />
        <box height="100%" width="100%" padding={1}>
          <textarea
            keyBindings={[
              { name: "return", action: "submit" },
              { name: "return", shift: true, action: "newline" },
              {
                name: "backspace",
                meta: true,
                action: "delete-word-backward",
              },
            ]}
            onSubmit={(e) => handleSubmit(e)}
            ref={textareaRef}
            width="100%"
            maxHeight={10}
            placeholder="Ask Assistant..."
            focused={messageBarFocused}
          />
        </box>
      </box>
      <box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        marginBottom={1}
      >
        <box width="90%">
          {selectedProfile && (
            <text>
              <strong>Model</strong>:{selectedProfile?.family}{" "}
              {selectedProfile?.name}{" "}
              <span fg={colors.textSecondary}>(ctrl+m)</span>
            </text>
          )}
        </box>
        <box flexDirection="row" justifyContent="flex-end">
          <text>
            Paste <span fg={colors.textSecondary}>(ctrl+v)</span>
          </text>
        </box>
      </box>
    </box>
  );
};

export default MessageBar;
