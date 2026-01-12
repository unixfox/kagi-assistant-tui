import { useKeyboard } from "@opentui/react";
import { useRef, useState } from "react";
import { useAppContext } from "../../..";

const MessageBar = () => {
  const textareaRef = useRef<any>(null);
  const {
    messageBarFocused,
    setMessageBarFocused,
    setShowModelSelectorModal,
    selectedProfile,
    setMessagesBoxFocused,
  } = useAppContext();

  useKeyboard((key) => {
    if (key.name === "t" && key.ctrl) {
      setMessageBarFocused((val) => !val);
      setMessagesBoxFocused(false);
    }

    if (key.name === "/" && !messageBarFocused) {
      setMessageBarFocused(true);
      setMessagesBoxFocused(false);
    }

    if (key.name === "return" && key.ctrl) {
      const value = textareaRef.current?.plainText;
      console.log(value);
      if (value === "/model") {
        setShowModelSelectorModal(true);
      }
      textareaRef.current?.clear();
    }
  });

  return (
    <box marginBottom={1}>
      <box backgroundColor="#222436" flexDirection="row" gap={1} padding={1}>
        <box height="100%" width={1} backgroundColor="#C098FF" />
        <textarea
          ref={textareaRef}
          width="100%"
          minHeight={5}
          placeholder="Ask Assistant..."
          focused={messageBarFocused}
        ></textarea>
      </box>
      {selectedProfile && (
        <text>
          <strong>Model</strong>:{selectedProfile?.family}{" "}
          {selectedProfile?.name}
        </text>
      )}
    </box>
  );
};

export default MessageBar;
