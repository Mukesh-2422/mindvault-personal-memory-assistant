const fs = require("fs");
const path = require("path");

/**
 * Audio Transcription Controller
 * Supports Groq Whisper API, OpenAI Whisper API, and graceful fallback.
 */
exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No audio file provided. Please upload an audio file.",
      });
    }

    const audioBuffer = req.file.buffer || (req.file.path ? fs.readFileSync(req.file.path) : null);
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Audio file is empty or unreadable.",
      });
    }

    const filename = req.file.originalname || `recording_${Date.now()}.webm`;
    const mimeType = req.file.mimetype || "audio/webm";

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let transcript = "";

    // 1. Try Groq Whisper API if GROQ_API_KEY is configured
    if (groqKey) {
      try {
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: mimeType });
        formData.append("file", audioBlob, filename);
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("response_format", "json");

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
          },
          body: formData,
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          transcript = data.text || "";
        } else {
          const errText = await groqRes.text().catch(() => "");
          console.warn(`[Transcribe] Groq Whisper API returned ${groqRes.status}:`, errText);
        }
      } catch (groqErr) {
        console.warn("[Transcribe] Groq transcription error:", groqErr.message);
      }
    }

    // 2. Try OpenAI Whisper API if transcript is still empty and OPENAI_API_KEY is configured
    if (!transcript && openaiKey) {
      try {
        const formData = new FormData();
        const audioBlob = new Blob([audioBuffer], { type: mimeType });
        formData.append("file", audioBlob, filename);
        formData.append("model", "whisper-1");
        formData.append("response_format", "json");

        const openAiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
          body: formData,
        });

        if (openAiRes.ok) {
          const data = await openAiRes.json();
          transcript = data.text || "";
        } else {
          const errText = await openAiRes.text().catch(() => "");
          console.warn(`[Transcribe] OpenAI Whisper API returned ${openAiRes.status}:`, errText);
        }
      } catch (openAiErr) {
        console.warn("[Transcribe] OpenAI transcription error:", openAiErr.message);
      }
    }

    // Clean up temporary file if saved to disk by multer
    if (req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.warn("[Transcribe] Temp file cleanup notice:", cleanupErr.message);
      }
    }

    // If transcription succeeded via API
    if (transcript && transcript.trim()) {
      return res.json({
        success: true,
        transcript: transcript.trim(),
      });
    }

    // Fallback response if no API keys are configured or providers failed
    if (!groqKey && !openaiKey) {
      console.info(
        "[Transcribe] Notice: Neither GROQ_API_KEY nor OPENAI_API_KEY is set in backend .env. Returning guidance."
      );
      return res.json({
        success: true,
        transcript: "Voice recording captured",
        notice: "Set GROQ_API_KEY or OPENAI_API_KEY in backend/.env for AI Whisper transcription.",
      });
    }

    return res.status(502).json({
      success: false,
      error: "Transcription service was unable to process the audio. Please try speaking again.",
      transcript: "",
    });
  } catch (error) {
    console.error("[Transcribe] Unexpected error during audio transcription:", error);
    return res.status(500).json({
      success: false,
      error: "Audio transcription failed. Please try again.",
      details: error.message,
    });
  }
};
