import open from "open";
import { useEffect, useRef, useState } from "react";
import CustomButton from "../../components/Button";
import {
  AssistantClient,
  type QrRemoteSessionDetails,
} from "../../lib/data/kagiClient";
import { Keychain } from "../../lib/data/keychain";

const Onboarding = () => {
  const tClient = new AssistantClient("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

      process.exit(0);
    } catch (e) {
      console.log("Nothing yet");
    }
  };

  return (
    <box alignItems="center" justifyContent="center" height="100%" width="100%">
      <box border padding={3} width={80}>
        <ascii-font font="tiny" text="Kagi Assistant" alignSelf="center" />
        <CustomButton
          label="Sign in"
          variant="primary"
          size="medium"
          onClick={handleSignIn}
          focused={true}
          style={{ marginTop: 2 }}
        />
        <text marginTop={2} alignSelf="center">
          Your chats will be synced to this device.
        </text>
      </box>
    </box>
  );
};

export default Onboarding;
