"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SubpageHeader({
  title,
  description,
  backHref = "/settings",
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="subpage-header">
      <Link href={backHref} aria-label="返回" className="subpage-back">
        <ArrowLeft size={19} />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-main">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-[12px] leading-5 text-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
