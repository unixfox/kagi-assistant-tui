import { useEffect, useMemo, useState } from "react";
import { type AssistantProfile } from "../../lib/data/kagiClient";
import { prefs, useAppContext } from "../..";

const ModelSelectorModal = ({ show }: { show: boolean }) => {
  const { client, setSelectedProfile, setShowModelSelectorModal } =
    useAppContext();

  const [models, setModels] = useState<AssistantProfile[]>([]);

  useEffect(() => {
    if (!show) return;
    loadModels();
  }, [show, client]);

  const loadModels = async () => {
    try {
      const profiles = await client.getProfiles();
      setModels(profiles);
    } catch (e) {
      console.error("Failed to fetch profiles", e);
    }
  };

  const options = useMemo(() => {
    return models.map((model) => ({
      name: model.name,
      description: model.description,
      value: model.name,
    }));
  }, [models]);

  if (!show) return null;

  return (
    <box
      border
      style={{
        position: "absolute",
        left: "50%",
        top: "30%",
        width: 60,
        height: 30,
        marginLeft: -30,
        marginTop: -7,
        border: true,
        borderStyle: "double",
        backgroundColor: "#5b6097",
        padding: 2,
        zIndex: 100,
      }}
    >
      <text>
        <strong>Choose a model:</strong>
      </text>
      <select
        focused
        onSelect={(_, value) => {
          const selected =
            models.find((m) => m.name === (value?.name || "")) ?? null;

          setSelectedProfile(selected);
          setShowModelSelectorModal(false);

          prefs.set("selected_profile", JSON.stringify(selected));
          prefs.save().then(() => {
            "selected profile saved to prefs";
          });
        }}
        showScrollIndicator
        options={options}
        style={{ flexGrow: 1 }}
      />
    </box>
  );
};

export default ModelSelectorModal;
