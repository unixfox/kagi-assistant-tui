import {
  AssistantThreadMessageRole,
  type AssistantThreadMessage,
} from "../../../lib/data/kagiClient";
import { colors } from "../../../lib/theme";
import Markdown from "../../Markdown";
import "opentui-spinner/react";
import { useAppContext } from "../../..";

const ChatMessageComponent = ({
  message,
}: {
  message: AssistantThreadMessage;
}) => {
  const { webSearchEnabled } = useAppContext();
  const references = message.citations || [];
  const showReferences =
    webSearchEnabled &&
    message.role === AssistantThreadMessageRole.ASSISTANT &&
    references.length > 0;

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
              ? colors.surfaceHighest
              : "transparent"
          }
          paddingLeft={message.role === AssistantThreadMessageRole.USER ? 2 : 1}
          paddingRight={
            message.role === AssistantThreadMessageRole.USER ? 2 : 1
          }
          paddingTop={message.role === AssistantThreadMessageRole.USER ? 1 : 0}
          paddingBottom={
            message.role === AssistantThreadMessageRole.USER ? 1 : 0
          }

          // border={message.role === AssistantThreadMessageRole.USER}
        >
          {message.role === AssistantThreadMessageRole.USER ? (
            <text width="100%" fg="white">
              {message.content}
            </text>
          ) : (
            <>
              {!message.finishedGenerating &&
              message.markdownContent?.trim().length === 0 ? (
                <spinner
                  name="simpleDotsScrolling"
                  color={colors.surfaceHighest}
                />
              ) : (
                <>
                  <Markdown
                    content={message.markdownContent || "*Empty message*"}
                  />
                  <box flexDirection="row" gap={3} opacity={0.5}>
                    {Object.keys(message.metadata || {})
                      .filter((k) =>
                        ["Speed (tok/s)", "Tokens", "Model"].includes(k),
                      )
                      .map((k) => (
                        <text>
                          <strong>{k}</strong>: {(message.metadata || {})[k]}
                        </text>
                      ))}
                  </box>
                  {showReferences && (
                    <box
                      flexDirection="column"
                      marginTop={1}
                      gap={0}
                      paddingLeft={1}
                    >
                      <text>
                        <strong>References</strong>
                      </text>
                      {references.map((citation, index) => {
                        const label = citation.title || citation.url || "Source";
                        const contribution =
                          typeof citation.contribution === "number"
                            ? ` (${citation.contribution}%)`
                            : "";
                        return (
                          <text key={`${message.id}-ref-${index}`}>
                            • {label}
                            {contribution} [^{index + 1}]
                            {citation.url ? ` ${citation.url}` : ""}
                          </text>
                        );
                      })}
                    </box>
                  )}
                </>
              )}
            </>
          )}
        </box>
      </box>
    </box>
  );
};

export default ChatMessageComponent;
