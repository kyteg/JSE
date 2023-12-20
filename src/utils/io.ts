import { Directive, ModuleDeclaration, Statement } from 'estree';
import * as fs from 'fs';
import { promisify } from 'util';
import { Constraint } from '../constraint/constraint.js';
import { SVar } from '../symbolicVars/svars.js';

export type Cache = {
  lastConditional: Statement;
  cstore: Constraint[];
  sstore: SVar[];
};

export async function readFileContents(filePath: string) {
  const readFile = promisify(fs.readFile);
  try {
    const data = await readFile(filePath, 'utf8');
    return data;
  } catch (err) {
    console.error('Error reading the file:', err);
    return null;
  }
}

export function writeFile(data: string, filePath: string) {
  return fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function removeFile(filePath: string) {
  try {
    fs.unlinkSync(filePath);
  } catch {}
}

export function appendToFile(data: string, filePath: string) {
  return fs.appendFileSync(filePath, data);
}

export function getNextFileIndex(filePath: string) {
  const files = fs.readdirSync(filePath); // List existing files
  const existingIndexes = new Set<number>();

  // Loop through the files and extract the numeric part of the filename
  for (const file of files) {
    const match = /^(\d+)\.json$/.exec(file);
    if (match) {
      const index = parseInt(match[1], 10);
      existingIndexes.add(index);
    }
  }

  let index = 1;
  while (existingIndexes.has(index)) {
    index++; // Increment the index until it's not in use
  }
  return index;
}

export function readCache(filePath: string) {
  const cacheFileContents = fs.readFileSync(filePath, 'utf-8');
  const cache: Cache[] = [];
  cacheFileContents.split(/\r?\n/).forEach((line) => {
    if (!line) return;
    try {
      const cacheLine = JSON.parse(line) as Cache;
      if (!cacheLine) throw Error(`"${line}" could not be parsed as Cache`);
      cache.push(cacheLine);
    } catch (e: any) {
      throw Error('cache file could not be read: ' + e);
    }
  });
  return cache;
}

export function readDiff(filePath: string) {
  const diffFileContents = fs.readFileSync(filePath, 'utf-8');
  let diff: (Directive | Statement | ModuleDeclaration)[] = [];
  diffFileContents.split(/\r?\n/).forEach((line) => {
    if (!line) return;
    try {
      const diffLine = JSON.parse(line) as
        | Directive
        | Statement
        | ModuleDeclaration;
      if (!diffLine)
        throw Error(
          `"${line}" could not be parsed as (Directive | Statement | ModuleDeclaration)`,
        );
      diff.push(diffLine);
    } catch (e: any) {
      throw Error('diff file could not be read: ' + e);
    }
  });
  return diff;
}
