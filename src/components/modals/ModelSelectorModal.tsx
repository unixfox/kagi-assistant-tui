import { useEffect, useMemo, useState } from "react";
import { type AssistantProfile } from "../../lib/data/kagiClient";
import { prefs, useAppContext } from "../..";
import Modal from "./Modal";

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

  return (
    <Modal show={show}>
      <text>
        <strong>Select a model:</strong>
      </text>
      <select
        marginTop={1}
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
    </Modal>
  );
};

export default ModelSelectorModal;
