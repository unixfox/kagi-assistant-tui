import { useKeyboard } from "@opentui/react";
import { useRef, useState } from "react";
import { useAppContext } from "../../..";

const MessageBar = () => {
  const textareaRef = useRef<any>(null);
  const { messageBarFocused, setMessageBarFocused } = useAppContext();

  useKeyboard((key) => {
    if (key.name === "t" && key.ctrl) {
      setMessageBarFocused((val) => !val);
    }

    if (key.name === "return" && key.ctrl) {
      const value = textareaRef.current?.plainText;
      console.log(value);
      textareaRef.current?.clear();
    }
  });

  return (
    <box backgroundColor="#222436" marginBottom={1}>
      <box flexDirection="row" gap={1} padding={1}>
        <box height="100%" width={1} backgroundColor="#C098FF" />
        <textarea
          ref={textareaRef}
          width="100%"
          minHeight={5}
          placeholder="Ask Assistant..."
          focused={messageBarFocused}
        ></textarea>
      </box>
    </box>
  );
};

export default MessageBar;
