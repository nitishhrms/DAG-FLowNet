const mongoose = require('mongoose');
const { Schema } = mongoose;

const graphSchema = new Schema({
    name: { type: String, required: true },         // Name or identifier for the graph
    nodes: [{ type: Schema.Types.ObjectId, ref: 'Node' }], // List of node references
    edges: [{ type: Schema.Types.ObjectId, ref: 'Edge' }], // List of edge references
    created_at: { type: Date, default: Date.now },  // Timestamp
});

module.exports = mongoose.model('Graph', graphSchema);