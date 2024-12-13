const mongoose = require('mongoose');
const { Schema } = mongoose;

const nodeSchema = new Schema({
    node_id: { type: String, unique: true, required: true },
    data_in: { type: Map, of: Schema.Types.Mixed, default: {} },  // Stores input data for the node
    data_out: { type: Map, of: Schema.Types.Mixed, default: {} }, // Stores output data for the node
    paths_in: [{ type: Schema.Types.ObjectId, ref: 'Edge' }],     // Incoming edges 
    paths_out: [{ type: Schema.Types.ObjectId, ref: 'Edge' }],    // Outgoing edges 
});

module.exports = mongoose.model('Node', nodeSchema);
