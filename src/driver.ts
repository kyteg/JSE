import { Directive, IfStatement, ModuleDeclaration, Statement } from 'estree';
import { Context, init } from 'z3-solver';
import { Diff } from './createDiffAST.js';
import { Ctx, SeEngine } from './se.js';
import { createAST } from './utils/ast.js';
import { Cache, readCache, readDiff, readFileContents } from './utils/io.js';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function main() {
  /* -------------------------------- */
  /* Read file contents and creat AST */
  /* -------------------------------- */
  const args = process.argv.slice(2);

  let filePath = args.find((arg) => arg.startsWith('--file='));
  let diffFlag = args.find((arg) => arg.startsWith('--diff'));
  let cachePath = args.find((arg) => arg.startsWith('--cache='));
  let diffPath = args.find((arg) => arg.startsWith('--diffFile='));
  let writeCacheFlag = args.find((arg) => arg.startsWith('--writecache'));

  if (!diffFlag && !filePath) {
    console.log('usage: npm run jse -- --file="path/to/file"');
    return;
  }
  if (diffFlag && !(cachePath && diffPath)) {
    console.log(
      'usage: npm run jse -- --diff --cache="path/to/cacheFile" --diffFile="path/to/diffFile"',
    );
    return;
  }
  let writeCache = false;
  if (writeCacheFlag) writeCache = true;

  let ast: (Directive | Statement | ModuleDeclaration)[] | undefined;
  let ctx: Ctx | undefined;
  if (!diffFlag) {
    filePath = filePath!;
    // Normal analysis of program
    filePath = filePath.split('=')[1];
    const fileContents = await readFileContents(filePath);
    if (!fileContents) return;
    ast = createAST(fileContents).body;
  } else {
    cachePath = cachePath!;
    diffPath = diffPath!;
    // Differential analysis of program
    cachePath = cachePath.split('=')[1];
    diffPath = diffPath.split('=')[1];
    // Read files and parse data
    const cache = readCache(cachePath);
    const diff = readDiff(diffPath);
    // Get branch containing first diff
    const analysisBranch = getBranchWithDiff(diff);
    // Get the corresponding constraint and symbolic stores
    const cacheLine = searchCache(
      analysisBranch.lastConditional as IfStatement,
      cache,
    );
    // construct context class
    ctx = new Ctx(analysisBranch.diff, new Set(cacheLine.cstore), undefined);
    ctx = undefined;
    ast = analysisBranch.diff;
  }
  /* ------------------------ */
  /* Start symbolic execution */
  /* ------------------------ */

  const { Context, em } = await init();
  // @ts-ignore
  const Z3: Context = new Context('main');
  const engine = new SeEngine(ast, 'dfs', Z3, writeCache);
  await engine.start(ctx, em);
  while (!engine.finished()) {
    await delay(1);
  }
  process.exit();
}

function getBranchWithDiff(
  diff: (Directive | Statement | ModuleDeclaration)[],
  lastConditional?: Statement,
): {
  diff: (Directive | Statement | ModuleDeclaration)[];
  lastConditional: Statement | undefined;
} {
  for (let line of diff) {
    if (line.type === 'IfStatement') {
      line = line as IfStatement;
      const result = getBranchWithDiff(
        line.consequent.type === 'BlockStatement'
          ? line.consequent.body
          : [line.consequent],
        line,
      );
      if (result) return result;
    }
    if ((line as Diff).statements) {
      return { diff, lastConditional };
    }
  }
  return { diff, lastConditional };
}

function searchCache(lastConditional: IfStatement | undefined, cache: Cache[]) {
  for (const cacheLine of cache) {
    if (
      JSON.stringify((cacheLine.lastConditional as IfStatement)?.test) ===
      JSON.stringify(lastConditional?.test)
    ) {
      return cacheLine;
    }
  }
  throw Error('correct cache line could not be found.');
}

main();
