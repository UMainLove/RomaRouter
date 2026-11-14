import { permanentRedirect } from "next/navigation";

// I vecchi collegamenti al ritiro di un oggetto portano alla pagina degli oggetti smarriti:
// il catalogo non e' piu' pubblico, il ritiro passa da «Ho perso» e dalla verifica.
export default function VecchioRitiro() {
  permanentRedirect("/oggetti");
}
