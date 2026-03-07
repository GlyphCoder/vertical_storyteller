import os
import json
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai
from dotenv import load_dotenv


# Load environment variables with explicit path
import sys
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
print(f"[INFO] Loading .env from: {env_path}")
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"[INFO] GEMINI_API_KEY loaded: {bool(GEMINI_API_KEY)}")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"[INFO] Gemini API configured successfully")
else:
    print(f"[ERROR] GEMINI_API_KEY not found in environment")


EPISODIC_SYSTEM_PROMPT = """
You are the 'Episodic Intelligence Engine,' an advanced AI designed to optimize vertical, short-form storytelling (90-second format).

Take the user's core story idea and decompose it into a highly engaging, retention-optimized vertical series (5 to 8 episodes).

You MUST output the result strictly as a JSON object that conforms to this schema (no surrounding explanation, no Markdown):

{
  "series_title": "string",
  "series_logline": "string",
  "total_episodes": "integer",
  "episodes": [
    {
      "episode_number": "integer",
      "episode_title": "string",
      "narrative_breakdown": "string",
      "emotional_arc_analysis": [
        {
          "time_block": "string",
          "dominant_emotion": "string",
          "engagement_level": "string",
          "flat_zone_warning": "boolean"
        }
      ],
      "cliffhanger_scoring": {
        "description": "string",
        "strength_score": "integer",
        "explanation": "string"
      },
      "retention_risk_prediction": [
        {
          "drop_off_timestamp": "string",
          "risk_level": "string",
          "reason_for_dropoff": "string"
        }
      ],
      "optimisation_suggestions": [
        "string"
      ]
    }
  ]
}

Rules:
- "total_episodes" must be between 5 and 8 inclusive.
- All timestamps must assume a single 90-second vertical video per episode.
- Do NOT include any keys beyond this schema.
- Do NOT wrap JSON in backticks.
- Do NOT include any natural language commentary outside the JSON.
"""


def _get_model(model_name: str) -> genai.GenerativeModel:
    return genai.GenerativeModel(
        model_name=model_name,
        system_instruction=EPISODIC_SYSTEM_PROMPT,
        generation_config={
            "temperature": 0.9,
            "top_p": 0.95,
            "top_k": 40,
            "response_mime_type": "application/json",
        },
    )


def _build_user_prompt(core_idea: str, desired_episodes: int, genre: str = "", tone: str = "", target_audience: str = "") -> str:
    extra_context = ""
    if genre:
        extra_context += f"\nGenre: {genre}"
    if tone:
        extra_context += f"\nTone: {tone}"
    if target_audience:
        extra_context += f"\nTarget Audience: {target_audience}"
    
    return f"""
Core story idea provided by the creator:

\"\"\"{core_idea}\"\"\"{extra_context}

Instructions:
- Decompose this idea into a vertical series optimized for short-form platforms.
- You MUST create exactly {desired_episodes} episodes (even though the global rule is 5–8).
- Assume each episode is a single 90-second vertical video.
- Respect the schema given in the system prompt.
- Output ONLY the final JSON object, no commentary or Markdown.
"""


