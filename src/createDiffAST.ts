import { Directive, IfStatement, ModuleDeclaration, Statement } from 'estree';
import { ASTBranch, areObjectsEqual, createAST } from './utils/ast.js';
import { appendToFile, readFileContents, removeFile } from './utils/io.js';

export interface Diff extends Directive {
  statements: [
    Directive | Statement | ModuleDeclaration,
    Directive | Statement | ModuleDeclaration,
  ];
}

function areBranchesEqual(
  a: Directive | Statement | ModuleDeclaration,
  b: Directive | Statement | ModuleDeclaration,
) {
  if (a.type === 'IfStatement' && b.type == 'IfStatement') {
    const { consequent: aConsequent, alternate: aAlternate, ...aMod } = a;
    const { consequent: bConsequent, alternate: bAlternate, ...bMod } = b;
    return areObjectsEqual(aMod, bMod);
  } else {
    return areObjectsEqual(a, b);
  }
}

async function main() {
  /* -------------------------------- */
  /* Read file contents and creat AST */
  /* -------------------------------- */
  const args = process.argv.slice(2);

  let fileAPath = args.find((arg) => arg.startsWith('--a=')); // base file
  let fileBPath = args.find((arg) => arg.startsWith('--b=')); // new file
  let diffWritePath = args.find((arg) => arg.startsWith('--resultFilePath=')); // write path

  if (!fileAPath || !fileBPath || !diffWritePath) {
    console.log(
      'usage: npm run diff -- --a="path/to/base/file" --b="path/to/new/file" --resultFilePath="path/of/new/diffFile"',
    );
    return;
  }
  fileAPath = fileAPath.split('=')[1];
  fileBPath = fileBPath.split('=')[1];
  diffWritePath = diffWritePath.split('=')[1];

  const fileAContents = await readFileContents(fileAPath);
  const fileBContents = await readFileContents(fileBPath);

  if (!fileAContents) {
    console.log('Failed to read file A');
    return;
  }
  if (!fileBContents) {
    console.log('Failed to read file B');
    return;
  }
  const astA = createAST(fileAContents);
  const astB = createAST(fileBContents);

  /* ------------------------------------------------------- */
  /* create a new AST with a Diff object on first difference */
  /* ------------------------------------------------------- */
  const diff = checkBranchDiff(astA.body, astB.body);
  /* ------------------------------------------------*/
  /* write the difference ast json to specified file */
  /* ------------------------------------------------*/
  removeFile(diffWritePath);
  for (const line of diff) {
    appendToFile(JSON.stringify(line) + '\n', diffWritePath);
  }
}

function checkBranchDiff(
  branchA: (Directive | Statement | ModuleDeclaration)[],
  branchB: (Directive | Statement | ModuleDeclaration)[],
) {
  for (let i = 0; i < Math.min(branchA.length, branchB.length); i++) {
    if (!areBranchesEqual(branchA[i], branchB[i])) {
      branchA[i] = { statements: [branchA[i], branchB[i]] } as Diff;
      return branchA;
    } else {
      // the lines are equal. Check if there is a branch fork.
      if (branchA[i].type === 'IfStatement') {
        const lineA = branchA[i] as IfStatement;
        const lineB = branchB[i] as IfStatement;
        const linesAfterConditionalBlockA = branchA.slice(
          branchA.findIndex((l) => l === lineA) + 1,
        );
        const linesAfterConditionalBlockB = branchA.slice(
          branchB.findIndex((l) => l === lineB) + 1,
        );
        let astBranchA: ASTBranch = { left: [], right: [] };
        let astBranchB: ASTBranch = { left: [], right: [] };
        // populate astBranchA
        if (lineA.consequent.type === 'BlockStatement')
          astBranchA.left = (
            lineA.consequent.body as (
              | Directive
              | Statement
              | ModuleDeclaration
            )[]
          ).concat(linesAfterConditionalBlockA);
        else
          astBranchA.left = [
            lineA.consequent as Directive | Statement | ModuleDeclaration,
          ].concat(linesAfterConditionalBlockA);
        if (lineA.alternate) {
          if (lineA.alternate.type === 'BlockStatement')
            astBranchA.right = (
              lineA.alternate.body as (
                | Directive
                | Statement
                | ModuleDeclaration
              )[]
            ).concat(linesAfterConditionalBlockA);
          else
            astBranchA.right = [
              lineA.alternate as Directive | Statement | ModuleDeclaration,
            ].concat(linesAfterConditionalBlockA);
        }
        // populate astBranchB
        if (lineB.consequent.type === 'BlockStatement')
          astBranchB.left = (
            lineB.consequent.body as (
              | Directive
              | Statement
              | ModuleDeclaration
            )[]
          ).concat(linesAfterConditionalBlockB);
        else
          astBranchB.left = [
            lineB.consequent as Directive | Statement | ModuleDeclaration,
          ].concat(linesAfterConditionalBlockB);
        if (lineB.alternate) {
          if (lineB.alternate.type === 'BlockStatement')
            astBranchB.right = (
              lineB.alternate.body as (
                | Directive
                | Statement
                | ModuleDeclaration
              )[]
            ).concat(linesAfterConditionalBlockB);
          else
            astBranchB.right = [
              lineB.alternate as Directive | Statement | ModuleDeclaration,
            ].concat(linesAfterConditionalBlockB);
        }
        // explore left and right branches
        if (lineA.consequent.type === 'BlockStatement')
          lineA.consequent.body = checkBranchDiff(
            astBranchA.left,
            astBranchB.left,
          ) as Statement[];
        else
          lineA.consequent = checkBranchDiff(
            astBranchA.left,
            astBranchB.left,
          )[0] as Statement;
        if (lineA.alternate && lineA.alternate.type === 'BlockStatement')
          lineA.alternate.body = checkBranchDiff(
            astBranchA.right,
            astBranchB.right,
          ) as Statement[];
        else
          lineA.alternate = checkBranchDiff(
            astBranchA.right,
            astBranchB.right,
          )[0] as Statement;
        break;
      }
    }
  }
  return branchA;
}

main();
