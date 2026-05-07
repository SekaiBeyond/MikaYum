import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border-border bg-card text-card-foreground shadow-md",
        },
      }}
    />
  );
}
