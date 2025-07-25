# 🔊 Simulated JARVIS Voice Bot using IBM Watson Assistant + NLU
from ibm_watson import AssistantV2, NaturalLanguageUnderstandingV1
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_watson.natural_language_understanding_v1 import Features, KeywordsOptions, SummarizationOptions
import pyttsx3

# -------------------- IBM Configuration --------------------
IBM_API_KEY = "0bi4MMQH9-gt0ZmcLmrN5NLcUXkLg0EpFSfISl1ntGXU"
IBM_ASSISTANT_URL = "https://api.us-south.assistant.watson.cloud.ibm.com"
IBM_ASSISTANT_ID = "your_assistant_id_here"  # Get this from Watson Assistant dashboard

IBM_NLU_URL = "https://api.us-south.natural-language-understanding.watson.cloud.ibm.com"

# -------------------- Auth Setup --------------------
authenticator = IAMAuthenticator(IBM_API_KEY)

assistant = AssistantV2(
    version='2024-07-25',
    authenticator=authenticator
)
assistant.set_service_url(IBM_ASSISTANT_URL)

nlu = NaturalLanguageUnderstandingV1(
    version='2024-07-25',
    authenticator=authenticator
)
nlu.set_service_url(IBM_NLU_URL)

# -------------------- Simulated Voice Input --------------------
def get_voice_input():
    print("🎤 Listening...")
    return "Tell me the latest news about AI in education"

# -------------------- Watson Assistant for Query Understanding --------------------
def process_user_query(query):
    print(f"🧠 Processing with Watson Assistant...")
    response = assistant.message_stateless(
        assistant_id=IBM_ASSISTANT_ID,
        input={
            'message_type': 'text',
            'text': query
        }
    ).get_result()
    
    # Extract response
    output_text = response['output']['generic'][0]['text']
    return output_text

# -------------------- NLU Summarization --------------------
def summarize_text(text):
    print("📰 Summarizing with NLU...")
    response = nlu.analyze(
        text=text,
        features=Features(summarization=SummarizationOptions(limit=3))
    ).get_result()
    
    return response.get("summary", text)

# -------------------- Text-to-Speech --------------------
def speak(text):
    print(f"🗣 Speaking: {text}")
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()

# -------------------- Main Flow --------------------
if __name__ == "__main__":
    query = get_voice_input()
    
    response_text = process_user_query(query)
    summary = summarize_text(response_text)
    
    speak(summary)
