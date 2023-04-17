import fs from 'fs';
import { join } from 'path';

interface Collection {
  id: string;
  slug: string;
  subs: Collection[];
  name: { en: string };
  names: string[];
}

const dic = new Map<string, string[]>();

export function detectPatterns(name: `${string}.bit`): Set<string> {
  if (!dic.size) {
    const dbPath = join(__dirname, 'db.json');
    const content = fs.readFileSync(dbPath, 'utf-8');
    const categories: Collection[] = JSON.parse(content);
    for (const item of categories) {
      for (const name of item.names) {
        if (!dic.has(name)) {
          dic.set(name, []);
        }
        dic.get(name).push(item.name.en);
      }
    }
  }

  const str = name.split('.').shift();

  return new Set(dic.get(str) || []);
}
