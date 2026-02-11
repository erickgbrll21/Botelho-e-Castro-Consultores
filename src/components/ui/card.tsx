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
    <div className={clsx("glass-panel rounded-2xl p-4 md:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 md:mb-4 flex items-center justify-between gap-3">
          {title ? <p className="text-sm font-medium text-neutral-200">{title}</p> : null}
          {action}
        </div>
      )}
      <div className="w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
