import { useEffect, useState } from "react";
import { type AssistantThread } from "../../../lib/data/kagiClient";
import { useAppContext } from "../../..";
import { useKeyboard } from "@opentui/react";
import ThreadItem from "./ThreadItem";

const ChatSidebar = () => {
  const {
    client,
    setCurrentThreadId,
    currentThreadId,
    messageBarFocused,
    showModelSelectorModal,
    messagesBoxFocused,
  } = useAppContext();

  const [threads, setThreads] = useState<Record<
    string,
    AssistantThread[]
  > | null>(null);
  const [focusedThreadIndex, setFocusedThreadIndex] = useState(0);

  const loadThreads = async () => {
    try {
      setThreads(await client.getThreads());
    } catch (e) {
      console.error(`Failed to get threads`, e);
    }
  };

  // Flatten threads for navigation
  const flatThreads = threads ? Object.values(threads).flat() : [];

  // Handle keyboard navigation for thread selection
  useKeyboard((key) => {
    if (
      !flatThreads.length ||
      messageBarFocused ||
      showModelSelectorModal ||
      messagesBoxFocused
    )
      return;

    if (key.name === "up" || key.name === "k") {
      setFocusedThreadIndex((prev) => Math.max(0, prev - 1));
    } else if (key.name === "down" || key.name === "j") {
      setFocusedThreadIndex((prev) =>
        Math.min(flatThreads.length - 1, prev + 1),
      );
    } else if (key.name === "return") {
      const focusedThread = flatThreads[focusedThreadIndex];
      if (focusedThread) {
        setCurrentThreadId(focusedThread.id);
      }
    }
  });

  useEffect(() => {
    loadThreads();
  }, []);

  return (
    <box
      height="100%"
      width="25%"
      flexDirection="column"
      backgroundColor="#222436"
    >
      <box paddingTop={2}></box>

      {threads ? (
        <scrollbox height="100%" paddingTop={1}>
          {Object.entries(threads).map(([category, threadList]) => (
            <box
              key={category}
              flexDirection="column"
              paddingLeft={1}
              paddingRight={1}
              paddingBottom={1}
            >
              <text style={{ marginBottom: 1 }}>{category}</text>
              {threadList.map((thread) => {
                const isSelected = currentThreadId === thread.id;
                const isFocused =
                  flatThreads[focusedThreadIndex]?.id === thread.id;

                return (
                  <ThreadItem
                    key={thread.id}
                    thread={thread}
                    isHovering={isFocused}
                    isSelected={isSelected}
                    onClick={() => setCurrentThreadId(thread.id)}
                  />
                );
              })}
            </box>
          ))}
        </scrollbox>
      ) : (
        <></>
      )}
    </box>
  );
};

export default ChatSidebar;
