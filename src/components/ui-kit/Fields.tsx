import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
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

function Label({ children, required }: { children: ReactNode; required?: boolean | undefined }) {
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
  options: { value: string; label: string; disabled?: boolean }[];
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
          <option key={o.value} value={o.value} disabled={o.disabled}>
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
  error,
  colSpan = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  colSpan?: 1 | 2 | 3;
}) {
  return (
    <div className={cn(colSpan === 2 && "col-span-2", colSpan === 3 && "col-span-3")}>
      <Label required={required}>{label}</Label>
      <input
        type="date"
        className={cn(fieldBase, error && "border-destructive")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

export function TextAreaField({
  label,
  colSpan = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; colSpan?: 1 | 2 | 3 }) {
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

function InteractivePhotoCropper({
  rawImage,
  onChange,
  onClear,
  onOpenPicker,
}: {
  rawImage: string;
  onChange: (croppedDataUrl: string) => void;
  onClear: () => void;
  onOpenPicker: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState<{ baseW: number; baseH: number }>({
    baseW: 96,
    baseH: 128,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const containerWidth = 96;
  const containerHeight = 128;

  // Calcular dimensiones exactas de cobertura para el marco 3x4
  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    if (img.naturalWidth === 0 || img.naturalHeight === 0) return;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const boxAspect = containerWidth / containerHeight;

    let bw = containerWidth;
    let bh = containerHeight;
    if (imgAspect > boxAspect) {
      bh = containerHeight;
      bw = containerHeight * imgAspect;
    } else {
      bw = containerWidth;
      bh = containerWidth / imgAspect;
    }

    setImgDimensions({ baseW: bw, baseH: bh });
    updateCroppedResult(scale, position, bw, bh);
  };

  const clampPosition = useCallback(
    (rawX: number, rawY: number, currentScale: number, bw = imgDimensions.baseW, bh = imgDimensions.baseH) => {
      const renderedW = bw * currentScale;
      const renderedH = bh * currentScale;

      const maxOffsetX = Math.max(0, (renderedW - containerWidth) / 2);
      const maxOffsetY = Math.max(0, (renderedH - containerHeight) / 2);

      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, rawX)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, rawY)),
      };
    },
    [containerWidth, containerHeight, imgDimensions]
  );

  const updateCroppedResult = useCallback(
    (currentScale: number, currentPos: { x: number; y: number }, bw = imgDimensions.baseW, bh = imgDimensions.baseH) => {
      if (!rawImage || !imgRef.current) return;
      const img = imgRef.current;
      if (!img.complete || img.naturalWidth === 0) return;

      const canvas = document.createElement("canvas");
      const targetW = 300;
      const targetH = 400;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);

      const ratio = targetW / containerWidth;

      const drawW = bw * currentScale * ratio;
      const drawH = bh * currentScale * ratio;

      const centerX = targetW / 2;
      const centerY = targetH / 2;

      const drawX = centerX - drawW / 2 + currentPos.x * ratio;
      const drawY = centerY - drawH / 2 + currentPos.y * ratio;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      try {
        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
        onChange(croppedDataUrl);
      } catch (err) {
        console.warn("[PhotoCropper] Error exportando canvas:", err);
      }
    },
    [rawImage, onChange, containerWidth, imgDimensions]
  );

  // Actualizar canvas únicamente cuando termina el arrastre o cambia escala/posición
  useEffect(() => {
    if (!isDragging && imgRef.current && imgRef.current.complete) {
      updateCroppedResult(scale, position);
    }
  }, [isDragging, scale, position, updateCroppedResult]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    const clamped = clampPosition(rawX, rawY, scale);
    setPosition(clamped);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      const clamped = clampPosition(position.x, position.y, scale);
      updateCroppedResult(scale, clamped);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newScale = Math.min(Math.max(0.5, scale * zoomFactor), 6.0);
    const clamped = clampPosition(position.x, position.y, newScale);
    setScale(newScale);
    setPosition(clamped);
    updateCroppedResult(newScale, clamped);
  };

  const zoomIn = () => {
    const newScale = Math.min(scale * 1.15, 6.0);
    const clamped = clampPosition(position.x, position.y, newScale);
    setScale(newScale);
    setPosition(clamped);
    updateCroppedResult(newScale, clamped);
  };

  const zoomOut = () => {
    const newScale = Math.max(scale / 1.15, 0.5);
    const clamped = clampPosition(position.x, position.y, newScale);
    setScale(newScale);
    setPosition(clamped);
    updateCroppedResult(newScale, clamped);
  };

  const resetPos = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    updateCroppedResult(1, { x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="relative">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
          className={cn(
            "relative overflow-hidden rounded-md border-2 border-primary/70 bg-black/90 shadow-md transition-shadow",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          title="Arrastre para mover · Rueda del mouse para zoom"
        >
          <img
            ref={imgRef}
            src={rawImage}
            alt="Foto estudiante"
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: `${imgDimensions.baseW}px`,
              height: `${imgDimensions.baseH}px`,
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
              maxWidth: "none",
              maxHeight: "none",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
            <div className="border-r border-b border-white/40"></div>
            <div className="border-r border-b border-white/40"></div>
            <div className="border-b border-white/40"></div>
            <div className="border-r border-b border-white/40"></div>
            <div className="border-r border-b border-white/40"></div>
            <div className="border-b border-white/40"></div>
            <div className="border-r border-white/40"></div>
            <div className="border-r border-white/40"></div>
            <div></div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          title="Eliminar foto"
          className="absolute -right-2 -top-2 rounded-full border bg-card p-1 text-muted-foreground shadow hover:bg-destructive hover:text-white transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={zoomOut}
          title="Alejar (zoom out)"
          className="rounded border bg-muted/70 px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted"
        >
          <ZoomOut size={12} />
        </button>
        <button
          type="button"
          onClick={resetPos}
          title="Restablecer encuadre"
          className="rounded border bg-muted/70 px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted"
        >
          1:1
        </button>
        <button
          type="button"
          onClick={zoomIn}
          title="Acercar (zoom in)"
          className="rounded border bg-muted/70 px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted"
        >
          <ZoomIn size={12} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-muted-foreground text-center font-medium leading-tight">
          Arrastre para mover · Rueda para zoom
        </p>
        <button
          type="button"
          onClick={onOpenPicker}
          className="text-[10px] font-semibold text-primary hover:underline"
        >
          Cambiar
        </button>
      </div>
    </div>
  );
}

export function compressImageBase64(dataUrl: string, maxDim = 800, quality = 0.75): Promise<string> {
  if (typeof window === "undefined" || !dataUrl) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
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
  aspect?: "photo" | "wide" | "portrait";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [rawImage, setRawImage] = useState(value);
  const lastEmittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (value && value !== lastEmittedRef.current && value !== rawImage) {
      setRawImage(value);
    } else if (!value) {
      setRawImage("");
      lastEmittedRef.current = null;
    }
  }, [value]);

  const handleCroppedChange = useCallback(
    (croppedUrl: string) => {
      lastEmittedRef.current = croppedUrl;
      onChange(croppedUrl);
    },
    [onChange]
  );

  const read = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const res = String(reader.result);
      lastEmittedRef.current = null;
      const compressed = await compressImageBase64(res, 800, 0.75);
      setRawImage(compressed);
      if (aspect !== "photo") {
        onChange(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setRawImage("");
    lastEmittedRef.current = null;
    onChange("");
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-start gap-3">
        {!rawImage ? (
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
              drag && "border-primary bg-primary/5 text-primary"
            )}
          >
            <Upload size={16} />
            Arrastre la imagen o haga clic
          </div>
        ) : aspect === "photo" ? (
          <InteractivePhotoCropper
            rawImage={rawImage}
            onChange={handleCroppedChange}
            onClear={handleClear}
            onOpenPicker={() => ref.current?.click()}
          />
        ) : aspect === "portrait" ? (
          <div className="relative">
            <img
              src={rawImage}
              alt="Comprobante váucher"
              className="h-[128px] w-[72px] rounded-md border object-cover shadow-sm"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute -right-2 -top-2 rounded-full border bg-card p-0.5 text-muted-foreground hover:bg-destructive hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <img
              src={rawImage}
              alt="Vista previa"
              className="h-[60px] w-[120px] rounded-md border object-cover"
            />
            <button
              type="button"
              onClick={handleClear}
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

export function ComboboxSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Escribir o seleccionar…",
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <Label required={required}>{label}</Label>
      <div className="relative flex items-center">
        <input
          type="text"
          className={cn(fieldBase, "pr-8", error && "border-destructive")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover py-1 shadow-md text-xs">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={cn(
                "w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground font-medium transition-colors",
                opt === value && "bg-primary/10 text-primary font-semibold"
              )}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </div>
  );
}
