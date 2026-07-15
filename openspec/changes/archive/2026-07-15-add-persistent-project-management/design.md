# Design

The canonical user config lives in `app-data/projects.config.json`; generated scan data lives in `app-data/projects.generated.json`. A focused `server/project-config.mjs` module owns config migration, validation, ids, and writes. A focused `server/project-discovery.mjs` module owns safe workspace discovery.

All APIs that accept paths validate and save them before scan or watcher code can use them. Scanner and watcher consumers receive enabled saved projects only. Removing a project deletes only the config entry.
