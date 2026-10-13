# IdleOn Tools

Calculators for [Legends of IdleOn](https://www.legendsofidleon.com/), all in one place. Import your [IdleonToolbox](https://idleontoolbox.com/) save in any tool; everything runs in your browser and the save is never uploaded.

**Live site:** https://knussbaumer.github.io/IdleOn-Tools/

| Tool | What it does |
| --- | --- |
| [Sample Gap Finder](sample-gap-finder/) | 3D Printer samples: compares your Mining, Logs, Catching and Fishing efficiency with the top public samplers, source by source, with best-in-slot setups. |
| [Stamp Upgrade Planner](stamp-planner/) | Which stamp upgrades fit in a character's inventory, with Gilded Stamps and Hydrogen, sorted by how close to the carry cap they are. |

## Layout

```
index.html              landing page with the tool menu
assets/                 landing page icons and the shared tool menu (nav-snippet.html)
scripts/sync-nav.py     puts the shared menu at the top of every tool page
sample-gap-finder/      index.html, its sources (src/), data snapshot (data/) and build scripts
stamp-planner/          index.html, engine.js, sources (src/) and build scripts
```

Each tool is a self-contained page. To rebuild one after a game update:

```bash
sample-gap-finder/scripts/build.sh   # bundles IdleonToolbox + src/kimgap, assembles index.html
stamp-planner/scripts/build.sh       # bundles engine.js, assembles index.html
python3 scripts/sync-nav.py          # refresh the shared menu in the rebuilt pages
```

Both build scripts need Node 20+, Python 3 and git, and clone IdleonToolbox into the tool's `.build/` folder.

### Sample Gap Finder data

`sample-gap-finder/data/bench*.json` is a snapshot of the five best public samplers per printer item from the IdleonToolbox leaderboards (efficiency breakdown leaves, statue, monument, vial and meal details, and the inputs behind each source). `bis.json` holds the best-in-slot boards and `icons.json` the row icons; both can be regenerated with `REBUILD_IMAGES=1 scripts/build.sh`.

## Adding a tool

1. Put it in its own folder with an `index.html`.
2. Add it to `TOOLS` in `scripts/sync-nav.py` and to the links in `assets/nav-snippet.html`, then run the script.
3. Add a card to the landing page (`index.html`) and a row to the table above.

## Credits and licence

- Game data, formulas and parser: [IdleonToolbox](https://github.com/Morta1/IdleonToolbox) by Morta1 (GPL-3.0).
- Best-in-slot setups: taken and updated from AlmostPsycho's Sampling Sheet.
- Game icons belong to Lavaflame2 / Legends of IdleOn.

Because the tools bundle IdleonToolbox code, this project is licensed under the GNU GPL v3.0 (see `LICENSE`).
