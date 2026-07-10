import { describe, it, expect } from "vitest";
import { analyzeRoster } from "@/lib/batch-import";
import type { Patient } from "@/types";

/**
 * Factory for a minimal Patient (only required fields per `@/types`):
 * id / bedNumber / name / diagnosis / createdAt / updatedAt.
 * All other fields are optional and left undefined.
 */
function mkPatient(
  id: string,
  name: string,
  bedNumber: string,
  diagnosis: string
): Patient {
  return {
    id,
    bedNumber,
    name,
    diagnosis,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("analyzeRoster - removeAbsent", () => {
  it("removeAbsent=true removes absent patients and updates matched ones", () => {
    const existing: Patient[] = [
      mkPatient("1", "张三", "309W01", "骨折"),
      mkPatient("2", "李四", "309W02", "肺炎"),
    ];
    const text = "309W01 张三 骨折";

    const preview = analyzeRoster(text, existing, true);

    expect(preview.toRemove).toHaveLength(1);
    expect(preview.toRemove[0].name).toBe("李四");
    expect(preview.toAdd).toHaveLength(0);
    expect(preview.toUpdate).toHaveLength(1);
    expect(preview.toUpdate[0].existing.name).toBe("张三");
  });

  it("removeAbsent=false does not remove absent patients", () => {
    const existing: Patient[] = [
      mkPatient("1", "张三", "309W01", "骨折"),
      mkPatient("2", "李四", "309W02", "肺炎"),
    ];
    const text = "309W01 张三 骨折";

    const preview = analyzeRoster(text, existing, false);

    expect(preview.toRemove).toHaveLength(0);
    expect(preview.toAdd).toHaveLength(0);
    expect(preview.toUpdate).toHaveLength(1);
  });

  it("adds new patients when roster contains unseen names", () => {
    const existing: Patient[] = [];
    const text = "309W02 王五 感冒";

    const preview = analyzeRoster(text, existing, true);

    expect(preview.toAdd).toHaveLength(1);
    expect(preview.toAdd[0].name).toBe("王五");
    expect(preview.toRemove).toHaveLength(0);
  });
});