def _safe_parse_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """Safely parse JSON with better error handling and logging."""
    if not raw_text:
        print(f"[DEBUG] _safe_parse_json: raw_text is empty")
        return None

    candidate = raw_text.strip()
    print(f"[DEBUG] _safe_parse_json: raw text length = {len(candidate)}, first 100 chars: {candidate[:100]}")
    
    # Find outermost braces - count braces to find the matching closing brace
    if "{" in candidate:
        start = candidate.find("{")
        # Find the matching closing brace by counting
        brace_count = 0
        end = start
        for i in range(start, len(candidate)):
            if candidate[i] == "{":
                brace_count += 1
            elif candidate[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    end = i + 1
                    break
        
        if brace_count != 0:
            print(f"[DEBUG] _safe_parse_json: Unmatched braces detected (count={brace_count})")
        
        candidate = candidate[start:end]
        print(f"[DEBUG] _safe_parse_json: Extracted JSON length = {len(candidate)}")

    try:
        parsed = json.loads(candidate)
        print(f"[DEBUG] _safe_parse_json: Successfully parsed JSON")
        return parsed
    except json.JSONDecodeError as e:
        print(f"[ERROR] _safe_parse_json: JSON parse error: {str(e)}")
        print(f"[ERROR] _safe_parse_json: Problematic text: {candidate[:200]}...")
        return None


def _compute_engine_metrics(series_json: Dict[str, Any]) -> Dict[str, Any]:
    """Heuristic metrics on top of LLM output for hackathon scoring."""
    episodes: List[Dict[str, Any]] = series_json.get("episodes", []) or []

    cliff_scores: List[int] = []
    high_risk_segments = 0
    medium_risk_segments = 0
    flat_zone_warnings = 0

    episode_flatness_index: List[Tuple[int, float]] = []

    for ep in episodes:
        ep_no = int(ep.get("episode_number", 0) or 0)
        emotional_arc = ep.get("emotional_arc_analysis", []) or []
        cliff = (ep.get("cliffhanger_scoring") or {}).get("strength_score")

        if isinstance(cliff, int):
            cliff_scores.append(cliff)

        # Count risk segments
        for risk in ep.get("retention_risk_prediction", []) or []:
            level = str(risk.get("risk_level", "")).lower()
            if "high" in level:
                high_risk_segments += 1
            elif "medium" in level:
                medium_risk_segments += 1

        # Compute a "flatness index" per episode: ratio of flat zones to arc points
        flat_blocks = 0
        for arc_point in emotional_arc:
            if bool(arc_point.get("flat_zone_warning", False)):
                flat_blocks += 1
                flat_zone_warnings += 1

        total_blocks = max(len(emotional_arc), 1)
        episode_flatness_index.append((ep_no, flat_blocks / total_blocks))

    avg_cliff = sum(cliff_scores) / len(cliff_scores) if cliff_scores else 0.0
    worst_flat = max(episode_flatness_index, key=lambda x: x[1])[0] if episode_flatness_index else None

    return {
        "avg_cliffhanger_strength": round(avg_cliff, 2),
        "high_risk_segments": high_risk_segments,
        "medium_risk_segments": medium_risk_segments,
        "flat_zone_warnings": flat_zone_warnings,
        "flattest_episode": worst_flat,
    }


def generate_episodic_intelligence(
    core_idea: str,
    desired_episodes: int,
    model_name: str = "gemini-3.1-flash-lite-preview",
    genre: str = "",
    tone: str = "",
    target_audience: str = "",
) -> Dict[str, Any]:
    """Single entry point used by API and Streamlit."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set.")

    try:
        print(f"[DEBUG] Initializing model: {model_name}")
        model = _get_model(model_name)
        
        print(f"[DEBUG] Building prompt...")
        prompt = _build_user_prompt(core_idea, desired_episodes, genre, tone, target_audience)
        
        print(f"[DEBUG] Calling Gemini API...")
        response = model.generate_content(prompt)
        
        print(f"[DEBUG] Response type: {type(response)}, has text: {hasattr(response, 'text')}")
        raw_text = getattr(response, "text", None)
        
        if not raw_text:
            raise ValueError(f"Gemini API returned empty text. Response: {response}")
        
        print(f"[DEBUG] Raw text length: {len(raw_text)}")
        parsed = _safe_parse_json(raw_text)
        
        if not parsed:
            raise ValueError(f"Failed to parse JSON from Gemini response. Raw text preview: {raw_text[:500]}")

        print(f"[DEBUG] Computing metrics...")
        engine_metrics = _compute_engine_metrics(parsed)

        return {
            "series": parsed,
            "engine_metrics": engine_metrics,
            "raw_text": raw_text,
        }
    except Exception as e:
        print(f"[ERROR] Exception in generate_episodic_intelligence: {str(e)}")
        raise


# ============================================================================
# NEW FEATURE ENGINES (Advanced Capabilities)
# ============================================================================

async def generate_character_development(
    core_idea: str,
    episodes: int,
    model_name: str = "gemini-3.1-flash-lite-preview",
) -> Dict[str, Any]:
    """Generate detailed character development arcs and profiles"""
    try:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        
        print(f"[DEBUG] Generating characters with model: {model_name}")
        model = genai.GenerativeModel(model_name=model_name)
        
        prompt = f"""
        Based on this story concept: "{core_idea}"
        
        Create detailed character profiles for a {episodes}-episode vertical series.
        For each character, provide:
        1. Character name and archetype
        2. Background/motivation
        3. Arc across the series
        4. Key personality traits
        5. Visual appearance suggestions
        
        Format as JSON with structure:
        {{
            "characters": [
                {{
                    "name": "string",
                    "archetype": "string",
                    "background": "string",
                    "character_arc": "string",
                    "traits": ["string"],
                    "visual_description": "string",
                    "appearance_evolution": ["string"]
                }}
            ],
            "ensemble_dynamics": "string"
        }}
        
        Output ONLY valid JSON, no markdown or explanations.
        """
        
        response = model.generate_content(prompt)
        raw_text = getattr(response, "text", None)
        parsed = _safe_parse_json(raw_text)
        
        return parsed or {"characters": [], "ensemble_dynamics": ""}
    except Exception as e:
        print(f"[ERROR] Exception in generate_character_development: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return {"characters": [], "ensemble_dynamics": ""}


async def generate_dialogue_suggestions(
    episode: Dict[str, Any],
    model_name: str = "gemini-3.1-flash-lite-preview",
) -> Dict[str, Any]:
    """Generate realistic dialogue suggestions for episodes"""
    try:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        
        print(f"[DEBUG] Generating dialogue with model: {model_name}")
        model = genai.GenerativeModel(model_name=model_name)
        
        ep_title = episode.get("episode_title", "Episode")
        narrative = episode.get("narrative_breakdown", "")
        
        prompt = f"""
        Create realistic dialogue snippets for this episode:
        Title: {ep_title}
        Narrative: {narrative}
        
        Provide natural, engaging dialogue that fits the 90-second format.
        Include:
        1. Opening hook dialogue (0-10 seconds)
        2. Mid-point tension dialogue (30-60 seconds)
        3. Cliffhanger dialogue (75-90 seconds)
        
        Each dialogue should be short, punchy, and engaging.
        Format as JSON:
        {{
            "dialogue_groups": [
                {{
                    "time_block": "string",
                    "speaker": "string (or 'Multiple')",
                    "lines": ["string"],
                    "emotion": "string",
                    "purpose": "string"
                }}
            ]
        }}
        
        Output ONLY valid JSON, no markdown.
        """
        
        response = model.generate_content(prompt)
        raw_text = getattr(response, "text", None)
        parsed = _safe_parse_json(raw_text)
        
        return parsed or {"dialogue_groups": []}
    except Exception as e:
        print(f"[ERROR] Exception in generate_dialogue_suggestions: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return {"dialogue_groups": []}


async def generate_visual_mood_board(
    core_idea: str,
    genre: str = "drama",
    model_name: str = "gemini-3.1-flash-lite-preview",
) -> Dict[str, Any]:
    """Generate visual mood board recommendations"""
    try:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        
        print(f"[DEBUG] Generating mood board with model: {model_name}")
        model = genai.GenerativeModel(model_name=model_name)
        
        prompt = f"""
        Create a comprehensive visual mood board guide for a vertical video series:
        Concept: {core_idea}
        Genre: {genre}
        
        Provide specific visual recommendations:
        1. Color palette (include hex codes)
        2. Camera filters/editing style
        3. Lighting design
        4. Location aesthetics
        5. Props and set design
        6. Typography/text overlays
        7. Transition styles
        8. Animation/VFX suggestions
        
        Format as JSON:
        {{
            "color_palette": {{
                "primary": ["string (hex)"],
                "secondary": ["string (hex)"],
                "accent": ["string (hex)"],
                "reasoning": "string"
            }},
            "camera_style": "string",
            "lighting_design": "string",
            "locations": ["string"],
            "props_and_sets": ["string"],
            "typography": "string",
            "transitions": ["string"],
            "vfx_suggestions": ["string"]
        }}
        
        Output ONLY valid JSON.
        """
        
        response = model.generate_content(prompt)
        raw_text = getattr(response, "text", None)
        parsed = _safe_parse_json(raw_text)
        
        return parsed or {"color_palette": {}, "camera_style": ""}
    except Exception as e:
        print(f"[ERROR] Exception in generate_visual_mood_board: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return {"color_palette": {}, "camera_style": ""}


async def generate_music_recommendations(
    emotional_arcs: List[Dict[str, Any]],
    model_name: str = "gemini-3.1-flash-lite-preview",
) -> Dict[str, Any]:
    """Generate music and sound design recommendations"""
    try:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        
        print(f"[DEBUG] Generating music recommendations with model: {model_name}")
        model = genai.GenerativeModel(model_name=model_name)
        
        emotions_summary = str(emotional_arcs)[:500]  # Truncate for API
        
        prompt = f"""
        Create music and sound design recommendations based on these emotional arcs:
        {emotions_summary}
        
        Provide specific music suggestions:
        1. Opening theme (genre, mood, tempo)
        2. Background music by emotion
        3. Sound effects recommendations
        4. Silence/breathing room placement
        5. Music swells for climactic moments
        6. Ending theme
        
        Include reference genres/artists where helpful.
        
        Format as JSON:
        {{
            "opening_theme": {{
                "genre": "string",
                "mood": "string",
                "tempo_bpm": "integer",
                "style": "string"
            }},
            "background_music": [
                {{
                    "emotion": "string",
                    "genre": "string",
                    "reference_artists": ["string"],
                    "duration": "string"
                }}
            ],
            "sound_effects": ["string"],
            "silence_placement": ["string"],
            "climactic_swells": ["string"],
            "ending_theme": "string"
        }}
        
        Output ONLY valid JSON.
        """
        
        response = model.generate_content(prompt)
        raw_text = getattr(response, "text", None)
        parsed = _safe_parse_json(raw_text)
        
        return parsed or {"opening_theme": {}, "background_music": []}
    except Exception as e:
        print(f"[ERROR] Exception in generate_music_recommendations: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return {"opening_theme": {}, "background_music": []}


async def generate_shot_composition(
    episode: Dict[str, Any],
    model_name: str = "gemini-3.1-flash-lite-preview",
) -> Dict[str, Any]:
    """Generate shot composition and framing suggestions"""
    try:
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set.")
        
        print(f"[DEBUG] Generating shot composition with model: {model_name}")
        model = genai.GenerativeModel(model_name=model_name)
        
        ep_title = episode.get("episode_title", "")
        narrative = episode.get("narrative_breakdown", "")
        
        prompt = f"""
        Create detailed shot composition guides for this episode of a vertical video:
        Title: {ep_title}
        Story: {narrative}
        
        Break down shots by time blocks:
        1. Opening shot (0-15s): Hook the viewer
        2. Build shots (15-60s): Develop the story
        3. Climax shot (60-75s): Peak moment
        4. Cliffhanger shot (75-90s): Leave them wanting more
        
        For each section provide:
        - Shot type (wide, medium, close-up, etc.)
        - Camera movement (pan, zoom, static)
        - Subject framing
        - Depth of field
        - Focus pulling
        
        Format as JSON:
        {{
            "shot_breakdown": [
                {{
                    "time_block": "string",
                    "shot_type": "string",
                    "camera_movement": "string",
                    "framing": "string",
                    "depth_of_field": "string",
                    "focus_pulling": "string",
                    "purpose": "string"
                }}
            ],
            "technical_notes": "string",
            "equipment_suggestions": ["string"]
        }}
        
        Output ONLY valid JSON.
        """
        
        response = model.generate_content(prompt)
        raw_text = getattr(response, "text", None)
        parsed = _safe_parse_json(raw_text)
        
        return parsed or {"shot_breakdown": [], "technical_notes": ""}
    except Exception as e:
        print(f"[ERROR] Exception in generate_shot_composition: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return {"shot_breakdown": [], "technical_notes": ""}

