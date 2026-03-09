import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "c:\\Users\\Veer\\Desktop\\hackamind\\latent-space-hackamined\\backend"))

from src.genai.llm_client import is_llm_available, get_gemini_client

print(f"LLM Available: {is_llm_available()}")
client = get_gemini_client()
if client:
    print("Client configured successfully!")
    try:
        response = client.generate_content("Say hello test")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error generating content: {e}")
else:
    print("Client is None")
