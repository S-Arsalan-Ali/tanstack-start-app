import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    open: boolean;
    options: ConfirmOptions;
  }>({
    open: false,
    options: { title: "", message: "" },
  });

  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    setState({ open: true, options });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = (value: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    // Wait a brief moment for transition out before resolving
    setTimeout(() => {
      if (resolverRef.current) {
        resolverRef.current(value);
        resolverRef.current = null;
      }
    }, 150);
  };

  const { confirmText = "Confirm", cancelText = "Cancel", variant = "default" } = state.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(o) => { if (!o) handleClose(false); }}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-sm rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg uppercase tracking-wider text-zinc-100">
              {state.options.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 font-sans text-sm mt-2">
              {state.options.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-row justify-end gap-2">
            <button
              onClick={() => handleClose(false)}
              className="border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-4 py-2 text-xs uppercase tracking-wider rounded font-mono transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => handleClose(true)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-bold rounded font-mono transition-colors ${
                variant === "destructive"
                  ? "bg-red-650 hover:bg-red-750 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-black"
              }`}
            >
              {confirmText}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
