"use client";
import { Droplets, ArrowRight } from "lucide-react";

export default function DressingRuleEntry({ onClick, description, grouped = false, disabled = false }: {
  onClick: () => void; description: string; grouped?: boolean; disabled?: boolean;
}) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`settings-row text-left text-[14px] text-main ${grouped ? "settings-row-grouped" : "card"}`}>
    <Droplets size={18} className="shrink-0 text-primary" />
    <span className="min-w-0 flex-1"><span className="block font-medium">换药规则</span><span className="mt-0.5 block text-[12px] text-muted">{description}</span></span>
    <ArrowRight size={16} className="shrink-0 text-muted" />
  </button>;
}
