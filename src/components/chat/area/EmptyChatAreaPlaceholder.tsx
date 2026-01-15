import { colors } from "../../../lib/theme";

const SHORTCUTS: { [key: string]: string[] } = {
  "new chat": ["ctrl", "g"],
  "select model": ["ctrl", "m"],
  "search chats": ["ctrl", "f"],
  "focus messages box": ["ctrl", "g"],
  "toggle sidebar": ["ctrl", "b"],
  "focus input": ["/"],
};

const EmptyChatAreaPlaceholder = () => {
  return (
    <box height="100%" width="100%" justifyContent="center" alignItems="center">
      <box opacity={0.75}>
        <box
          flexDirection="column"
          gap={1}
          backgroundColor={colors.surface}
          padding={3}
        >
          {Object.keys(SHORTCUTS).map((s) => (
            <text key={s}>
              <span>{s}</span>{" "}
              <span fg={colors.textSecondaryHigh}>
                {SHORTCUTS[s]!.join("+")}
              </span>
            </text>
          ))}
        </box>
      </box>
    </box>
  );
};

export default EmptyChatAreaPlaceholder;
