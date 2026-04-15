const { YoutubeTranscript } = require('youtube-transcript');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const sfn = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.S3_BUCKET_NAME;
const SFN_ARN = process.env.SFN_ARN;

const extractVideoId = (url) => {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  if (!match) throw new Error('URL de YouTube inválida');
  return match[1];
};

const processYouTubeViaTranscript = async (videoUrl) => {
  const videoId = extractVideoId(videoUrl);
  const jobName = `yt-${videoId}-${Date.now()}`;

  // Obtener captions directamente de YouTube (endpoint público, sin bot detection)
  let transcriptItems;
  try {
    transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    throw new Error(`No se encontraron subtítulos para este video. Asegúrate de que el video tenga captions habilitados. (${err.message})`);
  }

  if (!transcriptItems || transcriptItems.length === 0) {
    throw new Error('El video no tiene subtítulos disponibles. Sube el video como archivo MP4.');
  }

  // Construir texto completo
  const fullText = transcriptItems.map(t => t.text).join(' ').replace(/\n/g, ' ').trim();

  // Escribir en formato compatible con el output de Amazon Transcribe
  const transcribeJson = {
    jobName,
    status: 'COMPLETED',
    results: {
      transcripts: [{ transcript: fullText }],
      language_code: 'auto',
      items: transcriptItems.map(t => ({
        start_time: String((t.offset || 0) / 1000),
        end_time: String(((t.offset || 0) + (t.duration || 0)) / 1000),
        alternatives: [{ confidence: '1.0', content: t.text }],
        type: 'pronunciation'
      }))
    }
  };

  // Subir transcript a S3
  const transcriptKey = `transcriptions/${jobName}.json`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: transcriptKey,
    Body: JSON.stringify(transcribeJson),
    ContentType: 'application/json'
  }));

  // Iniciar Step Functions saltando el paso de Transcribe
  await sfn.send(new StartExecutionCommand({
    stateMachineArn: SFN_ARN,
    name: jobName,
    input: JSON.stringify({
      bucket: BUCKET,
      key: `raw-videos/${jobName}.mp4`,
      jobName,
      s3_url: `s3://${BUCKET}/raw-videos/${jobName}.mp4`,
      transcriptReady: true,
      transcriptKey
    })
  }));

  return jobName;
};

module.exports = { processYouTubeViaTranscript };
