"use client";

import { Component, type ReactNode } from "react";

/*
 * Un blocco della Guida che legge il database. Se il database non risponde, al suo posto c'e' una riga
 * e il resto della pagina (mappa, schede, altre Guide) resta in piedi, invece della pagina d'errore.
 */
export class SeNonCarica extends Component<{ cosa: string; children: ReactNode }, { errore: boolean }> {
  state = { errore: false };

  static getDerivedStateFromError() {
    return { errore: true };
  }

  render() {
    if (this.state.errore) {
      return (
        <p role="status" className="text-sm text-muted">
          In questo momento non riesco a caricare {this.props.cosa}. Riprova tra poco.
        </p>
      );
    }
    return this.props.children;
  }
}
