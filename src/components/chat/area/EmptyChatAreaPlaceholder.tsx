const EmptyChatAreaPlaceholder = () => {
  return (
    <box height="100%" width="100%" justifyContent="center" alignItems="center">
      <box opacity={0.75}>
        <box flexDirection="column" alignItems="center" gap={1}>
          <text>
            ctrl+o <strong bg="#3b3c52">new chat</strong>
          </text>
          <text>
            ctrl+m <strong bg="#3b3c52">select model</strong>
          </text>
          <text>
            ctrl+g <strong bg="#3b3c52">focus messages box</strong>
          </text>
          <text>
            ctrl+f <strong bg="#3b3c52">search chats</strong>
          </text>
          <text>
            / <strong bg="#3b3c52">focus input</strong>
          </text>
        </box>
      </box>
    </box>
  );
};

export default EmptyChatAreaPlaceholder;
