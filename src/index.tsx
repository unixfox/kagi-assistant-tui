import { createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot } from "@opentui/react";
import Onboarding from "./screens/onboarding";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import MainScreen from "./screens/main";
import { Keychain } from "./lib/data/keychain";
import {
  AssistantClient,
  type AssistantProfile,
  type AssistantThreadMessage,
} from "./lib/data/kagiClient";
import { initPreferences, UserPreferences } from "./lib/data/preferences";

enum Screen {
  Pending,

  Onboarding,
  Main,
}

export interface AppContextProps {
  client: AssistantClient;
  currentThreadId: string | null;
  setCurrentThreadId: Dispatch<SetStateAction<string | null>>;

  messageBarFocused: boolean;
  setMessageBarFocused: Dispatch<SetStateAction<boolean>>;

  showModelSelectorModal: boolean;
  setShowModelSelectorModal: Dispatch<SetStateAction<boolean>>;

  selectedProfile: AssistantProfile | null;
  setSelectedProfile: Dispatch<SetStateAction<AssistantProfile | null>>;

  messagesBoxFocused: boolean;
  setMessagesBoxFocused: Dispatch<SetStateAction<boolean>>;

  messages: AssistantThreadMessage[];
  setMessages: Dispatch<SetStateAction<AssistantThreadMessage[]>>;
}

const AppContext = createContext<AppContextProps>({} as AppContextProps);

export const useAppContext = () => useContext(AppContext);

export const prefs = await initPreferences();

function App() {
  const [screen, setScreen] = useState(Screen.Pending);
  const [client, setClient] = useState<AssistantClient | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messageBarFocused, setMessageBarFocused] = useState(false);
  const [showModelSelectorModal, setShowModelSelectorModal] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<AssistantProfile | null>(null);
  const [messagesBoxFocused, setMessagesBoxFocused] = useState(false);
  const [messages, setMessages] = useState<AssistantThreadMessage[]>([]);

  const checkStateForScreen = async () => {
    const keychain = new Keychain();
    try {
      const tok = await keychain.getToken();
      if (tok) {
        setScreen(Screen.Main);
        setClient(new AssistantClient(tok));
      } else {
        setScreen(Screen.Onboarding);
      }
    } catch (e) {
      console.log("Failed to check keychain. Falling back");
      setScreen(Screen.Onboarding);
    }
  };

  useEffect(() => {
    checkStateForScreen();
  }, []);

  useEffect(() => {
    const selectedProfile: string | null = prefs.get("selected_profile", null);
    if (selectedProfile === null) return;
    console.log(selectedProfile);
    setSelectedProfile(JSON.parse(selectedProfile));
  }, []);

  return (
    <>
      {screen === Screen.Pending && <></>}
      {screen === Screen.Onboarding && <Onboarding />}
      {screen === Screen.Main && client && (
        <AppContext.Provider
          value={{
            client,
            currentThreadId,
            setCurrentThreadId,
            messageBarFocused,
            setMessageBarFocused,
            showModelSelectorModal,
            setShowModelSelectorModal,
            selectedProfile,
            setSelectedProfile,
            messagesBoxFocused,
            setMessagesBoxFocused,
            messages,
            setMessages,
          }}
        >
          <MainScreen />
        </AppContext.Provider>
      )}
    </>
  );
}

const renderer = await createCliRenderer({
  targetFps: 30,
});
renderer.console.toggle();

createRoot(renderer).render(<App />);
