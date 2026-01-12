import ChatArea from "../../components/chat/area";
import ChatSidebar from "../../components/chat/sidebar";
import type { AssistantClient } from "../../lib/data/kagiClient";

const MainScreen = () => {
  return (
    <>
      <box
        height="100%"
        width="100%"
        flexDirection="row"
        backgroundColor={"#18181A"}
      >
        <ChatSidebar />
        <ChatArea />
      </box>
    </>
  );
};

export default MainScreen;
