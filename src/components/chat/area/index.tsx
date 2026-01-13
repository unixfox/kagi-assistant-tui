import { useEffect, useState, useRef, useCallback } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import {
  AssistantThreadMessageRole,
  type AssistantThreadMessage,
  type MessageDto,
} from "../../../lib/data/kagiClient";
import { useAppContext } from "../../..";
import { useKeyboard } from "@opentui/react";
import ChatMessageComponent from "../message";
import MessageBar from "../bar/MessageBar";
import {
  convertDetailsToBlockquote,
  preprocessCodeBlocks,
} from "../../../lib/preprocess";
import TurndownService from "turndown";
import EmptyChatAreaPlaceholder from "./EmptyChatAreaPlaceholder";

const turndownService = new TurndownService();

const ChatArea = () => {
  const {
    client,
    currentThreadId,
    currentThreadTitle,
    setCurrentThreadTitle,
    messagesBoxFocused,
    messages,
    setMessages,
  } = useAppContext();
  const scrollboxRef = useRef<ScrollBoxRenderable>(null);
  const lastGPressTime = useRef<number>(0);
  const G_TIMEOUT = 500; // Time window in ms for "gg" detection

  const scrollToBottom = useCallback(() => {
    if (scrollboxRef.current) {
      scrollboxRef.current.scrollTo({
        x: 0,
        y: scrollboxRef.current.scrollHeight,
      });
    }
  }, []);

  const scrollToTop = useCallback(() => {
    if (scrollboxRef.current) {
      scrollboxRef.current.scrollTo({ x: 0, y: 0 });
    }
  }, []);

  const loadThread = async () => {
    setMessages([]);
    try {
      const stream = client.fetchStream(
        "https://kagi.com/assistant/thread_open",
        JSON.stringify({ focus: { thread_id: currentThreadId } }),
        "POST",
        { "Content-Type": "application/json" },
      );

      for await (const chunk of stream) {
        if (chunk.header === "thread.json") {
          const json = JSON.parse(chunk.data);
          if (json.id) {
            setCurrentThreadTitle(json.title);
          }
        }

        if (chunk.header === "messages.json") {
          const dtos: MessageDto[] = JSON.parse(chunk.data);

          for (const dto of dtos) {
            const md = turndownService.turndown(
              await preprocessCodeBlocks(
                await convertDetailsToBlockquote(dto.reply || ""),
              ),
            );
            console.log(md);

            setMessages((prev) => [
              ...prev,
              {
                id: dto.id,
                content: dto.prompt,
                role: AssistantThreadMessageRole.USER,
                documents: [],
                branchIds: dto.branch_list,
                finishedGenerating: true,
                markdownContent: dto.prompt,
              } as AssistantThreadMessage,
              {
                id: `${dto.id}.reply`,
                content: dto.reply,
                role: AssistantThreadMessageRole.ASSISTANT,
                citations: [],
                documents: [],
                branchIds: dto.branch_list,
                finishedGenerating: true,
                markdownContent: md,
                // markdownContent: dto.md,
              } as AssistantThreadMessage,
            ]);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch stream for thread_open", e);
    }
  };

  useEffect(() => {
    if (currentThreadId === null) {
      setMessages([]);
      return;
    }
    loadThread();
  }, [currentThreadId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Handle keyboard shortcuts for scrolling
  useKeyboard((key) => {
    if (!messagesBoxFocused) return;

    if (key.name === "g") {
      const now = Date.now();
      const timeSinceLastG = now - lastGPressTime.current;

      if (timeSinceLastG < G_TIMEOUT) {
        // Double press "gg" - scroll to top
        scrollToTop();
        lastGPressTime.current = 0;
      } else {
        // First press - record time
        lastGPressTime.current = now;
        // Also scroll to bottom on single G press (vim-like behavior)
        scrollToBottom();
      }
    }
  });

  return (
    <box
      height="100%"
      width="100%"
      flexGrow={1}
      // border
      flexDirection="column"
    >
      <box
        width="100%"
        height={3}
        backgroundColor="#222436"
        alignItems="center"
        flexDirection="row"
        padding={1}
      >
        <text width="100%">
          <strong>{currentThreadTitle}</strong>
        </text>
      </box>
      <box paddingLeft={3} paddingRight={3} flexGrow={1}>
        <scrollbox
          ref={scrollboxRef}
          height="100%"
          width="100%"
          focused={messagesBoxFocused}
          flexGrow={1}
        >
          {messages.map((msg) => (
            <ChatMessageComponent message={msg} key={msg.id} />
          ))}
          {messages.length === 0 && <EmptyChatAreaPlaceholder />}
        </scrollbox>
        <MessageBar />
      </box>
    </box>
  );
};

export default ChatArea;
