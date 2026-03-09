import os
import sys

print("Current Working Directory:", os.getcwd())

try:
    from dotenv import load_dotenv, find_dotenv
    env_file = find_dotenv()
    print("Found .env file at:", env_file)
    load_dotenv()
    print("GEMINI_API_KEY from os.environ:", "Present" if os.environ.get("GEMINI_API_KEY") else "Missing")
except ImportError:
    print("python-dotenv is missing in this Python environment (sys.executable: {})".format(sys.executable))

try:
    import google.generativeai
    print("google-generativeai is installed.")
except ImportError:
    print("google-generativeai is missing.")
