import type { ReactNode } from "react";
import { AMBITI, type AmbitoId } from "@/lib/ambiti";
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

/** Campione della forma usata sulla mappa (cerchio, quadrato, goccia). */
export function CampioneForma({ id, pieno = true }: { id: AmbitoId; pieno?: boolean }) {
  const a = AMBITI[id];
  const forma =
    a.forma === "cerchio" ? "rounded-full" : a.forma === "quadrato" ? "rounded-[3px]" : "rounded-[50%_50%_50%_2px] -rotate-45";
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

export function IntestazionePagina({
  ambito,
  titolo,
  sottotitolo,
}: {
  ambito?: AmbitoId;
  titolo: string;
  sottotitolo?: string;
}) {
  return (
    <div className="flex items-center gap-3.5">
      {ambito && <TesseraAmbito id={ambito} size={48} />}
      <div>
        <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.01em] sm:text-[32px] sm:leading-10">{titolo}</h1>
        {sottotitolo && <p className="mt-0.5 text-base leading-6 text-ink-soft">{sottotitolo}</p>}
      </div>
    </div>
  );
}
