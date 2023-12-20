import { createWriteStream, existsSync, mkdirSync, rmSync } from 'fs';

const average = (array: number[]) =>
  array.reduce((a, b) => a + b) / array.length;

const MAX_BRANCH_LENGTH = 50;
const MAX_CONDITIONALS_PER_BRANCH = Math.floor(Math.random() * 3) + 1;
const MAX_AST_DEPTH = Math.floor(Math.random() * 5) + 1;
const NUM_SYMBOLIC_VARS = Math.floor(Math.random() * 10) + 1;

const comparators = ['===', '>', '<', '<=', '>='];
let lines: string[] = [];
let addedLines: string[] = [];
const outDir = 'randjs';
let stats: Stats = {
  NUM_SYMBOLIC_VARS: NUM_SYMBOLIC_VARS,
  MAX_BRANCH_LENGTH: MAX_BRANCH_LENGTH,
  MAX_CONDITIONALS_PER_BRANCH: MAX_CONDITIONALS_PER_BRANCH,
  MAX_AST_DEPTH: MAX_AST_DEPTH,
  AVE_BRANCH_LENGTH: 0,
  AVE_CONDITIONALS_PER_BRANCH: 0,
  AVE_AST_DEPTH: 0,
  NUM_BRANCHES: 0,
  NUM_CONDITIONALS: 0,
};
let branchLengthSum = 0;
let astDepths: number[] = [];
let conditionalsInBranch: number[] = [];

main();

function main() {
  const args = process.argv.slice(2);
  const makeDiff = args.find((arg) => arg.startsWith('--diff')) ? true : false;
  let filename = args.find((arg) => arg.startsWith('--writeToFile='));
  filename = filename ? filename.split('=')[1] : 'ranjs';
  if (!existsSync(outDir)) mkdirSync(outDir);
  let filePath = outDir + '/' + filename + '.jse.js';

  // Create file for JSE
  lines.push(
    'import { SymbolicNumber } from "../build/instrumentation/symbols.js";',
  );
  for (let i = 0; i < NUM_SYMBOLIC_VARS; i++) {
    let line = `let sym${i} = new SymbolicNumber();`;
    lines.push(line);
  }

  const generatedLines = addBranch(
    Math.floor(Math.random() * MAX_CONDITIONALS_PER_BRANCH) + 1,
    0,
  );
  lines = lines.concat(generatedLines);
  if (existsSync(filePath)) {
    console.log(`${filePath} already exists. Overwriting...`);
    rmSync(filePath);
  }
  var stream = createWriteStream(filePath, { flags: 'a' });
  for (let line of lines) {
    stream.write(line + '\n');
  }
  stream.end();
  // create diff file for jazzer
  let max_iter = 100;
  while (max_iter > 0) {
    const idx = Math.floor(Math.random() * lines.length);
    let line = lines[idx];
    if (
      line.includes('const') ||
      (line.includes('let') && !line.includes('new'))
    ) {
      line = line.slice(0, -1) + '0' + line.slice(-1);
      lines[idx] = line;
      break;
    }
    max_iter--;
  }
  filePath = filePath.slice(0, -3) + '.diff' + filePath.slice(-3);
  if (existsSync(filePath)) {
    console.log(`${filePath} already exists. Overwriting...`);
    rmSync(filePath);
  }
  var stream = createWriteStream(filePath, { flags: 'a' });
  for (let line of lines) {
    stream.write(line + '\n');
  }
  stream.end();

  // Create file for Jazzer
  lines = [];
  lines.push(`export function fuzz(data) {
    main(data);
}

function splitBuffer(buffer, n) {
    const result = [];
    const chunkSize = Math.ceil(buffer.length / n)
    for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        result.push(chunk);
    }
    return result;
}

function main(data){
    const [${Array.from(
      { length: NUM_SYMBOLIC_VARS },
      (_, i) => `sym${i}`,
    ).join(', ')}] = splitBuffer(data, ${NUM_SYMBOLIC_VARS});`);
  lines = lines.concat(generatedLines);
  lines.push('}');
  filePath = outDir + '/' + filename + '.jazzer.js';
  if (existsSync(filePath)) {
    console.log(`${filePath} already exists. Overwriting...`);
    rmSync(filePath);
  }
  var stream = createWriteStream(filePath, { flags: 'a' });
  for (let line of lines) {
    stream.write(line + '\n');
  }
  stream.end();

  // Write stats
  stats.AVE_CONDITIONALS_PER_BRANCH = average(conditionalsInBranch);
  stats.AVE_BRANCH_LENGTH = branchLengthSum / stats.NUM_BRANCHES;
  stats.AVE_AST_DEPTH = average(astDepths);
  filePath = outDir + '/' + filename + '.stats.json';
  if (existsSync(filePath)) {
    rmSync(filePath);
  }
  var stream = createWriteStream(filePath, { flags: 'a' });
  stream.write(JSON.stringify(stats));
  stream.end();
}

