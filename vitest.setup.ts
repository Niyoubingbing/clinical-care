// Provide an in-memory IndexedDB so Dexie-based modules (lib/db, lib/export-import)
// can be imported and exercised under Node during unit tests.
import "fake-indexeddb/auto";
