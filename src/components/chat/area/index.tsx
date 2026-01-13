import { useEffect, useState, useRef, useCallback } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useAppContext } from "../../..";
import { useKeyboard } from "@opentui/react";
import ChatMessageComponent from "../message";
import MessageBar from "../bar/MessageBar";
import EmptyChatAreaPlaceholder from "./EmptyChatAreaPlaceholder";

const ChatArea = () => {
  const {
    currentThreadId,
    currentThreadTitle,
    messagesBoxFocused,
    messages,
    setMessages,
  } = useAppContext();
  const scrollboxRef = useRef<ScrollBoxRenderable>(null);
  const loadedThreadIdRef = useRef<string | null>(null);
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

  useEffect(() => {
    if (currentThreadId === null) {
      setMessages([]);
      loadedThreadIdRef.current = null;
      return;
    }
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
