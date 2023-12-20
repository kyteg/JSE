import * as esprima from 'esprima';
import { Directive, ModuleDeclaration, Statement } from 'estree';

export interface ASTBranch {
  left: (Directive | Statement | ModuleDeclaration)[];
  right: (Directive | Statement | ModuleDeclaration)[];
}

export function createAST(program: string) {
  return esprima.parseModule(program);
}

export function areObjectsEqual(objA: any, objB: any): boolean {
  // Check if the objects are of the same type
  if (typeof objA !== typeof objB) {
    return false;
  }

  if (typeof objA !== 'object' || objA === null || objB === null) {
    return objA === objB;
  }

  // Get the keys of both objects
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  // Check if the number of keys is the same
  if (keysA.length !== keysB.length) {
    return false;
  }

  // Recursively compare the values of each property
  for (const key of keysA) {
    if (!areObjectsEqual(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}
