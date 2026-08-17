"use client";

import { useState } from "react";
import BottomSheet from "./BottomSheet";
import { PatientForm } from "./PatientFormSheet";
import BatchImportSheet from "./BatchImportSheet";

export default function AddPatientSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"manual" | "import">("manual");

  return (
    <BottomSheet open={open} onClose={onClose} title="添加病人">
      <div className="mb-4 flex gap-2">
        <button
          className={`flex-1 rounded-xl py-2.5 text-[14px] font-medium transition ${
            tab === "manual"
              ? "liquid-pill-active text-white"
              : "liquid-pill text-muted"
          }`}
          onClick={() => setTab("manual")}
        >
          手动添加
        </button>
        <button
          className={`flex-1 rounded-xl py-2.5 text-[14px] font-medium transition ${
            tab === "import"
              ? "liquid-pill-active text-white"
              : "liquid-pill text-muted"
          }`}
          onClick={() => setTab("import")}
        >
          批量导入
        </button>
      </div>

      {tab === "manual" ? (
        <PatientForm onClose={onClose} />
      ) : (
        <BatchImportSheet onClose={onClose} />
      )}
    </BottomSheet>
  );
}
