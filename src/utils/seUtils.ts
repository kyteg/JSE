import { Constraint } from '../constraint/constraint.js';

export function printConstraints(cset: Set<Constraint>) {
  for (const constraint of cset) {
    console.log(constraint.constraint?.sexpr());
  }
}

export function getConstraintSymbolicVar(constraint: Constraint) {
  return constraint.constraint?.sexpr().split(' ')[1]!;
}
