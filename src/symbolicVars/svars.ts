import { Arith } from 'z3-solver';
import { SeEngine } from '../se.js';

export class SVar {
  public engine: SeEngine;
  public name: string;
  public z3var: Arith<'main'>;
  public tracked: boolean;
  constructor(engine: SeEngine, name: string, tracked?: boolean) {
    this.engine = engine;
    this.name = name;
    this.z3var = this.engine.Z3.Real.const(name);
    this.tracked = tracked ?? false;
  }
}

export class SNumber extends SVar {
  constructor(engine: SeEngine, name: string, tracked?: boolean) {
    super(engine, name, tracked);
  }
}
