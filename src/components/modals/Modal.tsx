import type { ReactNode } from "react";
import { colors } from "../../lib/theme";

interface ModalProps {
  children: ReactNode;
  show: boolean;
}

const Modal = (props: ModalProps) => {
  if (!props.show) return null;

  return (
    <>
      <box
        style={{
          height: "100%",
          width: "100%",
          zIndex: 99,
          position: "absolute",
          left: 0,
          top: 0,
          backgroundColor: "#00000066",
        }}
      />
      <box
        style={{
          position: "absolute",
          left: "50%",
          top: "30%",
          width: 60,
          height: 30,
          marginLeft: -30,
          marginTop: -7,
          backgroundColor: colors.surface,
          paddingTop: 2,
          paddingBottom: 2,
          paddingLeft: 5,
          paddingRight: 5,
          zIndex: 100,
        }}
      >
        {props.children}
      </box>
    </>
  );
};

export default Modal;
