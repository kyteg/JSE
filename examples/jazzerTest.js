export function fuzz(data) {
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


function main(data) {
    let [a1, a2, a3] = splitBuffer(data, 3);
    if (a1 < 499999){
        console.log('athe answer');
        if (a2 > 123454) {
            console.log("a2!")
            if (a3 === 55555) {
                console.log("a3!")
                throw Error("abc")
            }
        }
    } else {
        console.log("not the answer");
    }
    console.log(a1);
}