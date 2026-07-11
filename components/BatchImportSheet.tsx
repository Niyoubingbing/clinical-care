"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "@/lib/db";
import { useApp } from "./Providers";
import ConfirmDialog from "./ConfirmDialog";
import {
  analyzeRoster,
  applyRoster,
  RosterPreview,
} from "@/lib/batch-import";
import type { Todo } from "@/types";

const EMPTY_TODOS: Todo[] = [];

export default function BatchImportSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const { toast } = useApp();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<RosterPreview | null>(null);
  const [removeAbsent, setRemoveAbsent] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const patients = useLiveQuery(() => db.patients.toArray(), []) ?? [];
  const todos = useLiveQuery(() => db.todos.toArray(), []) ?? EMPTY_TODOS;
  const settings = useLiveQuery(() => getSettings(), []);

  const pendingTodoCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const todo of todos) {
      if (todo.patientId && todo.status === "pending") {
        counts.set(todo.patientId, (counts.get(todo.patientId) ?? 0) + 1);
      }
    }
    return counts;
  }, [todos]);
  const pendingCountOf = (patientId: string) =>
    pendingTodoCounts.get(patientId) ?? 0;

  const runPreview = () => {
    if (!text.trim()) {
      toast({ message: "请输入导入内容" });
      return;
    }
    setPreview(analyzeRoster(text, patients, removeAbsent));
  };

  const removeHasPending = useMemo(
    () =>
      preview
        ? preview.toRemove.some((p) => (pendingTodoCounts.get(p.id) ?? 0) > 0)
        : false,
    [preview, pendingTodoCounts]
  );

  const doApply = async () => {
    if (!preview || !settings) return;
    const res = await applyRoster(
      preview,
      settings.bedTemplate,
      settings.specialMarks
    );
    toast({
      message: `新增 ${res.added} 人、更新 ${res.updated} 人、删除 ${res.removed} 人`,
    });
    setPreview(null);
    onClose();
  };

  const onConfirmClick = () => {
    if (removeAbsent && removeHasPending) {
      setConfirmOpen(true);
    } else {
      doApply();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-muted">
        每行一个病人，格式：床号 姓名 诊断（以空格或制表符分隔）。按姓名匹配更新，未匹配则新增。
      </p>
      <textarea
        className="input min-h-[140px] resize-none font-mono text-[13px]"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
        placeholder={"309W23 魏亿鑫 取除骨折内固定装置\n309W24 张三 胫骨骨折"}
      />

      <label className="flex items-center gap-2 text-[13px] text-main">
        <input
          type="checkbox"
          checked={removeAbsent}
          onChange={(e) => {
            setRemoveAbsent(e.target.checked);
            if (text.trim())
              setPreview(analyzeRoster(text, patients, e.target.checked));
          }}
        />
        移除未出现的病人
      </label>

      <div className="flex gap-3">
        <button className="btn-secondary h-11 flex-1" onClick={runPreview}>
          预览
        </button>
        <button
          className="btn-primary h-11 flex-1"
          disabled={!preview}
          onClick={onConfirmClick}
        >
          确认导入
        </button>
      </div>

      {preview && (
        <div className="space-y-2 rounded-xl bg-surface-alt p-3 text-[13px]">
          <p className="font-medium text-main">
            新增 {preview.toAdd.length} 人 · 更新 {preview.toUpdate.length} 人 ·
            删除 {preview.toRemove.length} 人
          </p>
          {preview.toRemove.length > 0 && (
            <p className="text-danger">
              将删除：
              {preview.toRemove
                .map(
                  (p) =>
                    `${p.name}${
                      pendingCountOf(p.id) > 0
                        ? `(${pendingCountOf(p.id)}待办)`
                        : ""
                    }`
                )
                .join("、")}
            </p>
          )}
          {preview.skipped.length > 0 && (
            <div className="text-warning">
              <p>跳过 {preview.skipped.length} 行：</p>
              <ul className="ml-4 list-disc">
                {preview.skipped.slice(0, 5).map((s) => (
                  <li key={s.line}>
                    第 {s.line} 行：{s.reason}
                  </li>
                ))}
                {preview.skipped.length > 5 && <li>…</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="确认删除未出现病人？"
        message={
          <div>
            <p>以下病人将被删除，并级联删除其未完成待办：</p>
            <p className="mt-1 text-danger">
              {preview?.toRemove
                .map(
                  (p) =>
                    `${p.name}(${pendingCountOf(p.id)}待办)`
                )
                .join("、")}
            </p>
          </div>
        }
        confirmText="删除"
        danger
        onConfirm={() => {
          setConfirmOpen(false);
          doApply();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
