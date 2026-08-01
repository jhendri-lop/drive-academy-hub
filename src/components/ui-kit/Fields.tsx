import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useRef, useState } from "react";
import { Calendar, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="label-xs whitespace-nowrap">{title}</h3>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-3 gap-4">{children}</div>
    </section>
  );
}

const fieldBase =
  "h-9 w-full rounded-md border bg-input px-3 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-60";

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </span>
  );
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  colSpan?: 1 | 2 | 3;
}

export function InputField({ label, error, colSpan = 1, className, ...props }: InputFieldProps) {
  return (
    <label className={cn(colSpan === 2 && "col-span-2", colSpan === 3 && "col-span-3", className)}>
      <Label required={props.required}>{label}</Label>
      <input className={cn(fieldBase, error && "border-destructive")} {...props} />
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </label>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  allowOther?: boolean;
  error?: string;
  colSpan?: 1 | 2 | 3;
  placeholder?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  allowOther,
  error,
  colSpan = 1,
  placeholder = "Seleccionar…",
}: SelectFieldProps) {
  const known = options.some((o) => o.value === value);
  const [other, setOther] = useState(!known && value !== "");

  return (
    <div className={cn(colSpan === 2 && "col-span-2", colSpan === 3 && "col-span-3")}>
      <Label required={required}>{label}</Label>
      <select
        className={cn(fieldBase, error && "border-destructive")}
        value={other ? "__other" : value}
        onChange={(e) => {
          if (e.target.value === "__other") {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {allowOther && <option value="__other">Otro (escribir)</option>}
      </select>
      {other && (
        <input
          className={cn(fieldBase, "mt-2")}
          placeholder="Escriba el valor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  required,
  colSpan = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  colSpan?: 1 | 2 | 3;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={cn(colSpan === 2 && "col-span-2", colSpan === 3 && "col-span-3")}>
      <Label required={required}>{label}</Label>
      <div className="relative">
        <input
          ref={ref}
          type="date"
          className={cn(fieldBase, "pr-9")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => ref.current?.showPicker?.()}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          aria-label="Abrir calendario"
        >
          <Calendar size={14} />
        </button>
      </div>
    </div>
  );
}

export function TextAreaField({
  label,
  colSpan = 3,
  ...props
}: TextAreaHTMLAttributes<HTMLTextAreaElement> & { label: string; colSpan?: 1 | 2 | 3 }) {
  return (
    <label className={cn(colSpan === 2 && "col-span-2", colSpan === 3 && "col-span-3")}>
      <Label>{label}</Label>
      <textarea
        className="min-h-20 w-full rounded-md border bg-input p-3 text-[13px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25"
        {...props}
      />
    </label>
  );
}

export function FileUpload({
  label,
  value,
  onChange,
  aspect = "photo",
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  aspect?: "photo" | "wide";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const read = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            read(e.dataTransfer.files[0]);
          }}
          onClick={() => ref.current?.click()}
          className={cn(
            "flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed py-6 text-center text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary",
            drag && "border-primary bg-primary/5 text-primary",
          )}
        >
          <Upload size={16} />
          Arrastre la imagen o haga clic
        </div>
        {value && (
          <div className="relative">
            <img
              src={value}
              alt="Vista previa"
              className={cn("rounded-md border object-cover", aspect === "photo" ? "h-[100px] w-20" : "h-[60px] w-[120px]")}
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -right-2 -top-2 rounded-full border bg-card p-0.5 text-muted-foreground hover:text-destructive"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => read(e.target.files?.[0])} />
    </div>
  );
}
