import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { colors } from "../lib/theme";

interface ButtonProps {
  label?: string;
  variant?: "primary" | "secondary";
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  focused?: boolean;
  style?: any;
}

const CustomButton = ({
  label = "Button",
  variant = "primary",
  size = "medium",
  onClick,
  focused = false,
  style = {},
}: ButtonProps) => {
  const [isPressed, setIsPressed] = useState(false);

  useKeyboard((key) => {
    if (focused && key.name === "return") {
      setIsPressed(true);
      onClick?.();
      setTimeout(() => setIsPressed(false), 100);
    }
  });

  const sizeStyles = {
    small: { minHeight: 2, paddingX: 2 },
    medium: { minHeight: 3, paddingX: 3 },
    large: { minHeight: 4, paddingX: 4 },
  };

  const variantStyles = {
    primary: {
      backgroundColor: isPressed ? colors.primaryAlt : colors.primary,
      borderColor: isPressed ? colors.primaryAlt : colors.primaryBorder,
    },
    secondary: {
      backgroundColor: isPressed ? "#374151" : "#6b7280",
      borderColor: isPressed ? "#374151" : "#4b5563",
    },
  };

  return (
    <box
      border
      borderStyle="single"
      alignItems="center"
      justifyContent="center"
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      <text fg="#000000">{label}</text>
    </box>
  );
};

export default CustomButton;
