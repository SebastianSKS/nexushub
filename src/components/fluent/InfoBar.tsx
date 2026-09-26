"use client";

import { useT } from "@/lib/i18n";
import type { ReactNode } from "react";
import clsx from "clsx";
import {
  CheckmarkCircle20Filled,
  Dismiss16Regular,
  ErrorCircle20Filled,
  Info20Filled,
  Warning20Filled,
} from "@fluentui/react-icons";
import { IconButton } from "./IconButton";

export type InfoBarSeverity = "info" | "success" | "warning" | "error";

interface InfoBarProps {
  severity?: InfoBarSeverity;
  title: string;
  children?: ReactNode;
  /** Botón de acción opcional, alineado a la derecha. */
  action?: ReactNode;
  onClose?: () => void;
  /** Flotante sobre el contenido: usa material Acrylic para seguir legible encima de cualquier cosa. */
  floating?: boolean;
  className?: string;
}

const STYLES: Record<InfoBarSeverity, { icon: ReactNode; tint: string; iconColor: string }> = {
  info: {
    icon: <Info20Filled />,
    tint: "color-mix(in srgb, var(--accent) 14%, var(--layer))",
    iconColor: "var(--accent-text)",
  },
  success: {
    icon: <CheckmarkCircle20Filled />,
    tint: "color-mix(in srgb, var(--success) 14%, var(--layer))",
    iconColor: "var(--success-fg)",
  },
  warning: {
    icon: <Warning20Filled />,
    tint: "color-mix(in srgb, var(--warning) 14%, var(--layer))",
    iconColor: "var(--warning-fg)",
  },
  error: {
    icon: <ErrorCircle20Filled />,
    tint: "color-mix(in srgb, var(--error) 14%, var(--layer))",
    iconColor: "var(--error-fg)",
  },
};

/** InfoBar de Fluent: barra de notificación en línea con severidad. */
export function InfoBar({
  severity = "info",
  title,
  children,
  action,
  onClose,
  floating = false,
  className,
}: InfoBarProps) {
  const t = useT();
  const s = STYLES[severity];
  return (
    <div
      role={severity === "error" || severity === "warning" ? "alert" : "status"}
      style={floating ? { backgroundImage: `linear-gradient(${s.tint}, ${s.tint})` } : { backgroundColor: s.tint }}
      className={clsx(
        "rounded-control flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3",
        floating ? "acrylic shadow-flyout" : "border border-stroke shadow-card",
        className,
      )}
    >
      <span className="mt-0.5 shrink-0" style={{ color: s.iconColor }} aria-hidden>
        {s.icon}
      </span>
      <div className="min-w-[10rem] flex-1 text-body">
        <span className="font-semibold text-fg">{title}</span>
        {children && <span className="ml-2 text-fg-secondary">{children}</span>}
      </div>
      {action && <div className="shrink-0 max-sm:basis-full max-sm:pl-8">{action}</div>}
      {onClose && (
        <IconButton label={t("Cerrar notificación")} onClick={onClose} className="-my-1 -mr-2 h-7 w-7">
          <Dismiss16Regular />
        </IconButton>
      )}
    </div>
  );
}
