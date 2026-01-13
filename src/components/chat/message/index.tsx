import {
  AssistantThreadMessageRole,
  type AssistantThreadMessage,
} from "../../../lib/data/kagiClient";
import Markdown from "../../Markdown";

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
          width={
            message.role === AssistantThreadMessageRole.USER ? "50%" : "100%"
          }
          backgroundColor={
            message.role === AssistantThreadMessageRole.USER
              ? "#5C5A6F"
              : "transparent"
          }
          paddingLeft={1}
          paddingRight={1}
          border={message.role === AssistantThreadMessageRole.USER}
        >
          {message.role === AssistantThreadMessageRole.USER ? (
            <text width="100%">{message.content}</text>
          ) : (
            <Markdown content={message.markdownContent || "*Empty message*"} />
          )}
        </box>
      </box>
    </box>
  );
};

export default ChatMessageComponent;
