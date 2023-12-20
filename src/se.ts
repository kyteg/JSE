import {
  Directive,
  Expression,
  ModuleDeclaration,
  Statement,
  VariableDeclaration,
} from 'estree';
import fs, { existsSync } from 'fs';
import { Context, IntNum } from 'z3-solver';
import { BooleanConstraint } from './constraint/booleanConstraint.js';
import { Constraint } from './constraint/constraint.js';
import { SNumber, SVar } from './symbolicVars/svars.js';
import { ASTBranch } from './utils/ast.js';
import { appendToFile, getNextFileIndex, writeFile } from './utils/io.js';
import { getConstraintSymbolicVar } from './utils/seUtils.js';

interface seResult {
  svars: { name: string; value: any }[];
  finalLine: HandleLineReturnObject;
}

export class Ctx {
  cstore: Set<Constraint>;
  sstore: Set<SVar>;
  lines: (Directive | Statement | ModuleDeclaration)[];

  constructor(
    lines: (Directive | Statement | ModuleDeclaration)[],
    cstore?: Set<Constraint>,
    sstore?: Set<SVar>,
  ) {
    this.cstore = cstore ?? new Set<Constraint>();
    this.sstore = sstore ?? new Set<SVar>();
    this.lines = lines;
  }

  public addConstraint(c: Constraint) {
    if (c.getType() === 'assignment') {
      this.removeAssignmentConstraintFor(getConstraintSymbolicVar(c));
    }
    this.cstore.add(c);
  }

  public searchSstore(varName: string) {
    for (const svar of this.sstore) {
      if (svar.name === varName) {
        return svar;
      }
    }
    return undefined; // Object not found
  }

  private removeAssignmentConstraintFor(symbolicVarName: string) {
    this.cstore.forEach((constraint) => {
      if (getConstraintSymbolicVar(constraint) === symbolicVarName)
        this.cstore.delete(constraint);
    });
  }
}

class HandleLineReturnObject {
  public type: 'IfStatement' | 'ThrowStatement' | 'Empty';
  public ifStatement:
    | {
        leftConstraint: BooleanConstraint;
        rightConstraint: BooleanConstraint;
        astBranch: ASTBranch;
      }
    | undefined;
  public throwStatement: { name: string; value: string } | undefined;
  constructor(
    type: 'IfStatement' | 'ThrowStatement' | 'Empty',
    ifStatement?: {
      leftConstraint: BooleanConstraint;
      rightConstraint: BooleanConstraint;
      astBranch: ASTBranch;
    },
    throwStatement?: any,
  ) {
    this.type = type;
    this.ifStatement = ifStatement;
    this.throwStatement = throwStatement;
  }
}

export class SeEngine {
  public ast: (Directive | Statement | ModuleDeclaration)[];
  public Z3: Context;
  private searchStrategy: 'dfs' | 'bfs';
  private writeDir: string;
  private writeCache = false;
  public threadsRunning: boolean[] = [];

  constructor(
    ast: (Directive | Statement | ModuleDeclaration)[],
    searchStrategy: 'dfs' | 'bfs',
    Z3: Context,
    writeCache?: boolean,
  ) {
    this.ast = ast;
    this.searchStrategy = searchStrategy;
    this.Z3 = Z3;
    if (writeCache) this.writeCache = true;
    // create result directory
    if (!existsSync('results')) fs.mkdirSync('results');
    const existingDirectories = fs.readdirSync(process.cwd() + '/results'); // List existing directories in the current directory
    const existingIds = existingDirectories
      .map((dir: string) => parseInt(dir.replace('JSE', ''), 10)) // Extract and parse the numeric part of directory names
      .filter((id: number) => !isNaN(id));

    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1; // Calculate the next ID

    const newDirectory = `results/JSE${nextId}`;
    fs.mkdirSync(newDirectory); // Create the new directory
    this.writeDir = newDirectory;
  }

