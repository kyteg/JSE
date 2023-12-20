import { SymbolicNumber } from "../build/instrumentation/symbols.js"

let answer = new SymbolicNumber();
let a = new SymbolicNumber();
if (answer < 42){
    console.log('the answer');
    if (a < 30) {
        let b = 2;
        let anotherOne = new SymbolicNumber();
        if (anotherOne > 1000) {
            throw Error("another error")
        }
    } else {
        let c = 2;
        throw Error("error");
    }
} else {
    console.log("not answer");
}
console.log(answer);