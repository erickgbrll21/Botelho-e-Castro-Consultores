import { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function Card({ title, children, className, action }: CardProps) {
  return (
    <div className={clsx("glass-panel rounded-2xl p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <p className="text-sm text-neutral-200">{title}</p> : null}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
