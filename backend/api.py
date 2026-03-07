from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
import os
import json
import io
from typing import Optional, List
import base64
import google.generativeai as genai

from .episodic_engine import (
    generate_episodic_intelligence,
    generate_character_development,
    generate_dialogue_suggestions,
    generate_visual_mood_board,
    generate_music_recommendations,
    generate_shot_composition,
)

try:
    from google.cloud import texttospeech
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False


class AnalyseRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    core_idea: str = Field(..., description="Creator's core vertical series idea")
    episode_count: int = Field(
        6, ge=5, le=8, description="Number of episodes (5–8 inclusive)"
    )
    model_name: str = Field(
        "gemini-3.1-flash-lite-preview",
        description="Gemini model identifier",
    )
    genre: Optional[str] = Field("drama", description="Story genre")
    tone: Optional[str] = Field("dramatic", description="Narrative tone")
    target_audience: Optional[str] = Field("18-35", description="Target audience")


class CharacterRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    core_idea: str
    episode_count: int = 6
    model_name: str = "gemini-3.1-flash-lite-preview"


class DialogueRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    episode_data: dict
    model_name: str = "gemini-3.1-flash-lite-preview"


class MoodBoardRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    episode_data: dict
    model_name: str = "gemini-3.1-flash-lite-preview"


class MusicRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    emotional_arcs: List[dict]
    model_name: str = "gemini-3.1-flash-lite-preview"


class ShotCompositionRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    episode_data: dict
    model_name: str = "gemini-3.1-flash-lite-preview"


class TextToSpeechRequest(BaseModel):
    text: str = Field(..., description="Text to convert to speech")
    voice_name: str = Field("en-US-Neural2-C", description="Google Cloud voice")
    language_code: str = Field("en-US", description="Language code")


app = FastAPI(
    title="StoryArc AI - Episodic Intelligence Engine API",
    description="AI-powered narrative intelligence for vertical episodic storytelling.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/analyse")
async def analyse_story(payload: AnalyseRequest):
    """Generate complete episodic analysis with all features"""
    if not payload.core_idea.strip():
        raise HTTPException(status_code=400, detail="core_idea cannot be empty.")

    try:
        print(f"[DEBUG] Starting analysis for: {payload.core_idea[:50]}")
        
        # Generate main episodic intelligence
        print(f"[DEBUG] Calling generate_episodic_intelligence...")
        result = generate_episodic_intelligence(
            core_idea=payload.core_idea,
            desired_episodes=payload.episode_count,
            model_name=payload.model_name,
            genre=payload.genre,
            tone=payload.tone,
            target_audience=payload.target_audience,
        )
        print(f"[DEBUG] Result keys: {result.keys() if isinstance(result, dict) else type(result)}")
        
        # Generate character development
        print(f"[DEBUG] Calling generate_character_development...")
        character_data = await generate_character_development(
            core_idea=payload.core_idea,
            episodes=payload.episode_count,
            model_name=payload.model_name,
        )
        
        result["character_development"] = character_data
        print(f"[DEBUG] Added character_development")
        
        # Generate dialogue suggestions for first episode
        series = result.get("series", {})
        episodes = series.get("episodes", [])
        print(f"[DEBUG] Series keys: {series.keys() if isinstance(series, dict) else type(series)}")
        print(f"[DEBUG] Episodes count: {len(episodes) if isinstance(episodes, list) else type(episodes)}")
        
        if episodes and len(episodes) > 0:
            dialogue_data = await generate_dialogue_suggestions(
                episode=episodes[0],
                model_name=payload.model_name,
            )
            result["sample_dialogues"] = dialogue_data
            print(f"[DEBUG] Added sample_dialogues")
        
        # Generate visual mood board
        mood_board = await generate_visual_mood_board(
            core_idea=payload.core_idea,
            genre=payload.genre,
            model_name=payload.model_name,
        )
        result["visual_mood_board"] = mood_board
        print(f"[DEBUG] Added visual_mood_board")
        
        # Generate music recommendations
        emotional_arcs = []
        if episodes:
            for ep in episodes:
                if "emotional_arc_analysis" in ep:
                    emotional_arcs.extend(ep["emotional_arc_analysis"])
        
        music_recs = await generate_music_recommendations(
            emotional_arcs=emotional_arcs,
            model_name=payload.model_name,
        )
        result["music_recommendations"] = music_recs
        print(f"[DEBUG] Added music_recommendations")
        
        # Generate shot composition suggestions
        if episodes and len(episodes) > 0:
            shot_recs = await generate_shot_composition(
                episode=episodes[0],
                model_name=payload.model_name,
            )
            result["shot_composition"] = shot_recs
            print(f"[DEBUG] Added shot_composition")
        
        print(f"[DEBUG] Analysis complete. Final result keys: {result.keys()}")
        return result
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[ERROR] Exception occurred: {error_trace}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/characters")
async def get_characters(payload: CharacterRequest):
    """Generate detailed character development"""
    try:
        result = await generate_character_development(
            core_idea=payload.core_idea,
            episodes=payload.episode_count,
            model_name=payload.model_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/dialogue")
async def get_dialogue(payload: DialogueRequest):
    """Generate dialogue suggestions"""
    try:
        result = await generate_dialogue_suggestions(
            episode=payload.episode_data,
            model_name=payload.model_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/mood-board")
async def get_mood_board(payload: MoodBoardRequest):
    """Generate visual mood board recommendations"""
    try:
        result = await generate_visual_mood_board(
            core_idea=payload.episode_data.get("series_title", ""),
            genre="drama",
            model_name=payload.model_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/music")
async def get_music(payload: MusicRequest):
    """Generate music recommendations based on emotional arcs"""
    try:
        result = await generate_music_recommendations(
            emotional_arcs=payload.emotional_arcs,
            model_name=payload.model_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/shots")
async def get_shot_composition(payload: ShotCompositionRequest):
    """Generate shot composition suggestions"""
    try:
        result = await generate_shot_composition(
            episode=payload.episode_data,
            model_name=payload.model_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/tts")
async def text_to_speech(payload: TextToSpeechRequest):
    """Convert text to speech using Google Cloud TTS"""
    if not TTS_AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail="Text-to-speech not available. Set up Google Cloud credentials."
        )
    
    try:
        client = texttospeech.TextToSpeechClient()
        
        input_text = texttospeech.SynthesisInput(text=payload.text)
        
        voice = texttospeech.VoiceSelectionParams(
            language_code=payload.language_code,
            name=payload.voice_name,
        )
        
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        
        response = client.synthesize_speech(
            request={"input": input_text, "voice": voice, "audio_config": audio_config}
        )
        
        audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')
        
        return {
            "audio": audio_base64,
            "mime_type": "audio/mpeg",
            "duration_ms": len(response.audio_content) // 128,  # Approximate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "2.0.0"}


@app.get("/api/test-gemini")
async def test_gemini():
    """Test if Gemini API is accessible"""
    try:
        import os
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"status": "error", "message": "GEMINI_API_KEY not set"}
        
        model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
        response = model.generate_content("Say 'API is working' in one sentence")
        
        return {
            "status": "success",
            "gemini_working": True,
            "response": response.text if hasattr(response, 'text') else str(response)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


