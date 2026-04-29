// models/faq.model.js

// import mongoose from "mongoose";
const mongoose = require("mongoose")
const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// export const FAQ = mongoose.model("FAQ", faqSchema);
const faq = mongoose.model("faq",faqSchema)
module.exports = faq