// controllers/FaqController.js
const mongoose = require("mongoose")
const Faq =require("../models/Faq")

// ➕ Add Faq (Admin)
exports.createFaq = async (req, res) => {
  try {
    const { question, answer } = req.body;

    const faq = await Faq.create({ question, answer });

    res.status(201).json({
      success: true,
      message: "Faq created",
      faq
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📄 Get All Faqs (Public)
exports.getFaq = async (req, res) => {
  try {
    const Faqs = await Faq.find().sort({ createdAt: -1 });
    const total = Faqs.length;
    res.status(200).json({
      success: true,
      total:total,
      Faqs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.updateFaq = async (req, res) => {
  try {
    const faq = await Faq.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Faq updated",
      faq
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ❌ Delete Faq (Admin)
exports.deleteFaq = async (req, res) => {
  try {
    await Faq.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Faq deleted"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};