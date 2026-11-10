"use client";

import { CircleNotch } from "@phosphor-icons/react";
import { useFormStatus } from "react-dom";

// Submit button of a server-action form: disabled with a spinner while the action runs, so a click never looks ignored.
export function PendingButton({ icon, children, ...props }: React.ComponentProps<"button"> & { icon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} disabled={pending} aria-busy={pending || undefined}>
      {pending ? <CircleNotch className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
