import os
import logging

try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
    load_dotenv(dotenv_path=env_path)
except ImportError:
    logging.warning("python-dotenv module is not installed. Will use system environment variables.")

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    logging.warning("google-generativeai module is not installed. LLM features will be disabled.")

def get_gemini_client():
    """
    Initializes and returns the Gemini generative model.
    """
    if not HAS_GENAI:
        return None
        
    api_key = os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-2.5-flash')

def is_llm_available() -> bool:
    """
    Check if the LLM_API_KEY environment variable is set.
    """
    if not HAS_GENAI:
        return False
    api_key = os.getenv("LLM_API_KEY") or os.getenv("GEMINI_API_KEY")
    return bool(api_key and api_key.strip())
