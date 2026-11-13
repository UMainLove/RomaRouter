// Mappa della sezione "Arte di strada": copia indipendente della mappa di base, da personalizzare qui.
// Per ora: marchio RomaRouter e testi della sezione. Aggiungete css/js/patch come in mappe/antenne/.
import type { Sezione } from "../comune.mts";

const sezione: Sezione = {
  slug: "artisti-di-strada",
  titolo: "Arte di strada",
  titoloHtml: "Arte <span>di strada</span>",
  sottotitolo: "Le postazioni dove esibirsi a Roma, con regole e prenotazioni",
  descrizione: "Mappa delle postazioni per gli artisti di strada a Roma, con regole, fasce orarie e prenotazioni.",
};

export default sezione;
