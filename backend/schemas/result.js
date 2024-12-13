const mongoose = require('mongoose');
const { Schema, Mixed } = mongoose;

const nodeResultSchema = new Schema({
    node_id: { type: String, required: true }, // ID of the node
    data_out: { type: Mixed, default: {} }, // Output data produced by the node, can be an object or a Map
    data_in: { type: Mixed, default: {} }, // Input data received by the node
    paths_in: { type: [String], default: [] }, // Array of input paths
    paths_out: { type: [String], default: [] }, // Array of output paths
    timestamp: { type: Date, default: Date.now }, // Time when the node processed data
    status: { type: String, enum: ['unprocessed', 'processed', 'unknown'], default: 'unprocessed' }, // Processing status
    level: { type: Number, default: null }, // Level of the node in traversal
    is_enabled: { type: Boolean, default: null }, // Node enablement status
});

const resultSchema = new Schema({
    node_results: {
        type: Map, // A map to store results for each node
        of: nodeResultSchema,
        required: true,
    },
    run_id: { type: String, required: true }, // Unique identifier for the run
    graph_id: { type: String, required: true }, // Reference to the graph associated with this run
    graph_config: {
        enable_list: [String], // List of enabled nodes
        disable_list: [String], // List of disabled nodes
        root_inputs: { type: Map, of: Mixed }, // Mapping of root nodes and their inputs
        data_overwrites: { type: Map, of: Mixed }, // Mapping for data overwrites
    },
    topological_order: {
        type: [String], 
        default: [],
    },
    islands: {
        type: Map,
        default: [],
    },
});

module.exports = mongoose.model('Result', resultSchema);