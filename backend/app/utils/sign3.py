import torch
import os
import re
from safetensors.torch import load_file
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.staticfiles import finders
from deep_translator import GoogleTranslator

# --- PATH SETUP ---
CURRENT_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.abspath(os.path.join(CURRENT_DIR, '..', '..', 'isl_model'))
BASE_MODEL_NAME = "t5-small" 

model = None
tokenizer = None

from safetensors import safe_open

def load_isl_model():
    """Initializes Step 9 (ML Model) by manually mapping tensors to the architecture."""
    global model, tokenizer
    try:
        print("--- Forced Manual Model Load Starting ---")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, legacy=False)
        model = AutoModelForSeq2SeqLM.from_pretrained(BASE_MODEL_NAME)
        
        weights_file = os.path.join(MODEL_PATH, "model.safetensors")
        state_dict = {}
        
        # Open the file and manually extract every tensor into a new dictionary
        with safe_open(weights_file, framework="pt", device="cpu") as f:
            for key in f.keys():
                state_dict[key] = f.get_tensor(key)
        
        # Apply the reconstructed dictionary to the T5 architecture
        model.load_state_dict(state_dict, strict=False)
        model.to(torch.device("cpu"))
        model.eval()
        print("✅ SUCCESS: ML Model Active. Full Pipeline Integrated.")
        
    except Exception as e:
        # If manual load fails, we report the specific error and use the Rule Engine fallback
        print(f"❌ Manual Load Failed: {e}")
        print("⚠️ Falling back to Rule Engine (Steps 1-4) only.")
        model = None

load_isl_model()

def apply_rule_engine(text):
    """
    Implements Syntactic Transfer:
    1. Temporal Hoisting (Time-First Rule)
    2. Functional Morpheme Deletion (Stop-words)
    3. Lemmatization (Root forms)
    """
    # --- SYNTACTIC HOISTING: TIME-FIRST RULE ---
    # Define common temporal markers in ISL
    time_markers = r'\b(yesterday|today|tomorrow|now|soon|later|morning|night|afternoon|evening|daily|weekly|month|year)\b'
    
    # Extract the time word if it exists
    found_time = re.search(time_markers, text, flags=re.IGNORECASE)
    
    if found_time:
        time_word = found_time.group(0)
        # Remove the time word from its original position
        text = re.sub(time_markers, '', text, flags=re.IGNORECASE)
        # Hoist the time word to the front (Sentence-Initial Position)
        text = f"{time_word} {text}"

    # --- FUNCTIONAL MORPHEME DELETION (Stop Words) ---
    stop_words = r'\b(am|is|are|the|a|an|to|at|in|of|been|be|was|were|do|does|did|has|have|had)\b'
    text = re.sub(stop_words, '', text, flags=re.IGNORECASE)
    
    # --- LEMMATIZATION (Simplification to Root Forms) ---
    # Reducing inflectional morphology to base lemmas
    text = re.sub(r'ing\b', '', text, flags=re.IGNORECASE)  # e.g., "running" -> "run"
    text = re.sub(r'ed\b', '', text, flags=re.IGNORECASE)   # e.g., "played" -> "play"
    
    # Step 10 Clean up: Remove extra spaces and normalize to Uppercase (ISL Glossing style)
    return " ".join(text.split()).upper()

def predict_gloss_with_model(text):
    """
    Implements Steps 5-9: Applying Sign Grammar via ML Model.
    """
    global model, tokenizer
    
    # Meaning Extraction & Simplification (Step 2-4)
    simplified_input = apply_rule_engine(text)
    
    if model is None:
        return simplified_input.lower().split()
    
    try:
        # ML Reordering Layer (Step 5-9)
        inputs = tokenizer(f"translate English to ISL: {simplified_input}", return_tensors="pt")
        with torch.no_grad():
            outputs = model.generate(input_ids=inputs["input_ids"], max_length=50)
        
        gloss_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print(f"✨ Step 9 Output (Gloss): {gloss_output}")
        return gloss_output.lower().split()
    except Exception as e:
        print(f"❌ ML Step Failed: {e}")
        return simplified_input.lower().split()

@csrf_exempt
def animation_view(request):
    if request.method == 'POST':
        user_input = request.POST.get('sen', '')
        if not user_input:
            return JsonResponse({'error': 'No text'}, status=400)

        # Step 1: Multilingual Translation 
        try:
            english_text = GoogleTranslator(source='auto', target='en').translate(user_input)
        except:
            english_text = user_input

        # Step 2-9: Pipeline Execution
        isl_gloss_sequence = predict_gloss_with_model(english_text)

        # Step 10: Generate Output (Video Concatenation)
        final_animation_list = []
        backend_url = "http://127.0.0.1:8000"

        for word in isl_gloss_sequence:
            found = finders.find(f'animations/mp4/{word}.mp4')
            if found:
                final_animation_list.append({
                    'word': word, 'url': f"{backend_url}/api/sign-video/{word}/", 'format': 'mp4'
                })
            else:
                # Finger-spelling fallback for words without direct clips
                for char in word:
                    if finders.find(f'animations/mp4/{char}.mp4'):
                        final_animation_list.append({
                            'word': char, 'url': f"{backend_url}/api/sign-video/{char}/", 'format': 'mp4'
                        })

        return JsonResponse({
            'original_input': user_input,
            'step_1_english': english_text,
            'final_gloss': " ".join(isl_gloss_sequence).upper(),
            'words': final_animation_list
        })