import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useKeyboard } from "@opentui/react";
import { removeLastWord } from "../lib/manip";
import { colors } from "../lib/theme";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  searchFocused: boolean;
  setSearchFocused: Dispatch<SetStateAction<boolean>>;
  setMessageBarFocused: Dispatch<SetStateAction<boolean>>;
  onSubmit?: () => void;
}

const SearchBar = ({
  searchQuery,
  setSearchQuery,
  searchFocused,
  setSearchFocused,
  setMessageBarFocused,
  onSubmit,
}: SearchBarProps) => {
  const keyHandledRef = useRef(false);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    if (searchFocused) {
      inputRef.current.focus?.();
    } else {
      inputRef.current.blur?.();
    }
  }, [searchFocused]);

  useKeyboard((key) => {
    if (key.ctrl && key.name === "f") {
      setSearchFocused((prev) => {
        const next = !prev;
        setMessageBarFocused(!next);
        return next;
      });
      return;
    }

    if (searchFocused && key.name === "escape") {
      setSearchFocused(false);
      setMessageBarFocused(true);
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
        backgroundColor: colors.surfaceHighest,
        height: 3,
        paddingLeft: 1,
        paddingRight: 1,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <input
        ref={inputRef}
        placeholder=" 🔍 Search threads..."
        value={searchQuery}
        onInput={(v) => {
          if (!keyHandledRef.current) setSearchQuery(v);
        }}
        focused={searchFocused}
        onSubmit={onSubmit}
        width="100%"
        backgroundColor="transparent"
        placeholderColor="#ccc"
        height={1}
      />
    </box>
  );
};

export default SearchBar;
