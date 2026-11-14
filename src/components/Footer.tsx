export function Footer() {
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-x-6 gap-y-2 px-4 py-5 text-sm text-muted sm:px-8">
        <span>Prototipo open source · Agentic Hack Rome 2026</span>
        <span>
          Non è un servizio ufficiale di Roma Capitale · dati di esempio · mappa basata su Quartieri di Roma 2026 ·
          © OpenStreetMap contributors
        </span>
        <span>Copertina: lupa dalla volpe 3D di PixelMannen (CC0), rig e animazione di tomkranis (CC BY 4.0)</span>
      </div>
    </footer>
  );
}