  public async start(ctx: Ctx | undefined, em: any) {
    // console.log(JSON.stringify(this.ast)); // debug
    // start program analysis
    await this.exploreBranchIter(ctx ?? new Ctx(this.ast));
  }

  public finished() {
    return this.threadsRunning.length === 0;
  }

  private async exploreBranchIter(ctx: Ctx) {
    let stack: { ctx: Ctx; lastConditional: Statement | undefined }[] = [
      { ctx, lastConditional: undefined },
    ];

    while (stack.length > 0) {
      const { ctx, lastConditional } = stack.pop()!;
      this.saveToCache(ctx, lastConditional);
      let handledLine: HandleLineReturnObject = new HandleLineReturnObject(
        'Empty',
      );
      let terminalBranch = true;
      for (const line of ctx.lines) {
        handledLine = this.handleLine(line, ctx);
        if (handledLine.type === 'IfStatement') {
          const { leftConstraint, rightConstraint, astBranch } =
            handledLine.ifStatement!;
          terminalBranch = false;
          // create a new context
          const leftCtx = new Ctx(
            astBranch.left,
            new Set(ctx.cstore),
            new Set(ctx.sstore),
          );
          // add the left constraint
          leftCtx.addConstraint(leftConstraint);
          // explore next branch
          stack.push({ ctx: leftCtx, lastConditional: line as Statement });

          const rightCtx = new Ctx(
            astBranch.right,
            new Set(ctx.cstore),
            new Set(ctx.sstore),
          );
          // add the right constraint
          rightCtx.addConstraint(rightConstraint);
          // explore the next branch
          stack.push({ ctx: rightCtx, lastConditional: line as Statement });
          terminalBranch = false;
          break;
        } else if (handledLine.type === 'ThrowStatement') {
          terminalBranch = true;
          break;
        }
      }
      if (terminalBranch) {
        await this.solveConstraintsAndOutputResults(
          handledLine,
          new Ctx(
            structuredClone(ctx.lines),
            new Set(ctx.cstore),
            new Set(ctx.sstore),
          ),
        );
      }
    }
  }

  // private async exploreBranch(ctx: Ctx, lastConditional?: Statement) {
  //   this.threadsRunning.push(true);
  //   this.saveToCache(ctx, lastConditional);
  //   if (!(await this.branchFeasible(new Set(ctx.cstore)))) {
  //     // console.log("Unfeasible path detected.")
  //     this.threadsRunning.pop();
  //     return;
  //   }
  //   if (this.searchStrategy === 'dfs') {
  //     this.exploreBranchDFS(ctx).finally(() => {
  //       this.threadsRunning.pop();
  //     });
  //   }
  //   // if (this.searchStrategy === "bfs") branchTerminationLineReturn = this.exploreBranchBFS(lines);
  // }

  // private async exploreBranchDFS(ctx: Ctx) {
  //   let terminalBranch = true;
  //   let handledLine: HandleLineReturnObject = new HandleLineReturnObject(
  //     'Empty',
  //   );
  //   for (const line of ctx.lines) {
  //     handledLine = this.handleLine(line, ctx);
  //     if (handledLine.type === 'IfStatement') {
  //       const { leftConstraint, rightConstraint, astBranch } =
  //         handledLine.ifStatement!;
  //       terminalBranch = false;
  //       // create a new context
  //       const leftCtx = new Ctx(
  //         astBranch.left,
  //         new Set(ctx.cstore),
  //         new Set(ctx.sstore),
  //       );
  //       // add the left constraint
  //       leftCtx.addConstraint(leftConstraint);
  //       // explore next branch
  //       this.exploreBranch(leftCtx, line as Statement);