function addBranch(numConditionalsInBranch: number, branchDepth: number) {
  let conditionalsAdded = 0;
  astDepths.push(branchDepth);
  stats.NUM_CONDITIONALS++;
  stats.NUM_BRANCHES += 2;
  if (branchDepth === 0) addedLines.push('let num_branches = 0;');
  addedLines.push(
    `${'   '.repeat(branchDepth)}if (sym${Math.floor(
      Math.random() * NUM_SYMBOLIC_VARS,
    )} ${comparators[Math.floor(Math.random() * comparators.length)]} ${
      Math.random() < 0 ? '-' : '' // no negatives.
    }${Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)}) {`,
  );
  addedLines.push(`${'   '.repeat(branchDepth + 1)}num_branches++;`);
  addedLines.push(
    `${'   '.repeat(
      branchDepth + 1,
    )}console.log("branch: " + num_branches.toString());`,
  );
  for (let i = 0; i < numConditionalsInBranch; i++) {
    for (
      let j = 0;
      j <
      Math.floor(
        (Math.random() * MAX_BRANCH_LENGTH) / (2 * numConditionalsInBranch),
      );
      j++
    ) {
      branchLengthSum++;
      const line = `${'   '.repeat(branchDepth + 1)}${createLine()}`;
      addedLines.push(line);
    }
    if (branchDepth <= MAX_AST_DEPTH && Math.random() < 0.5) {
      conditionalsAdded++;
      // reduce the number of conditionals.
      addBranch(
        Math.floor(Math.random() * MAX_CONDITIONALS_PER_BRANCH) + 1,
        branchDepth + 1,
      );
    }
    for (
      let j = 0;
      j <
      Math.floor(
        (Math.random() * MAX_BRANCH_LENGTH) / (2 * numConditionalsInBranch),
      );
      j++
    ) {
      branchLengthSum++;
      const line = `${'   '.repeat(branchDepth + 1)}${createLine()}`;
      addedLines.push(line);
    }
  }
  conditionalsInBranch.push(conditionalsAdded);
  conditionalsAdded = 0;
  addedLines.push(`${'   '.repeat(branchDepth)}} else {`);
  addedLines.push(`${'   '.repeat(branchDepth + 1)}num_branches++;`);
  addedLines.push(
    `${'   '.repeat(
      branchDepth + 1,
    )}console.log("branch: " + num_branches.toString());`,
  );
  for (let i = 0; i < numConditionalsInBranch; i++) {
    for (
      let j = 0;
      j <
      Math.floor(
        (Math.random() * MAX_BRANCH_LENGTH) / (2 * numConditionalsInBranch),
      );
      j++
    ) {
      branchLengthSum++;
      const line = `${'   '.repeat(branchDepth + 1)}${createLine()}`;
      addedLines.push(line);
    }
    if (branchDepth <= MAX_AST_DEPTH && Math.random() < 0.5) {
      conditionalsAdded++;
      addBranch(
        Math.floor(Math.random() * MAX_CONDITIONALS_PER_BRANCH) + 1,
        branchDepth + 1,
      );
    }
    for (
      let j = 0;
      j <
      Math.floor(
        (Math.random() * MAX_BRANCH_LENGTH) / (2 * numConditionalsInBranch),
      );
      j++
    ) {
      branchLengthSum++;
      const line = `${'   '.repeat(branchDepth + 1)}${createLine()}`;
      addedLines.push(line);
    }
  }
  addedLines.push(`${'   '.repeat(branchDepth)}}`);
  conditionalsInBranch.push(conditionalsAdded);
  return addedLines;
}

function createLine() {
  const lines = [
    `console.log('${generateRandomString(10)}');`,
    `let ${generateRandomString(10)} = ${Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER,
    )};`,
    `const ${generateRandomString(10)} = ${Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER,
    )};`,
  ]; // need to add more operation statements here. If env interation is implemented, can add func calls like trig or other Math functions
  let line = lines[Math.floor(Math.random() * lines.length)];
  return line;
}

function generateRandomString(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    result += alphabet[randomIndex];
  }

  return result;
}

interface Stats {
  NUM_SYMBOLIC_VARS: number;
  MAX_BRANCH_LENGTH: number;
  MAX_CONDITIONALS_PER_BRANCH: number;
  MAX_AST_DEPTH: number;
  AVE_BRANCH_LENGTH: number;
  AVE_CONDITIONALS_PER_BRANCH: number;
  AVE_AST_DEPTH: number;
  NUM_BRANCHES: number;
  NUM_CONDITIONALS: number;
}
