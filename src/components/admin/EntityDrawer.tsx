import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function EntityDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  width = "md:max-w-2xl",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "left";
  width?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={`w-full ${width} bg-zinc-950 border-zinc-800 text-zinc-100 p-0 flex flex-col`}
      >
        <SheetHeader className="p-5 border-b border-zinc-800">
          <SheetTitle className="font-display text-xl tracking-tight text-zinc-100">{title}</SheetTitle>
          {description && <SheetDescription className="text-zinc-500">{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-zinc-800 p-4 flex justify-end gap-2">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm rounded focus:outline-none focus:border-orange-500 ${props.className ?? ""}`}
    />
  );
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm rounded focus:outline-none focus:border-orange-500 ${props.className ?? ""}`}
    />
  );
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm rounded focus:outline-none focus:border-orange-500 ${props.className ?? ""}`}
    />
  );
}

export function PrimaryBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`bg-orange-500 hover:bg-orange-600 text-black px-5 py-2 text-xs uppercase tracking-wider font-bold rounded disabled:opacity-50 ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-4 py-2 text-xs uppercase tracking-wider rounded ${rest.className ?? ""}`}
    >
      {children}
    </button>
  );
}
