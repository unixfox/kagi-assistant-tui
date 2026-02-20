import { CliRenderer, createCliRenderer, TextAttributes } from "@opentui/core";
import { createRoot, useKeyboard } from "@opentui/react";
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
  type AssistantThread,
  type AssistantThreadMessage,
} from "./lib/data/kagiClient";
import { initPreferences } from "./lib/data/preferences";
import { copyToClipboard } from "./lib/clipboard";

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

  webSearchEnabled: boolean;
  setWebSearchEnabled: Dispatch<SetStateAction<boolean>>;

  showModelSelectorModal: boolean;
  setShowModelSelectorModal: Dispatch<SetStateAction<boolean>>;

  selectedProfile: AssistantProfile | null;
  setSelectedProfile: Dispatch<SetStateAction<AssistantProfile | null>>;

  messagesBoxFocused: boolean;
  setMessagesBoxFocused: Dispatch<SetStateAction<boolean>>;

  searchFocused: boolean;
  setSearchFocused: Dispatch<SetStateAction<boolean>>;

  messages: AssistantThreadMessage[];
  setMessages: Dispatch<SetStateAction<AssistantThreadMessage[]>>;

  currentThreadTitle: string | null;
  setCurrentThreadTitle: Dispatch<SetStateAction<string | null>>;

  showSidebar: boolean;
  setShowSidebar: Dispatch<SetStateAction<boolean>>;

  currentThreadLoading: boolean;
  setCurrentThreadLoading: Dispatch<SetStateAction<boolean>>;

  threads: Record<string, AssistantThread[]> | null;
  setThreads: Dispatch<
    SetStateAction<Record<string, AssistantThread[]> | null>
  >;
}

const AppContext = createContext<AppContextProps>({} as AppContextProps);

export const useAppContext = () => useContext(AppContext);

export const prefs = await initPreferences();

function App({ renderer }: { renderer: CliRenderer }) {
  const [screen, setScreen] = useState(Screen.Pending);
  const [client, setClient] = useState<AssistantClient | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messageBarFocused, setMessageBarFocused] = useState(true);
  const [showModelSelectorModal, setShowModelSelectorModal] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<AssistantProfile | null>(null);
  const [messagesBoxFocused, setMessagesBoxFocused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [messages, setMessages] = useState<AssistantThreadMessage[]>([]);
  const [currentThreadTitle, setCurrentThreadTitle] = useState<string | null>(
    "New Chat",
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentThreadLoading, setCurrentThreadLoading] = useState(false);
  const [threads, setThreads] = useState<Record<
    string,
    AssistantThread[]
  > | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);

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

  useKeyboard((key) => {
    const { name, ctrl, shift, meta, option } = key;
    const modelShortcut = ctrl && name === "p";
    const webSearchShortcut = ctrl && name === "o";

    if (name === "escape" || (name === "x" && ctrl)) {
      setShowModelSelectorModal(false);
      setMessageBarFocused(false);
      setMessagesBoxFocused(false);
      return;
    }

    if (modelShortcut) {
      setShowModelSelectorModal(true);
      setMessageBarFocused(false);
      setMessagesBoxFocused(false);
      return;
    }

    if (webSearchShortcut) {
      setWebSearchEnabled((prev) => !prev);
      return;
    }

    // Ctrl + G – toggle MessagesBox focus
    if (name === "g" && ctrl && messages.length > 0 && !!currentThreadId) {
      setMessagesBoxFocused((v) => !v);
      return setMessageBarFocused(false);
    }

    // Ctrl + T – toggle MessageBar focus
    if (name === "t" && ctrl) {
      setMessageBarFocused((v) => !v);
      return setMessagesBoxFocused(false);
    }

    // "/" – focus MessageBar (unless already focused)
    if (name === "/" && !messageBarFocused) {
      setMessageBarFocused(true);
      return setMessagesBoxFocused(false);
    }

    if (name === "d" && ctrl) {
      console.log("^d detected. byeeeeeee");
      renderer.stop();
      process.exit(0); // todo make this not shit
      return;
    }

    if (name === "b" && ctrl) {
      setShowSidebar((val) => !val);
      return;
    }

    if (name === "f12") {
      renderer.console.toggle();
      return;
    }

    if (name === "f3") {
      renderer.toggleDebugOverlay();
      return;
    }
  });

  return (
    <>
      {screen === Screen.Pending && <></>}
      {screen === Screen.Onboarding && (
        <Onboarding recheck={checkStateForScreen} />
      )}
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
            currentThreadTitle,
            setCurrentThreadTitle,
            showSidebar,
            setShowSidebar,
            currentThreadLoading,
            setCurrentThreadLoading,
            threads,
            setThreads,
            webSearchEnabled,
            setWebSearchEnabled,
            searchFocused,
            setSearchFocused,
          }}
        >
          <MainScreen />
        </AppContext.Provider>
      )}
    </>
  );
}

const renderer = await createCliRenderer({
  targetFps: 120,
  exitOnCtrlC: true,
  useKittyKeyboard: {
    disambiguate: true,
    alternateKeys: true,
  },
});
renderer.on("selection", (selection) => {
  copyToClipboard(selection?.getSelectedText() ?? "");
});
createRoot(renderer).render(<App renderer={renderer} />);
