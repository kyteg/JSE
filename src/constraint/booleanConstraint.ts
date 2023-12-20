import { BinaryOperator, Expression } from 'estree';
import { Arith, Bool } from 'z3-solver';
import { Ctx, SeEngine } from '../se.js';
import { SVar } from '../symbolicVars/svars.js';
import { Constraint } from './constraint.js';

export class BooleanConstraint extends Constraint {
  public ctx: Ctx | undefined;
  public lhsRaw: Expression | SVar | number | undefined;
  public rhsRaw: Expression | SVar | number | undefined;
  public operator: BinaryOperator | undefined;
  constructor(
    engine: SeEngine,
    ctx?: Ctx,
    lhsRaw?: Expression | SVar | number,
    rhsRaw?: Expression | SVar | number,
    operator?: BinaryOperator,
    type?: 'boolean' | 'assignment',
  ) {
    super(engine, type ?? 'boolean');
    this.ctx = ctx;
    this.lhsRaw = lhsRaw;
    this.rhsRaw = rhsRaw;
    this.operator = operator;
    // check if lhs and/or rhs are symbolic variables.
    if (!ctx || !lhsRaw || !rhsRaw || !operator) {
      return;
    }
    const lhs = convertToSVarOrValue(lhsRaw, ctx);
    const rhs = convertToSVarOrValue(rhsRaw, ctx);
    if ((lhs as SVar) != undefined || (rhs as SVar) != undefined) {
      const var1 = (lhs as SVar) ?? (rhs as SVar);
      let var2: number | Arith<'main'>;
      if (lhs as SVar) {
        var2 = (rhs as number) ?? (rhs as SVar).z3var;
      } else {
        var2 = (lhs as number) ?? (lhs as SVar).z3var;
      }
      if ((var2 as SVar | number) != undefined) {
        if (operator === '==' || operator == '===')
          this.constraint = var1.z3var.eq(var2);
        else if (operator === '!=') this.constraint = var1.z3var.neq(var2);
        else if (operator === '>') this.constraint = var1.z3var.gt(var2);
        else if (operator === '>=') this.constraint = var1.z3var.ge(var2);
        else if (operator === '<') this.constraint = var1.z3var.lt(var2);
        else if (operator === '<=') this.constraint = var1.z3var.le(var2);
        else
          throw Error(
            `${operator} not implemented in constructor of Constraint`,
          );
      }
    } else {
      throw Error(
        'Neither side of if comparison was a symbolic variable. This branch is not currently implemented!',
      );
    }
  }

  public negate() {
    let newConstraint = new BooleanConstraint(this.engine);
    const constraint = this.constraint as Bool<'main'>;
    newConstraint.constraint = constraint.not();
    return newConstraint;
  }
}

function convertToSVarOrValue(expr: Expression | SVar | number, ctx: Ctx) {
  if (expr instanceof SVar) {
    return expr as SVar;
  } else if ((expr as Expression) !== undefined) {
    const lhsExpr = expr as Expression;
    if (lhsExpr.type === 'Identifier') {
      const svar = ctx.searchSstore(lhsExpr.name);
      if (svar) return svar;
    }
  }
  // The expression is not symbolic var.
  if ((expr as Expression) !== undefined) {
    const lhsExpr = expr as Expression;
    if (lhsExpr.type === 'Literal') return lhsExpr.value;
  }
  if ((expr as number) !== undefined) {
    return expr as number;
  }
  const nonsymExpr = expr as Expression;
  if (nonsymExpr.type === 'Literal') return nonsymExpr.value;
  else
    throw Error(
      `${nonsymExpr.type} not implemented in convertToSVar in Constraint constructor`,
    );
}
