import { useMemo } from "react";
import { type AssistantThread } from "../../../lib/data/kagiClient";
import { forwardRef } from "react";
import { colors } from "../../../lib/theme";
interface ThreadItemProps {
  thread: AssistantThread;
  isHovering: boolean;
  isSelected: boolean;
  onClick?: () => void;
}

const PREVIEW_SIZE = 30;

const ThreadItem = forwardRef(
  ({ thread, isHovering, isSelected }: ThreadItemProps, ref) => {
    const backgroundColor = useMemo(() => {
      if (isSelected) {
        return colors.surfaceHighest;
      }

      if (isHovering) {
        return colors.surfaceHighestMuted;
      }

      return "transparent";
    }, [isHovering, isSelected]);

    return (
      <box
        ref={ref}
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
  },
);

export default ThreadItem;
