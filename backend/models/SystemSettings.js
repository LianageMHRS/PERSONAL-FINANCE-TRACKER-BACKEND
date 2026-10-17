const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, unique: true },
    spendingLimit: { type: Number, required: true }, // Minimum 1 to prevent invalid values
  },
  { timestamps: true }
);

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema);
module.exports = SystemSettings;