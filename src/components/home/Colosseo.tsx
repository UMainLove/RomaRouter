/*
 * Il Colosseo visto dall'alto, al centro della home: tutte le strade portano qui.
 * Proporzioni vere (188 × 156 m, arena 83 × 48 m). L'anello esterno degli archi c'e' solo a nord, come oggi
 * (a sud e' crollato e si vede il secondo muro); le gradinate sono divise a spicchi, l'arena mostra i
 * corridoi dei sotterranei. Disegnato qui sul server: niente immagini, nitido a ogni dimensione.
 */
const RX = 94, RY = 78; // muro esterno
const ARENA = { rx: 41.5, ry: 25 };
const punto = (cx: number, cy: number, rx: number, ry: number, gradi: number) => {
  const t = (gradi * Math.PI) / 180;
  return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] as const;
};
const arco = (cx: number, cy: number, rx: number, ry: number, da: number, a: number) => {
  const [x1, y1] = punto(cx, cy, rx, ry, da);
  const [x2, y2] = punto(cx, cy, rx, ry, a);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${rx} ${ry} 0 ${a - da > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

export function Colosseo({ cx, cy }: { cx: number; cy: number }) {
  // spicchi delle gradinate (cunei) tra il podio e il muro
  const cunei = Array.from({ length: 56 }, (_, i) => {
    const g = (i * 360) / 56;
    const [x1, y1] = punto(cx, cy, ARENA.rx + 13, ARENA.ry + 13, g);
    const [x2, y2] = punto(cx, cy, RX - 3, RY - 3, g);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }).join("");
  // corridoi dei sotterranei: uno lungo l'asse e quattro paralleli, con le celle
  const sotterranei = [-17, -11, -5.5, 0, 5.5, 11, 17].map((dy) => `M${cx - ARENA.rx} ${cy + dy}H${cx + ARENA.rx}`).join("");
  const celle = Array.from({ length: 13 }, (_, i) => cx - 33 + i * 5.5).map((x) => `M${x} ${cy - 17}V${cy + 17}`).join("");

  return (
    <g className="mg-miliario mg-colosseo">
      <defs>
        <clipPath id="mg-arena-clip">
          <ellipse cx={cx} cy={cy} rx={ARENA.rx} ry={ARENA.ry} />
        </clipPath>
      </defs>
      {/* il centro (per la copertina, che si apre a cerchio da qui) */}
      <circle cx={cx} cy={cy} r={3.5} className="mg-col-centro" />
      {/* ombra e base */}
      <ellipse cx={cx} cy={cy + 7} rx={RX + 6} ry={RY + 5} className="mg-col-ombra" />
      <ellipse cx={cx} cy={cy} rx={RX} ry={RY} className="mg-col-base" />
      {/* gradinate: anelli dei corridoi e spicchi */}
      <path d={cunei} className="mg-col-cunei" />
      <ellipse cx={cx} cy={cy} rx={RX - 13} ry={RY - 12} className="mg-col-anello" />
      <ellipse cx={cx} cy={cy} rx={RX - 25} ry={RY - 23} className="mg-col-anello" />
      <ellipse cx={cx} cy={cy} rx={ARENA.rx + 13} ry={ARENA.ry + 13} className="mg-col-podio" />
      {/* a sud il secondo muro, rimasto scoperto */}
      <path d={arco(cx, cy, RX - 1, RY - 1, 15, 165)} className="mg-col-muro-sud" />
      {/* a nord l'anello esterno degli archi, quello delle cartoline */}
      <path d={arco(cx, cy, RX + 3.5, RY + 3.5, 198, 342)} className="mg-col-archi-fondo" />
      <path d={arco(cx, cy, RX + 3.5, RY + 3.5, 198, 342)} pathLength={40} className="mg-col-archi" />
      {/* l'arena con i sotterranei */}
      <ellipse cx={cx} cy={cy} rx={ARENA.rx} ry={ARENA.ry} className="mg-col-arena" />
      <g clipPath="url(#mg-arena-clip)">
        <path d={sotterranei + celle} className="mg-col-sotterranei" />
        {/* la parte di pavimento ricostruita, a est */}
        <rect x={cx + 20} y={cy - ARENA.ry} width={ARENA.rx} height={ARENA.ry * 2} className="mg-col-pavimento" />
      </g>
      <ellipse cx={cx} cy={cy} rx={ARENA.rx} ry={ARENA.ry} className="mg-col-arena-luce" />
      <ellipse cx={cx} cy={cy} rx={ARENA.rx} ry={ARENA.ry} className="mg-col-arena-bordo" />
      {/* la luce del tramonto che gira piano sull'anello */}
      <ellipse cx={cx} cy={cy} rx={RX + 3.5} ry={RY + 3.5} pathLength={100} className="mg-col-luce" />
    </g>
  );
}
