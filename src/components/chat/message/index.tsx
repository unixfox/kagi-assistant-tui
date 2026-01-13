import {
  AssistantThreadMessageRole,
  type AssistantThreadMessage,
} from "../../../lib/data/kagiClient";
import Markdown from "../../Markdown";
import "opentui-spinner/react";

const ChatMessageComponent = ({
  message,
}: {
  message: AssistantThreadMessage;
}) => {
  return (
    <box width="100%" flexDirection="column" padding={1}>
      <box
        width="100%"
        flexDirection="row"
        justifyContent={
          message.role === AssistantThreadMessageRole.USER
            ? "flex-end"
            : "flex-start"
        }
      >
        <box
          maxWidth={
            message.role === AssistantThreadMessageRole.USER ? "50%" : "100%"
          }
          minWidth={
            message.role === AssistantThreadMessageRole.USER ? "30%" : "100%"
          }
          backgroundColor={
            message.role === AssistantThreadMessageRole.USER
              ? "#5B6097"
              : "transparent"
          }
          paddingLeft={1}
          paddingRight={1}
          border={message.role === AssistantThreadMessageRole.USER}
        >
          {message.role === AssistantThreadMessageRole.USER ? (
            <text width="100%" fg="white">
              {message.content}
            </text>
          ) : (
            <>
              {!message.finishedGenerating &&
              message.markdownContent?.trim().length === 0 ? (
                <spinner name="simpleDotsScrolling" color="#5B6097" />
              ) : (
                <Markdown
                  content={message.markdownContent || "*Empty message*"}
                />
              )}
            </>
          )}
        </box>
      </box>
    </box>
  );
};

export default ChatMessageComponent;
