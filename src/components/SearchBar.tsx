import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useKeyboard } from "@opentui/react";
import { removeLastWord } from "../lib/manip";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  searchFocused: boolean;
  setSearchFocused: (focused: boolean) => void;
  onSubmit?: () => void;
}

const SearchBar = ({
  searchQuery,
  setSearchQuery,
  searchFocused,
  setSearchFocused,
  onSubmit,
}: SearchBarProps) => {
  const keyHandledRef = useRef(false);

  useKeyboard((key) => {
    if (key.ctrl && key.name === "f") {
      setSearchFocused(true);
      return;
    }

    if (searchFocused && key.name === "escape") {
      setSearchFocused(false);
      return;
    }

    if (
      searchFocused &&
      ((key.name === "c" && key.ctrl) || (key.raw === "\x15" && key.ctrl))
    ) {
      setSearchQuery("");
    }

    if (key.name === "backspace" && key.option && searchFocused) {
      keyHandledRef.current = true;
      setSearchQuery((old) => removeLastWord(old));
      setTimeout(() => (keyHandledRef.current = false), 0);
    }
  });

  return (
    <box
      style={{
        border: true,
        borderStyle: "single",
        borderColor: "white",
        backgroundColor: "#5B6097",
        height: 3,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <input
        placeholder=" 🔍 Search threads..."
        value={searchQuery}
        onInput={(v) => {
          if (!keyHandledRef.current) setSearchQuery(v);
        }}
        focused={searchFocused}
        onSubmit={onSubmit}
        width="100%"
        backgroundColor="#5B6097"
        placeholderColor="#ccc"
        height={1}
      />
    </box>
  );
};

export default SearchBar;
