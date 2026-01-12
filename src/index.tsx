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
import { AssistantClient } from "./lib/data/kagiClient";

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
}

const AppContext = createContext<AppContextProps>({} as AppContextProps);

export const useAppContext = () => useContext(AppContext);

function App() {
  const [screen, setScreen] = useState(Screen.Pending);
  const [client, setClient] = useState<AssistantClient | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messageBarFocused, setMessageBarFocused] = useState(false);

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
// renderer.console.toggle();

createRoot(renderer).render(<App />);
