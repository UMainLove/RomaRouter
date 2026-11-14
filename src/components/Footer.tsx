export function Footer() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-x-6 gap-y-2 px-4 py-5 text-sm text-muted sm:px-8">
        <span>Prototipo open source · Agentic Hack Rome 2026</span>
        <span>
          Non è un servizio ufficiale di Roma Capitale · dati di esempio · mappa basata su Quartieri di Roma 2026 ·
          © OpenStreetMap contributors
        </span>
        <span>Copertina: corsa della lupa dal rig e dall&apos;animazione di tomkranis (CC BY 4.0), cielo di Poly Haven (CC0)</span>
      </div>
    </footer>
  );
}
