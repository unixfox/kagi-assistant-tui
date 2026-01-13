import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import * as cheerio from "cheerio";
import { useAppContext } from "../../..";
import {
  AssistantThreadMessageRole,
  type KagiPromptRequest,
  type AssistantThreadMessage,
  type Citation,
  type MessageDto,
} from "../../../lib/data/kagiClient";
import type { SubmitEvent } from "@opentui/core";
import TurndownService from "turndown";
import {
  convertDetailsToBlockquote,
  preprocessCodeBlocks,
} from "../../../lib/preprocess";
import turndownService from "../../../lib/tdown";

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

// --- Component ---

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
  } = useAppContext();

  // Keep the ref in sync with the state
  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  // Core logic adapted from Kotlin MainViewModel.sendMessage
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // 1. Setup IDs
    let messageId = crypto.randomUUID();
    let inProgressId = `${messageId}.reply`;
    let currentInProgressId = inProgressId; // Mutable tracker for ID updates during stream

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
      const stream = client.fetchStream(url, jsonString, "POST", {
        "Content-Type": "application/json",
      });

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
        console.log(chunk);
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
          if (json.id && !currentThreadId) {
            // Only set the thread ID if we don't have one yet (new chat)
            // This prevents unnecessary re-loads when sending messages in existing threads
            setCurrentThreadId(json.id);
            setCurrentThreadTitle(json.title);
          }
          // Always update the title even if thread ID hasn't changed
          if (json.id && currentThreadId) {
            setCurrentThreadTitle(json.title);
          }
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
  };

  useKeyboard((key) => {
    if (key.name === "o" && key.ctrl) {
      newChat();
      return;
    }

    if (key.name === "c" && key.ctrl && messageBarFocused) {
      if (textareaRef.current) {
        textareaRef.current.clear();
      }
    }

    if (key.raw === "\x7F" && messageBarFocused) {
      textareaRef.current.deleteWordBackward();
    }
  });

  const handleSubmit = (e: SubmitEvent) => {
    const value = textareaRef.current?.plainText;

    if (value === "/model") {
      setShowModelSelectorModal(true);
    } else if (value === "/new") {
      newChat();
    } else {
      // Call the implementation
      handleSendMessage(value);
    }

    textareaRef.current?.clear();
  };

  return (
    <box marginBottom={2}>
      <box
        backgroundColor="#222436"
        flexDirection="row"
        gap={1}
        minHeight={5}
        marginBottom={1}
      >
        <box height="100%" width={1} backgroundColor="#C098FF" />
        <box height="100%" width="100%" padding={1}>
          <textarea
            keyBindings={[
              { name: "return", action: "submit" },
              { name: "return", shift: true, action: "newline" },
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
      {selectedProfile && (
        <text>
          <strong>Model</strong>:{selectedProfile?.family}{" "}
          {selectedProfile?.name}
        </text>
      )}
    </box>
  );
};

export default MessageBar;
