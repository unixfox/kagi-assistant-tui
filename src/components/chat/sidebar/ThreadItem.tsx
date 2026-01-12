import { useMemo, useState } from "react";
import { type AssistantThread } from "../../../lib/data/kagiClient";
import { useKeyboard } from "@opentui/react";

interface ThreadItemProps {
  thread: AssistantThread;
  isHovering: boolean;
  isSelected: boolean;
  onClick?: () => void;
  focused?: boolean;
}

const PREVIEW_SIZE = 30;

const ThreadItem = ({ thread, isHovering, isSelected, onClick, focused = false }: ThreadItemProps) => {
  const backgroundColor = useMemo(() => {
    if (isSelected) {
      return "#5D5A6F";
    }

    if (isHovering) {
      return "#393742";
    }

    return "transparent";
  }, [isHovering, isSelected]);

  useKeyboard((key) => {
    if (focused && key.name === "return") {
      onClick?.();
    }
  });

  return (
    <box
      style={{
        padding: 1,
        backgroundColor,
      }}
    >
      <text>
        <strong>{thread.title}</strong>
      </text>
      <text>
        {thread.excerpt.substring(0, PREVIEW_SIZE)}
        {thread.excerpt.length > PREVIEW_SIZE ? "..." : ""}
      </text>
    </box>
  );
};

export default ThreadItem;
