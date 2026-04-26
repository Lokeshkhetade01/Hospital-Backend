// config/cloudinary.js
const cloudinary              = require('cloudinary').v2;
const { CloudinaryStorage }   = require('multer-storage-cloudinary');
const multer                  = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key:    process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Storage for doctor avatars + documents
const docStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:           'hms/documents',
    allowed_formats:  ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type:    'auto',
  },
});

// Storage for prescription attachments / reports
const reportStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'hms/reports',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type:   'auto',
  },
});

module.exports = {
  cloudinary,
  uploadDoc:    multer({ storage: docStorage }),
  uploadReport: multer({ storage: reportStorage }),
};
