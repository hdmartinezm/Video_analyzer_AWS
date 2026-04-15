const express = require('express');
const multer = require('multer');
const router = express.Router();
const { processVideo, getTranscriptionResults, handleVideoUpload } = require('../controllers/videoController');

// Configuración de Multer para almacenamiento en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/process-video', processVideo);
router.post('/upload-video', upload.single('video'), handleVideoUpload);
router.get('/results/:fileName', getTranscriptionResults);

module.exports = router;
