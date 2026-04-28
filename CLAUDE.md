# Claude Code – Arbeitsregeln

Es gelten zusätzlich alle Regeln aus [AGENTS.md](./AGENTS.md).

- Aufgaben einzeln abarbeiten: eine vollständig abschließen, bestätigen, dann zur nächsten.
- Keine Dateien über ~150 Zeilen in einem einzigen Tool-Call schreiben — bei längeren Dateien in mehreren Passes.
- Bei langen Sessions (20+ Tool-Calls) eine neue Session starten.
- grep/search-Ausgaben begrenzen, z.B. mit --include oder -l (nur Dateinamen).
- Bei einem Timeout denselben Schritt in kürzerer Form wiederholen, nicht die gesamte Aufgabe neu starten.
