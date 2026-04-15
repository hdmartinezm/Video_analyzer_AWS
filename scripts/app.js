import { videoUrlInput, videoFileInput, submitBtn } from './utils/domElements.js';
import { showLoader, hideLoader, showResults, showError, updateStatusMessage } from './utils/display.js';
import { startVideoProcess, uploadVideoFile, checkTranscriptionResults } from './services/videoProcessor.js';

// Ensure exclusivity between URL and file inputs
videoUrlInput.addEventListener('input', () => {
  videoFileInput.value = null;
});

videoFileInput.addEventListener('change', () => {
  videoUrlInput.value = '';
});

const pollTranscriptionResults = (fileName, videoUrl) => {
  const interval = setInterval(async () => {
    try {
      const statusResult = await checkTranscriptionResults(fileName);
      
      if (statusResult.status === 'PENDING') {
        updateStatusMessage('El video se está procesando...');
      } else if (statusResult.status === 'COMPLETED') {
        clearInterval(interval);
        showResults(statusResult.results, videoUrl);
        hideLoader();
      } else if (statusResult.status === 'FAILED') {
        clearInterval(interval);
        showError(`La transcripción falló: ${statusResult.message}`);
        hideLoader();
      }
    } catch (error) {
      clearInterval(interval);
      console.error('Error durante el sondeo:', error);
      showError(error.message || 'Ocurrió un error al verificar el estado.');
      hideLoader();
    }
  }, 5000); // Consultar cada 5 segundos
};

submitBtn.addEventListener('click', async (event) => {
  event.preventDefault(); // Prevent any default browser action
  const videoUrl = videoUrlInput.value;
  const videoFile = videoFileInput.files[0];

  if (!videoUrl && !videoFile) {
    showError('Por favor, ingresa una URL o selecciona un archivo MP4.');
    return;
  }

  showLoader();

  try {
    let fileName;
    let sourceUrl; // Renamed for clarity

    if (videoFile) {
      // Create a local URL for the video file to display it immediately
      sourceUrl = URL.createObjectURL(videoFile);
      fileName = await uploadVideoFile(videoFile);
    } else {
      sourceUrl = videoUrl;
      fileName = await startVideoProcess(videoUrl);
    }

    updateStatusMessage('Video subido. Esperando transcripción...');
    pollTranscriptionResults(fileName, sourceUrl);
  } catch (error) {
    console.error('Error al procesar el video:', error);
    showError(error.message || 'Ocurrió un error al procesar el video. Por favor, inténtalo de nuevo.');
    hideLoader();
  }
});
