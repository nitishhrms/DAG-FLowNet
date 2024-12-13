function processFunction(data_in) {
    const data_out = new Map();

    // Example: Sum all numeric values in `data_in` and store in `data_out`
    let sum = 0;
    for (const [key, value] of data_in.entries()) {
        if (typeof value === 'number') {
            sum = 2 * value;
        }
    }

    data_out.set('sum', sum);

    return data_out;
}

module.exports = processFunction;