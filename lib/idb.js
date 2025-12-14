// /lib/idb.js
import { openDB } from "idb";

export const getDB = () =>
  openDB("TBC_DB", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
    },
  });
