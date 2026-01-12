import { useEffect, useState } from "react";
import {
  AssistantThreadMessageRole,
  type AssistantThreadMessage,
  type MessageDto,
} from "../../../lib/data/kagiClient";
import { useAppContext } from "../../..";
import ChatMessageComponent from "../message";
import MessageBar from "../bar/MessageBar";
import { useKeyboard } from "@opentui/react";

const ChatArea = () => {
  const {
    client,
    currentThreadId,
    messagesBoxFocused,
    setMessagesBoxFocused,
    setMessageBarFocused,
    messages,
    setMessages,
  } = useAppContext();

  useKeyboard((key) => {
    if (key.name === "g" && key.ctrl) {
      setMessagesBoxFocused((val) => !val);
      setMessageBarFocused(false);
    }
  });

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
        if (chunk.header === "messages.json") {
          const dtos: MessageDto[] = JSON.parse(chunk.data);

          for (const dto of dtos) {
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
                markdownContent: dto.md,
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

  return (
    <box
      height="100%"
      width="100%"
      flexGrow={1}
      // border
      paddingLeft={3}
      paddingRight={3}
      flexDirection="column"
    >
      <scrollbox height="100%" width="100%" focused={messagesBoxFocused}>
        {messages.map((msg) => (
          <ChatMessageComponent message={msg} key={msg.id} />
        ))}
      </scrollbox>
      <MessageBar />
    </box>
  );
};

export default ChatArea;
