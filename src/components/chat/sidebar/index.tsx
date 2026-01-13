import { useEffect, useState, useMemo } from "react";
import { type AssistantThread } from "../../../lib/data/kagiClient";
import { useAppContext } from "../../..";
import { useKeyboard } from "@opentui/react";
import ThreadItem from "./ThreadItem";
import SearchBar from "../../SearchBar";

const ChatSidebar = ({ show }: { show: boolean }) => {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const loadThreads = async () => {
    try {
      setThreads(await client.getThreads());
    } catch (e) {
      console.error(`Failed to get threads`, e);
    }
  };

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    if (!threads) return null;

    if (!searchQuery.trim()) return threads;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, AssistantThread[]> = {};

    Object.entries(threads).forEach(([category, threadList]) => {
      const filteredList = threadList.filter(
        (thread) =>
          thread.title.toLowerCase().includes(query) ||
          thread.excerpt.toLowerCase().includes(query),
      );

      if (filteredList.length > 0) {
        filtered[category] = filteredList;
      }
    });

    return Object.keys(filtered).length > 0 ? filtered : null;
  }, [threads, searchQuery]);

  // Flatten threads for navigation (use filtered threads if search is active)
  const flatThreads = useMemo(() => {
    const threadsToUse =
      (searchQuery.trim() ? filteredThreads : threads) || null;
    return threadsToUse ? Object.values(threadsToUse).flat() : [];
  }, [threads, filteredThreads, searchQuery]);

  // Handle keyboard navigation for thread selection
  useKeyboard((key) => {
    if (
      !flatThreads.length ||
      messageBarFocused ||
      showModelSelectorModal ||
      messagesBoxFocused ||
      searchFocused
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

  if (!show) return null;

  return (
    <box
      height="100%"
      width="25%"
      flexDirection="column"
      backgroundColor="#222436"
    >
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchFocused={searchFocused}
        setSearchFocused={setSearchFocused}
        onSubmit={() => {
          // Focus first result when submit is pressed
          const filteredFlatThreads = filteredThreads
            ? Object.values(filteredThreads).flat()
            : [];
          if (filteredFlatThreads.length > 0) {
            setFocusedThreadIndex(0);
            setCurrentThreadId(filteredFlatThreads[0]!.id);
            setSearchFocused(false);
          }
        }}
      />

      {filteredThreads ? (
        <scrollbox height="100%" paddingTop={1}>
          {Object.entries(filteredThreads).map(([category, threadList]) => (
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
                const filteredFlatThreads =
                  Object.values(filteredThreads).flat();
                const isFocused =
                  filteredFlatThreads[focusedThreadIndex]?.id === thread.id;

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
        <box paddingLeft={1} paddingTop={1}>
          <text>
            {searchQuery.trim()
              ? "No threads found matching your search."
              : "Loading threads..."}
          </text>
        </box>
      )}
    </box>
  );
};

export default ChatSidebar;