  //       const rightCtx = new Ctx(
  //         astBranch.right,
  //         new Set(ctx.cstore),
  //         new Set(ctx.sstore),
  //       );
  //       // add the right constraint
  //       rightCtx.addConstraint(rightConstraint);
  //       // explore the next branch
  //       this.exploreBranch(rightCtx, line as Statement);
  //     } else if (handledLine.type === 'ThrowStatement') {
  //       terminalBranch = true;
  //       break;
  //     }
  //   }
  //   if (terminalBranch) {
  //     this.solveConstraintsAndOutputResults(
  //       handledLine,
  //       new Ctx(
  //         structuredClone(ctx.lines),
  //         new Set(ctx.cstore),
  //         new Set(ctx.sstore),
  //       ),
  //     ); // solve asynchronousely
  //     return handledLine;
  //   }
  // }

  private exploreBranchBFS(
    lines: (Directive | Statement | ModuleDeclaration)[],
  ) {
    // To implement
    return new HandleLineReturnObject('Empty');

    // let handledLines: HandleLineReturnObject[] = [];
    // for (const line of lines) {
    //     const handledLine = this.handleLine(line, lines as Statement[]);
    //     if (handledLine.type == "IfStatement") handledLines.push(handledLine);
    // }
    // for (const handledLine of handledLines) {
    //     const {leftConstraint, rightConstraint, astBranch} = handledLine.ifStatement!;
    //     // save the constraints here first
    //     let savedConstraints = new Set(this.cstore); // deep clone
    //     // add the left constraints
    //     this.addConstraintToCStore(leftConstraint!);
    //     // explore next branch
    //     this.exploreBranch(astBranch.left);
    //     // restore the saved constraints.
    //     this.cstore = savedConstraints;

    //     // add the right constraints
    //     this.addConstraintToCStore(rightConstraint!);
    //     // explore the next branch
    //     this.exploreBranch(astBranch.right);
    //     // restore the saved constraints.
    //     this.cstore = savedConstraints;
    // }
    // return this.handleLine;
  }

  private handleLine(
    line: Directive | Statement | ModuleDeclaration,
    ctx: Ctx,
  ): HandleLineReturnObject {
    if (line.type === 'VariableDeclaration') {
      this.handleVariableDecleration(line, ctx);
      return new HandleLineReturnObject('Empty');
    } else if (line.type === 'IfStatement') {
      // Fork in the AST.
      // First create constraints for left and right paths
      if (line.test.type !== 'BinaryExpression')
        throw Error(
          `${line.test.type} test in if statement not implemented in handleLine`,
        );
      const leftConstraint = new BooleanConstraint(
        this,
        ctx,
        line.test.left,
        line.test.right,
        line.test.operator,
      );
      const rightConstraint = leftConstraint.negate();
      // Create ASTBranch object that contains the divergent paths
      let astBranch: ASTBranch = { left: [], right: [] };
      const linesAfterConditionalBlock = ctx.lines.slice(
        ctx.lines.findIndex((l) => l === line) + 1,
      );
      if (line.consequent.type === 'BlockStatement')
        astBranch.left = (
          line.consequent.body as (Directive | Statement | ModuleDeclaration)[]
        ).concat(linesAfterConditionalBlock);
      else
        astBranch.left = [
          line.consequent as Directive | Statement | ModuleDeclaration,
        ].concat(linesAfterConditionalBlock);
      if (line.alternate) {
        if (line.alternate.type === 'BlockStatement')
          astBranch.right = (
            line.alternate.body as (Directive | Statement | ModuleDeclaration)[]
          ).concat(linesAfterConditionalBlock);
        else
          astBranch.right = [
            line.alternate as Directive | Statement | ModuleDeclaration,
          ].concat(linesAfterConditionalBlock);
      }
      return new HandleLineReturnObject('IfStatement', {
        leftConstraint,
        rightConstraint,
        astBranch,
      });
    } else if (line.type === 'ExpressionStatement') {
      if (line.expression.type === 'AssignmentExpression') {
        if (line.expression.operator === '=') {
          const constraint = new BooleanConstraint(
            this,
            ctx,
            line.expression.left as Expression,
            line.expression.right as Expression,
            '===',
            'assignment',
          );
          ctx.addConstraint(constraint);
        } else {
          throw Error(
            `Assignment operator "${line.expression.operator}" is not implemented in handleLine.`,
          );
          // can only handle = assignments at the moment. arithmatic assignments require update of all constraints - need new function!
        }
      }
      return new HandleLineReturnObject('Empty');
    } else if (line.type === 'ThrowStatement') {
      return new HandleLineReturnObject('ThrowStatement', undefined, line);
    } else {
      console.log(`${line.type} not implemented in handleLine`);
    }
    return new HandleLineReturnObject('Empty');
  }

