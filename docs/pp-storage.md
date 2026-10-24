# PP storage and quota recovery

Full cards live in the existing `nyra-provider-pps-v1` IndexedDB database,
`cards` store. `DRF` and `BRISNET` remain separate provider slots. The additional
`__session__` record contains notes/settings and the selected provider. Saving
a session writes its card and session metadata in one transaction. Writes are
ordered, snapshot their inputs, and abort if any synchronous write fails.

The app no longer writes full cards or settings to localStorage. On first load
after this change it reads the legacy active-card and settings keys. It commits
the recovered session and an exact raw backup in
`__legacy_local_storage_backup__` before removing those two duplicate local
copies. A newer durable source import is preferred over an old cached card;
legacy contents remain in the backup even when not selected. Cleanup checks
that another tab has not changed the legacy value. Unrelated localStorage keys
are not removed. A failed transaction leaves both legacy values intact.

Upload activation waits for the previous session and then the candidate
session to commit. A candidate write failure retains both saved providers and
the previous selected source. Genuine IndexedDB/disk failures remain visible;
the app does not claim durability when saving failed. In-memory edits remain
available for export while the tab is open.

Verification includes quota-blocked localStorage, legacy notes migration,
large source records, provider switching, notes/reload persistence, and an
injected failure after scheduling a card write to prove rollback and retry.
The parser, matching rules, scoring engines and betting gates are unchanged.
