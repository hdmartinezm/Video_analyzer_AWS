import { loader, resultsContainer, submitBtn, summaryBox, englishBox, spanishBox, chaptersBox, transcriptionEnBox, transcriptionEsBox, statusBox, videoPlayerContainer, videoTitle, videoDescription, chaptersCount, mainContainer } from './domElements.js';

// Global variables for players
let youtubePlayer = null;
let mp4Player = null;
let playerReady = false;
let pendingSeek = null;
let activePlayer = null; // 'youtube' or 'mp4'

export const showLoader = () => {
  mainContainer.style.display = 'none';
  resultsContainer.style.display = 'none';
  statusBox.textContent = '';
  statusBox.style.display = 'block';
  loader.style.display = 'block';
  submitBtn.textContent = 'Procesando...';
  submitBtn.disabled = true;
};

export const hideLoader = () => {
  loader.style.display = 'none';
  statusBox.style.display = 'none';
  submitBtn.textContent = 'Procesar';
  submitBtn.disabled = false;
};

export const showResults = (results, videoSource) => {
  // Reset player state for new video
  playerReady = false;
  pendingSeek = null;
  youtubePlayer = null;
  mp4Player = null;
  activePlayer = null;

  // Clear previous content and set up player containers
  videoPlayerContainer.innerHTML = `
    <div id="video-player" style="display: none; position: relative; padding-bottom: 56.25%; overflow: hidden; width: 100%; background-color: #000;">
      <iframe id="youtube-player" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    <video id="mp4-player" controls style="display: none; width: 100%;"></video>
  `;
  summaryBox.querySelector('.scrollable-content').innerHTML = '';
  englishBox.querySelector('.scrollable-content').innerHTML = '';
  spanishBox.querySelector('.scrollable-content').innerHTML = '';
  chaptersBox.querySelector('.scrollable-content').innerHTML = '';
  transcriptionEnBox.querySelector('.scrollable-content').innerHTML = '';
  transcriptionEsBox.querySelector('.scrollable-content').innerHTML = '';

  // Populate video player and details
  if (typeof videoSource === 'string' && videoSource.includes('youtube.com/watch?v=')) {
    // Handle YouTube video
    activePlayer = 'youtube';
    const youtubePlayerContainer = document.getElementById('video-player');
    youtubePlayerContainer.style.display = 'block';

    const videoId = videoSource.split('v=')[1].split('&')[0];
    const youtubeIframe = document.getElementById('youtube-player');
    youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;

    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
      window.onYouTubeIframeAPIReady = initializeYouTubePlayer;
    } else {
      initializeYouTubePlayer();
    }

  } else {
    // Handle MP4 video file (from a local blob URL)
    activePlayer = 'mp4';
    mp4Player = document.getElementById('mp4-player');
    mp4Player.style.display = 'block';
    mp4Player.src = videoSource;
    playerReady = true; // MP4 player is ready immediately
  }

  videoTitle.textContent = results.title || 'Título del Video';
  videoDescription.textContent = results.description || 'Descripción no disponible.';

  summaryBox.querySelector('.scrollable-content').innerHTML = `<p>${results.summary || 'No se encontró transcripción.'}</p>`;
  englishBox.querySelector('.scrollable-content').innerHTML = `<p>${results.summaryEnglish || 'No summary found.'}</p>`;
  spanishBox.querySelector('.scrollable-content').innerHTML = `<p>${results.summarySpanish || 'No se encontró resumen.'}</p>`;
  transcriptionEnBox.querySelector('.scrollable-content').innerHTML = `<p>${results.transcriptionEnglish || 'No transcription found.'}</p>`;
  transcriptionEsBox.querySelector('.scrollable-content').innerHTML = `<p>${results.transcriptionSpanish || 'No se encontró transcripción.'}</p>`;

  let chaptersHtml = '';
  if (results.chapters && results.chapters.length > 0) {
    chaptersHtml += `<ul>`;
    results.chapters.forEach(chapter => {
      const timeMatch = chapter.match(/(\d+:\d+:\d+)/);
      if (timeMatch) {
        const time = timeMatch[1];
        const timeParts = time.split(':').map(Number);
        const seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
        chaptersHtml += `<li><a href="#" data-time="${seconds}">${chapter}</a></li>`;
      } else {
        chaptersHtml += `<li>${chapter}</li>`;
      }
    });
    chaptersHtml += `</ul>`;
    chaptersCount.textContent = results.chapters.length;
  } else {
    chaptersHtml = `<p class="placeholder-text">No se encontraron capítulos.</p>`;
    chaptersCount.textContent = '0';
  }
  chaptersBox.querySelector('.scrollable-content').innerHTML = chaptersHtml;

  mainContainer.style.display = 'none';
  resultsContainer.style.display = 'flex';
};

function initializeYouTubePlayer() {
    youtubePlayer = new window.YT.Player('youtube-player', {
      events: {
        'onReady': () => {
          playerReady = true;
          if (pendingSeek !== null) {
            youtubePlayer.seekTo(pendingSeek);
            pendingSeek = null;
          }
        },
        'onError': (error) => console.error('YouTube player error:', error),
      }
    });
}

chaptersBox.addEventListener('click', (event) => {
  if (event.target.tagName === 'A' && event.target.hasAttribute('data-time')) {
    event.preventDefault();
    const seconds = parseInt(event.target.getAttribute('data-time'));

    if (!playerReady) {
      pendingSeek = seconds;
      return;
    }

    if (activePlayer === 'youtube' && youtubePlayer && youtubePlayer.seekTo) {
      youtubePlayer.seekTo(seconds);
    } else if (activePlayer === 'mp4' && mp4Player) {
      mp4Player.currentTime = seconds;
    }
  }
});

export const showError = (message) => {
  alert(message);
  hideLoader();
};

export const updateStatusMessage = (message) => {
  statusBox.textContent = message;
};
