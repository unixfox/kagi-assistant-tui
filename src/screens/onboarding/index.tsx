import open from "open";
import { useEffect, useRef, useState } from "react";
import CustomButton from "../../components/Button";
import {
  AssistantClient,
  type QrRemoteSessionDetails,
} from "../../lib/data/kagiClient";
import { Keychain } from "../../lib/data/keychain";
import { colors } from "../../lib/theme";

const Onboarding = ({ recheck }: { recheck: () => void }) => {
  const tClient = new AssistantClient("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [checking, setChecking] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSignIn = async () => {
    console.log("Sign in clicked!");
    const sess = await tClient.getQrRemoteSession();
    console.log("Sess details stored temporarily");
    console.log(sess);
    const userUrl = `https://kagi.com/settings/qr_authorize?t=${sess.token}`;
    open(userUrl);

    if (timerRef.current) clearInterval(timerRef.current);

    setChecking(true);
    // Pass 'sess' directly so the function has the fresh data
    timerRef.current = setInterval(() => checkCeremony(sess), 1000);
  };

  const checkCeremony = async (sess: QrRemoteSessionDetails) => {
    try {
      const res = await tClient.checkQrRemoteSession(sess);
      console.log(res);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const keychain = new Keychain();
      await keychain.setToken(res);
      console.log("Stored kagi token in keychain");

      recheck();
    } catch (e) {
      console.log("Nothing yet");
    }
  };

  return (
    <box alignItems="center" justifyContent="center" height="100%" width="100%">
      <box flexDirection="column" justifyContent="center" width={80}>
        <box padding={3} backgroundColor={colors.background}>
          <ascii-font font="tiny" text="Kagi Assistant" alignSelf="center" />
          <CustomButton
            label="Sign in"
            variant="primary"
            size="medium"
            onClick={handleSignIn}
            focused={true}
            style={{ marginTop: 2 }}
            loading={checking}
          />
        </box>
        <box
          flexDirection="row"
          width="100%"
          justifyContent="center"
          marginTop={1}
        >
          <box flexDirection="row" gap={1}>
            <text>Kagi Assistant TUI</text>
            <text>•</text>
            <text>© 2025 httpjames.space</text>
          </box>
        </box>
      </box>
    </box>
  );
};

export default Onboarding;
