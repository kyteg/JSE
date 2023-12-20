import { Bool } from 'z3-solver';
import { SeEngine } from '../se.js';
import { SVar } from '../symbolicVars/svars.js';

export abstract class Constraint {
  public engine: SeEngine;
  public constraint: Bool<'main'> | undefined;
  public type: 'boolean' | 'assignment';

  constructor(engine: SeEngine, type: 'boolean' | 'assignment') {
    this.engine = engine;
    this.type = type;
  }

  public reconstruct(engine: SeEngine, svars: SVar[]) {
    this.engine = engine;
    console.log(this.constraint?.sexpr);
  }

  public getType() {
    return this.type;
  }
}
