import { useAppContext } from "../..";
import ChatArea from "../../components/chat/area";
import ChatSidebar from "../../components/chat/sidebar";
import ModelSelectorModal from "../../components/modals/ModelSelectorModal";

const MainScreen = () => {
  const { showModelSelectorModal, showSidebar } = useAppContext();
  return (
    <>
      <box
        height="100%"
        width="100%"
        flexDirection="row"
        backgroundColor={"#1A1B26"}
      >
        <ModelSelectorModal show={showModelSelectorModal} />
        <ChatSidebar show={showSidebar} />
        <ChatArea />
      </box>
    </>
  );
};

export default MainScreen;
