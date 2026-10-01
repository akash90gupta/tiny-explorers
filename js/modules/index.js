// Module registry. To add a theme: create a file shaped like farm.js,
// import it here, and add it to MODULES. Nothing else needs to change.
import farm from './farm.js';
import wild from './wild.js';
import birds from './birds.js';
import ocean from './ocean.js';
import fruits from './fruits.js';
import veggies from './veggies.js';
import plants from './plants.js';
import vehicles from './vehicles.js';
import colors from './colors.js';
import body from './body.js';

export const MODULES = [farm, wild, birds, ocean, fruits, veggies, plants, vehicles, colors, body];

// Keys are namespaced by module so two themes can share an item id.
for (const m of MODULES) {
  for (const it of m.items) {
    it.key = `${m.id}/${it.id}`;
    it.moduleId = m.id;
  }
}

const byKey = new Map(MODULES.flatMap((m) => m.items.map((i) => [i.key, i])));

export const getModule = (id) => MODULES.find((m) => m.id === id);
export const itemByKey = (key) => byKey.get(key);
