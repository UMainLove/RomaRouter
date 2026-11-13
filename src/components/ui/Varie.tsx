import type { ReactNode } from "react";
import { AMBITI, voce, type AmbitoId, type Forma, type VoceId } from "@/lib/ambiti";
import { Icon, type IconName } from "../Icon";

/** Tessera quadrata con l'icona dell'ambito (colore + icona, mai solo colore). */
export function TesseraAmbito({ id, size = 44 }: { id: AmbitoId; size?: number }) {
  const a = AMBITI[id];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-card text-white ${a.classi.segno}`}
      style={{ width: size, height: size }}
    >
      <Icon name={a.icona} size={Math.round(size * 0.55)} />
    </span>
  );
}

/** Come TesseraAmbito, ma anche per "Non è tra questi?" (neutra, con la lente). */
export function TesseraVoce({ id, size = 44 }: { id: VoceId; size?: number }) {
  if (id !== "altro") return <TesseraAmbito id={id} size={size} />;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-card border-[1.5px] border-campo bg-panel text-ink"
      style={{ width: size, height: size }}
    >
      <Icon name={voce(id).icona} size={Math.round(size * 0.5)} strokeWidth={2} />
    </span>
  );
}

export const CLASSI_FORMA: Record<Forma, { esterno: string; interno: string }> = {
  cerchio: { esterno: "rounded-full", interno: "" },
  quadrato: { esterno: "rounded-[7px]", interno: "" },
  rombo: { esterno: "rotate-45 rounded-[6px] scale-[0.86]", interno: "-rotate-45" },
  goccia: { esterno: "rounded-[50%_50%_50%_4px] -rotate-45", interno: "rotate-45" },
};

/** Campione della forma usata sulla mappa (rombo, cerchio, quadrato, goccia). */
export function CampioneForma({ id, pieno = true }: { id: AmbitoId; pieno?: boolean }) {
  const a = AMBITI[id];
  const forma =
    a.forma === "cerchio"
      ? "rounded-full"
      : a.forma === "quadrato"
        ? "rounded-[3px]"
        : a.forma === "rombo"
          ? "rotate-45 rounded-[2px] scale-[0.85]"
          : "rounded-[50%_50%_50%_2px] -rotate-45";
  const riempimento = pieno ? a.classi.segno : `border-2 ${a.classi.bordo} bg-panel`;
  return <span aria-hidden="true" className={`inline-block size-3 shrink-0 ${forma} ${riempimento}`} />;
}

export function NotaPrivacy({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-card bg-bg-sink px-3.5 py-3 text-sm leading-5 text-ink-soft">
      <Icon name="scudo" size={18} className="mt-px shrink-0 text-ok" />
      <span>{children}</span>
    </p>
  );
}

export function Avviso({ children, icona = "info" }: { children: ReactNode; icona?: IconName }) {
  return (
    <p className="flex gap-2 rounded-card bg-attenzione-tint px-3.5 py-3 text-sm leading-5 text-ink">
      <Icon name={icona} size={18} className="mt-px shrink-0 text-attenzione" />
      <span>{children}</span>
    </p>
  );
}

export function Fonte({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-[18px] text-muted">Fonte: {children}</p>;
}

export function Etichetta({
  tono = "neutro",
  icona,
  children,
}: {
  tono?: "neutro" | "ok" | "attenzione";
  icona?: IconName;
  children: ReactNode;
}) {
  const classi =
    tono === "ok" ? "bg-ok-tint text-ok" : tono === "attenzione" ? "bg-attenzione-tint text-attenzione" : "bg-bg-sink text-ink";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[13px] font-bold ${classi}`}>
      {icona && <Icon name={icona} size={14} strokeWidth={2.4} />}
      {children}
    </span>
  );
}
