import { useEffect, useState, useMemo, useRef } from "react";
import { type AssistantThread } from "../../../lib/data/kagiClient";
import { useAppContext } from "../../..";
import { useKeyboard } from "@opentui/react";
import ThreadItem from "./ThreadItem";
import SearchBar from "../../SearchBar";
import {
  convertDetailsToBlockquote,
  preprocessCodeBlocks,
} from "../../../lib/preprocess";
import {
  AssistantThreadMessageRole,
  type AssistantThreadMessage,
  type MessageDto,
} from "../../../lib/data/kagiClient";
import turndownService from "../../../lib/tdown";
import "opentui-spinner/react";
import { colors } from "../../../lib/theme";

const ChatSidebar = ({ show }: { show: boolean }) => {
  const {
    client,
    setCurrentThreadId,
    currentThreadId,
    messageBarFocused,
    showModelSelectorModal,
    messagesBoxFocused,
    setMessages,
    setCurrentThreadTitle,
    setCurrentThreadLoading,
    threads,
    setThreads,
  } = useAppContext();

  const [focusedThreadIndex, setFocusedThreadIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const scrollBoxRef = useRef<any>(null);
  const activeItemRef = useRef<any>(null);

  useEffect(() => {
    const scroll = scrollBoxRef.current;
    const target = activeItemRef.current;
    if (!scroll || !target) return;
    // Calculate the target's Y relative to the scrollbox's internal content
    // We use the absolute Y of both to find the relative offset
    const relativeY = target.y - scroll.y;
    const targetHeight = target.height || 3; // ThreadItem height + margin
    if (relativeY + targetHeight > scroll.height) {
      // Scroll down: item is below the visible viewport
      scroll.scrollBy(relativeY + targetHeight - scroll.height);
    } else if (relativeY < 0) {
      // Scroll up: item is above the visible viewport
      scroll.scrollBy(relativeY);

      // Optional: Snap to top if it's the very first item in the flat list
      if (focusedThreadIndex === 0) {
        scroll.scrollTo(0);
      }
    }
  }, [focusedThreadIndex]);

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

  const isTarget = !(
    messageBarFocused ||
    showModelSelectorModal ||
    messagesBoxFocused ||
    searchFocused
  );
  // Handle keyboard navigation for thread selection
  useKeyboard((key) => {
    if (!flatThreads.length || !isTarget) return;

    if (key.name === "up" || key.name === "k") {
      setFocusedThreadIndex((prev) => Math.max(0, prev - 1));
    } else if (key.name === "down" || key.name === "j") {
      setFocusedThreadIndex((prev) =>
        Math.min(flatThreads.length - 1, prev + 1),
      );
    } else if (key.name === "return") {
      const thread = flatThreads[focusedThreadIndex];
      if (!thread) return;
      setCurrentThreadId(thread.id);
      setCurrentThreadTitle(thread.title);
      loadThread(thread.id);
    }
  });

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThread = async (currentThreadId: string) => {
    setCurrentThreadLoading(true);
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
    } finally {
      setCurrentThreadLoading(false);
    }
  };

  if (!show) return null;

  return (
    <box
      height="100%"
      width="25%"
      flexDirection="column"
      backgroundColor={colors.surface}
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
        <scrollbox
          height="100%"
          paddingTop={1}
          ref={scrollBoxRef}
          viewportCulling
          scrollbarOptions={{
            trackOptions: {
              backgroundColor: "transparent",
            },
          }}
        >
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
                    ref={isFocused ? activeItemRef : undefined}
                    key={thread.id}
                    thread={thread}
                    isHovering={isFocused && isTarget}
                    isSelected={isSelected}
                    onClick={() => {
                      console.log(`thread ${thread.id} just got clicked`);
                      setCurrentThreadId(thread.id);
                      loadThread(thread.id);
                    }}
                  />
                );
              })}
            </box>
          ))}
        </scrollbox>
      ) : (
        <box
          paddingLeft={1}
          paddingTop={1}
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          {searchQuery.trim() ? (
            <text>No threads found.</text>
          ) : (
            <spinner name="bouncingBall" color="#5B6097" />
          )}
        </box>
      )}
    </box>
  );
};

export default ChatSidebar;
