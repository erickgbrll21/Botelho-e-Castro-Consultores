import { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  id?: string;
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function Card({ id, title, children, className, action }: CardProps) {
  return (
    <div
      id={id}
      className={clsx("glass-panel rounded-2xl p-4 md:p-5", className)}
    >
      {(title || action) && (
        <div className="mb-3 md:mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          {title ? (
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-neutral-200 break-words">
              {title}
            </p>
          ) : null}
          {action ? <div className="shrink-0 self-start sm:self-center">{action}</div> : null}
        </div>
      )}
      <div className="w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
