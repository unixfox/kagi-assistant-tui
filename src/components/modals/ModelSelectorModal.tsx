import { useEffect, useMemo, useRef, useState } from "react";
import { type AssistantProfile } from "../../lib/data/kagiClient";
import { prefs, useAppContext } from "../..";
import { useKeyboard } from "@opentui/react";
import Modal from "./Modal";
import { removeLastWord } from "../../lib/manip";

const MAX_RECENT_MODELS = 5;

const ModelSelectorModal = ({ show }: { show: boolean }) => {
  const { client, setSelectedProfile, setShowModelSelectorModal } =
    useAppContext();

  const [models, setModels] = useState<AssistantProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const keyHandledRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    loadModels();
    setSearchQuery("");
    setSelectedIndex(0);
  }, [show, client]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const loadModels = async () => {
    try {
      const profiles = await client.getProfiles();
      setModels(profiles);
    } catch (e) {
      console.error("Failed to fetch profiles", e);
    }
  };

  const options = useMemo(() => {
    const recentModels = prefs.get<string[]>("recent_models", []);
    const recentModelSet = new Set(recentModels);

    const recentOptions: Array<{
      name: string;
      description: string;
      value: string;
      isRecent?: boolean;
    }> = [];
    const otherOptions: Array<{
      name: string;
      description: string;
      value: string;
      isRecent?: boolean;
    }> = [];

    models.forEach((model) => {
      const option = {
        name: model.name,
        description: model.description,
        value: model.name,
        isRecent: false,
      };

      if (recentModelSet.has(model.name)) {
        recentOptions.push({ ...option, isRecent: true });
      } else {
        otherOptions.push(option);
      }
    });

    recentOptions.sort(
      (a, b) => recentModels.indexOf(a.name) - recentModels.indexOf(b.name),
    );

    return [...recentOptions, ...otherOptions];
  }, [models]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(query) ||
        (option.description?.toLowerCase().includes(query) ?? false),
    );
  }, [options, searchQuery]);

  useKeyboard(
    (key) => {
      if (!show) return;

      if (key.name === "up") {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (key.name === "down") {
        setSelectedIndex((prev) =>
          prev < filteredOptions.length - 1
            ? prev + 1
            : filteredOptions.length - 1,
        );
      } else if (key.name === "return") {
        const selectedOption = filteredOptions[selectedIndex];
        if (selectedOption) {
          handleSelect(selectedOption);
        }
      } else if (key.name === "escape") {
        setShowModelSelectorModal(false);
      } else if (
        (key.name === "c" && key.ctrl) ||
        (key.raw === "\x15" && key.ctrl)
      ) {
        setSearchQuery("");
      } else if (key.name === "backspace" && key.option) {
        keyHandledRef.current = true;
        setSearchQuery((old) => removeLastWord(old));
        setTimeout(() => (keyHandledRef.current = false), 0);
      }
    },
    { release: false },
  );

  const handleSelect = (option: (typeof options)[0]) => {
    if (!option) return;

    const selected = models.find((m) => m.name === option.name) ?? null;

    setSelectedProfile(selected);
    setShowModelSelectorModal(false);

    prefs.set("selected_profile", JSON.stringify(selected));

    const recentModels = prefs.get<string[]>("recent_models", []);
    const updatedRecent = [
      option.name,
      ...recentModels.filter((m) => m !== option.name),
    ].slice(0, MAX_RECENT_MODELS);
    prefs.set("recent_models", updatedRecent);

    prefs.save().then(() => {
      "selected profile saved to prefs";
    });
  };

  return (
    <Modal show={show}>
      <text>
        <strong>Models</strong>
      </text>
      <box style={{ marginTop: 2, marginBottom: 2 }}>
        <input
          placeholder="Search models..."
          value={searchQuery}
          onInput={(v) => {
            if (!keyHandledRef.current) setSearchQuery(v);
          }}
          focused
          backgroundColor="transparent"
        />
      </box>
      <scrollbox
        style={{
          flexGrow: 1,
        }}
        scrollbarOptions={{
          trackOptions: {
            backgroundColor: "transparent",
          },
        }}
      >
        {filteredOptions.map((option, index) => {
          const isSelected = index === selectedIndex;
          return (
            <box
              key={option.value}
              style={{
                padding: 1,
                marginBottom: 1,
                backgroundColor: isSelected ? "#2d3748" : "transparent",
              }}
            >
              <text>
                <strong fg={isSelected ? "#63b3ed" : "white"}>
                  {option.name}
                </strong>
              </text>
              <text
                style={{
                  marginTop: 0,
                  fg: isSelected ? "#a0aec0" : "#718096",
                }}
              >
                {option.description}
              </text>
            </box>
          );
        })}
      </scrollbox>
    </Modal>
  );
};

export default ModelSelectorModal;
