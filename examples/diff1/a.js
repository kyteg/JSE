import { SymbolicNumber } from "../build/instrumentation/symbols.js"

let answer = new SymbolicNumber();
let a = 42;
if (answer === 42){
    console.log('the answer');
} else {
    console.log("not the answer");
}
console.log(answer);