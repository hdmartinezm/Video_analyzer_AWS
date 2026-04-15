const { Readable } = require('stream');
const { processYouTubeViaTranscript } = require('../services/youtubeTranscriptService');
const { uploadVideoToS3, getLatestJsonInFolder, getLatestTextFileInFolder } = require('../services/s3Service');

// Helper function to handle the common logic of uploading a video stream to S3 and responding.
const uploadStreamAndRespond = async (res, fileName, videoStream, mimetype) => {
  try {
    const s3Uri = await uploadVideoToS3(fileName, videoStream, mimetype);
    console.log(`Video subido a S3: ${s3Uri}`);
    res.status(202).json({ fileName });
  } catch (error) {
    console.error('Error al subir el video a S3:', error);
    res.status(500).json({ message: 'Error interno del servidor al procesar el video', error: error.message });
  }
};

const processVideo = async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ message: 'No se proporcionó URL de video.' });
    }
    const fileName = await processYouTubeViaTranscript(videoUrl);
    res.status(202).json({ fileName });
  } catch (error) {
    console.error('Error al procesar la URL de YouTube:', error);
    res.status(500).json({ message: error.message || 'Error al procesar la URL de YouTube' });
  }
};

const handleVideoUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo.' });
  }
  try {
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const videoStream = Readable.from(req.file.buffer);
    await uploadStreamAndRespond(res, fileName, videoStream, req.file.mimetype);
  } catch (error) {
    console.error('Error al procesar el video subido:', error);
    res.status(500).json({ message: 'Error interno del servidor al procesar el video subido', error: error.message });
  }
};

// Helper function to safely fetch data from S3, returning null if the object is not found.
const safelyFetchData = async (fetchFunction, ...args) => {
  try {
    return await fetchFunction(...args);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return null; // Return null if the file doesn't exist yet
    }
    throw error; // Re-throw other errors
  }
};

const getTranscriptionResults = async (req, res) => {
  try {
    // Fetch all results concurrently
    const [mainTranscript, chaptersData, summaryEn, summaryEs, transcriptionEn, transcriptionEs] = await Promise.all([
      safelyFetchData(getLatestJsonInFolder, 'transcriptions/'),
      safelyFetchData(getLatestJsonInFolder, 'Chapters/'),
      safelyFetchData(getLatestTextFileInFolder, 'outputs/', 'resumen-en', '.txt'),
      safelyFetchData(getLatestTextFileInFolder, 'outputs/', 'resumen-es', '.txt'),
      safelyFetchData(getLatestTextFileInFolder, 'outputs/', 'transcripcion-en', '.txt'),
      safelyFetchData(getLatestTextFileInFolder, 'outputs/', 'transcripcion-es', '.txt')
    ]);

    // Essential files must be present before returning COMPLETED
    if (!mainTranscript || !chaptersData || !summaryEn || !summaryEs || !transcriptionEn || !transcriptionEs) {
      return res.json({ status: 'PENDING' });
    }

    const results = {
      summary: mainTranscript.results.transcripts[0].transcript,
      summaryEnglish: summaryEn,
      summarySpanish: summaryEs,
      transcriptionEnglish: transcriptionEn,
      transcriptionSpanish: transcriptionEs,
      chapters: chaptersData.map(c => `${c.capitulo} (${c.inicio})`)
    };

    res.json({ status: 'COMPLETED', results });

  } catch (error) {
    console.error('Error al obtener los resultados de la transcripción:', error);
    res.status(500).json({ message: 'Error al obtener los resultados de la transcripción', error: error.message });
  }
};

module.exports = { processVideo, getTranscriptionResults, handleVideoUpload };
