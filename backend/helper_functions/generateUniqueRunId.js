function generateRandomRunId() {
    return `run_${Math.random().toString(36).substring(2, 15)}`;
}

module.exports = generateRandomRunId;