  private handleVariableDecleration(line: VariableDeclaration, ctx: Ctx) {
    // If the given VariableDecleration is a new symbolic var declaration,
    // add new symbolic expression to the symbolic store.
    // Otherwise, add new constraint to the constraints store.
    for (const declaration of line.declarations) {
      let varName = '';
      if (declaration.id.type === 'Identifier') varName = declaration.id.name;
      else throw Error('Symbolic classes must be assigned to a variable.');
      const init = declaration.init;
      if (init) {
        if (
          init.type === 'NewExpression' &&
          init.callee.type === 'Identifier'
        ) {
          if (
            init.callee.name === 'SymbolicNumber' ||
            init.callee.name == 'Number'
          ) {
            let newSNumber = new SNumber(this, varName, true);
            ctx.sstore.add(newSNumber);
          }
        } else if (init.type === 'Literal') {
          if ((init.value as number) != undefined) {
            // Add the constraint to constraints store.
            let newSNumber = new SNumber(this, varName, true);
            ctx.sstore.add(newSNumber);
            let newConstraint = new BooleanConstraint(
              this,
              ctx,
              newSNumber,
              init.value as number,
              '===',
            );
            ctx.addConstraint(newConstraint);
          }
        } else
          throw Error(
            `In handleVariableDecleration: ${init.type} not implemented.`,
          );
      }
    }
  }

  private async branchFeasible(cstore: Set<Constraint>) {
    const solver = new this.Z3.Solver();
    for (const constraint of cstore) {
      const booleanConstraint = constraint as BooleanConstraint;
      if (booleanConstraint) solver.add(booleanConstraint.constraint!);
    }
    const check = await solver.check();

    return check === 'sat' ? true : false;
  }

  private async solveConstraintsAndOutputResults(
    handledLine: HandleLineReturnObject,
    ctx: Ctx,
  ) {
    const solver = new this.Z3.Solver();
    // printConstraints(ctx.cstore);
    for (const constraint of ctx.cstore) {
      const booleanConstraint = constraint as BooleanConstraint;
      if (booleanConstraint && booleanConstraint.constraint)
        solver.add(booleanConstraint.constraint!);
    }
    const check = await solver.check();
    if (check === 'sat') {
      // console.log('Execution branch reachable!');
      const model = solver.model();
      let results: { name: string; value: any }[] = [];
      for (const svar of ctx.sstore) {
        try {
          const value = (model.eval(svar.z3var) as IntNum).asString();
          results.push({ name: svar.name, value: value });
        } catch {
          continue;
        }
      }
      this.outputResults({ svars: results, finalLine: handledLine });
    } else {
      // console.log("execution branch unreachable.")
    }
  }

  private outputResults(result: seResult) {
    const index = getNextFileIndex(process.cwd() + '/' + this.writeDir);
    const jsonFileName = `${this.writeDir + '/' + index}.json`;
    writeFile(JSON.stringify(result, null, 2), jsonFileName); // Write the result object to the JSON file
  }

  private saveToCache(ctx: Ctx, lastConditional: Statement | undefined) {
    if (!this.writeCache) return;
    // There is probably a much more space efficient way to cache these constraints
    appendToFile(
      JSON.stringify({
        lastConditional: lastConditional,
        cstore: Array.from(ctx.cstore),
        sstore: Array.from(ctx.sstore),
      }) + '\n',
      `${this.writeDir + '/'}cache`,
    );
  }
}
