import axios from 'axios';

import * as assert from 'assert';
import * as fs from 'fs';
import { join } from 'path';

interface Collection {
  id: string;
  slug: string;
  subs: Collection[];
  name: { en: string };
  names: string[];
}

async function getCategories(): Promise<Collection[]> {
  const dbPath = join(__dirname, 'db.json');
  if (!fs.existsSync(dbPath)) {
    const url = 'https://api.godid.io/api/collections/v2?compact=true';
    const res = await axios.get<Collection[]>(url);
    const digits = res.data.find(({ slug }) => slug === 'digits');

    const getLeafOfCollectionTree = (collection: Collection): Collection[] => {
      if (!collection.subs?.length) {
        return [collection];
      }

      return collection.subs.reduce((acc, sub) => [...acc, ...getLeafOfCollectionTree(sub)], []);
    };
    const items = getLeafOfCollectionTree(digits);
    const db: Collection[] = [];
    for (const item of items) {
      if (item.slug.trim() === 'rare4d') {
        continue;
      }

      const detail = await axios.get<Collection>(`https://api.godid.io/api/collections/${item.id}?compact=false`);
      db.push(detail.data);
    }

    fs.writeFileSync(join(__dirname, 'db.json'), JSON.stringify(db));

    return items;
  } else {
    const content = fs.readFileSync(dbPath, 'utf-8');

    return JSON.parse(content);
  }
}

async function main() {
  const categories = await getCategories();
  const dic = new Map<string, string[]>();
  for (const item of categories) {
    for (const name of item.names) {
      if (!dic.has(name)) {
        dic.set(name, []);
      }
      dic.get(name).push(item.name.en);
    }
  }

  function detectPatterns(name: `${string}.bit`): Set<string> {
    const str = name.split('.').shift();

    return new Set(dic.get(str) || []);
  }

  assert.deepEqual(detectPatterns('333.bit'), new Set(['AAA', '999']));
  assert.deepEqual(detectPatterns('2112.bit'), new Set(['ABBA', '10K']));
  assert.deepEqual(detectPatterns('45555.bit'), new Set(['ABBBB', '100K']));
  assert.deepEqual(detectPatterns('888000.bit'), new Set(['AAABBB', 'XXX000']));
  assert.deepEqual(detectPatterns('0098.bit'), new Set(['10K', 'AABC', '0XXX', '00XX']));
  assert.deepEqual(detectPatterns('0x9832.bit'), new Set(['0x10K']));
  assert.deepEqual(detectPatterns('0311.bit'), new Set(['ABCC', '0XXX', '10K', 'MMDD']));
}

(function run() {
  main().catch(e => {
    console.error(e);
    // eslint-disable-next-line no-console
    console.trace(e);
  });
})();
