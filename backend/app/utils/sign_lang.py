# gesture/views.py
import os
import numpy as np
import cv2
from PIL import Image
import speech_recognition as sr
import pyttsx3
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import base64
from io import BytesIO
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

# Disable TensorFlow logging and GPU
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
tf.get_logger().setLevel('ERROR')
physical_devices = tf.config.list_physical_devices('GPU')
try:
    tf.config.set_visible_devices([], 'GPU')
except:
    pass

# Load the model for gesture recognition
image_x, image_y = 64, 64
try:
    classifier = load_model('model.h5')  # Ensure model.h5 is in the working directory
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {e}")

# Get the base directory of your Django project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set the absolute paths
op_dest = os.path.join(BASE_DIR, "filtered_data/")    # This will point to /D:/main_el/edugram/backend/filtered_data/
alpha_dest = os.path.join(BASE_DIR, "alphabet/")      # This will point to /D:/main_el/edugram/backend/alphabet/

# File mapping - load only once when starting the server
dirListing = os.listdir(op_dest)
editFiles = [item for item in dirListing if ".webp" in item]
file_map = {i: i.replace(".webp", "").split() for i in editFiles}

# Function to process input text and predict corresponding sign language gestures
def give_char():
    try:
        test_image = image.load_img('tmp1.png', target_size=(64, 64))
        test_image = image.img_to_array(test_image)
        test_image = np.expand_dims(test_image, axis=0)
        with tf.device('/CPU:0'):
            result = classifier.predict(test_image)
        chars = "ABCDEFGHIJKMNOPQRSTUVWXYZ"
        indx = np.argmax(result[0])
        return chars[indx]
    except Exception as e:
        print(f"Error in give_char: {e}")
        return None

# Check if the word matches with a predefined set
def check_sim(i, file_map):
    for item in file_map:
        for word in file_map[item]:
            if i.lower() == word.lower():  # Case-insensitive comparison
                return 1, item
    return -1, ""

# Function to convert input text into an animated GIF
def func(a):
    try:
        words = a.strip().split()
        all_frames = []
        durations = []
        
        for i in words:
            if not i:
                continue

            flag, sim = check_sim(i, file_map)
            if flag == -1:
                # Handle individual letters
                for j in i:
                    if j.isalpha():
                        try:
                            with Image.open(alpha_dest + str(j).lower() + "_small.gif") as im:
                                for frame_cnt in range(im.n_frames):
                                    im.seek(frame_cnt)
                                    img = np.array(im.convert('RGB'))
                                    img = cv2.resize(img, (380, 260), interpolation=cv2.INTER_LANCZOS4)
                                    frame = Image.fromarray(img)
                                    all_frames.append(frame)
                                    # Set longer duration for letters (2000ms = 2 seconds)
                                    durations.append(1000)  # Increased duration for letters
                        except Exception as e:
                            print(f"Error processing character {j}: {e}")
                            continue
            else:
                # Handle whole words
                try:
                    with Image.open(op_dest + sim) as im:
                        im.info.pop('background', None)
                        for frame_cnt in range(im.n_frames):
                            im.seek(frame_cnt)
                            img = np.array(im.convert('RGB'))
                            img = cv2.resize(img, (380, 260), interpolation=cv2.INTER_LANCZOS4)
                            frame = Image.fromarray(img)
                            all_frames.append(frame)
                            # Set normal duration for words (1000ms = 1 second)
                            durations.append(100)
                except Exception as e:
                    print(f"Error processing word '{i}': {e}")
                    continue

        if not all_frames:
            return None

        # Create animated GIF with controlled durations
        output = BytesIO()
        all_frames[0].save(
            output,
            format='GIF',
            save_all=True,
            append_images=all_frames[1:],
            duration=durations,  # Use our custom durations
            loop=0
        )
        output.seek(0)
        
        return base64.b64encode(output.getvalue()).decode('utf-8')

    except Exception as e:
        print(f"Error in func: {e}")
        return None

def app_route(url_pattern, methods=None):
    """Custom route decorator to mimic Flask's @app.route"""
    if methods is None:
        methods = ['GET']
    
    def decorator(f):
        @wraps(f)
        @csrf_exempt
        @require_http_methods(methods)
        def wrapper(request, *args, **kwargs):
            return f(request, *args, **kwargs)
        wrapper.url_pattern = url_pattern
        return wrapper
    return decorator

# Update the route decorators for the API endpoints
@csrf_exempt
@require_http_methods(["POST"])
def convert_text_to_gesture(request):
    """
    API endpoint to convert text to sign language gestures
    """
    try:
        # Try to get text from JSON data first
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            text_input = data.get('text', '').strip()
        else:
            # Fall back to form data
            text_input = request.POST.get('text', '').strip()
        
        if not text_input:
            return JsonResponse({'status': 'error', 'message': 'No text provided'})
        
        print(f"Received text: {text_input}")  # Debug log
        
        animated_gif = func(text_input)
        
        if not animated_gif:
            return JsonResponse({'status': 'error', 'message': 'Could not generate animation'})
        
        return JsonResponse({
            'status': 'success',
            'animation': animated_gif,
            'message': 'Animation generated successfully'
        })

    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON data'})
    except Exception as e:
        print(f"Error in convert_text_to_gesture: {str(e)}")  # Debug log
        return JsonResponse({'status': 'error', 'message': str(e)})

@csrf_exempt
@require_http_methods(["POST"])
def speech_to_text(request):
    """
    API endpoint to convert speech to text
    """
    if 'audio' not in request.FILES:
        return JsonResponse({'status': 'error', 'message': 'No audio file provided'})
        
    try:
        recognizer = sr.Recognizer()
        audio_file = request.FILES['audio']
        
        with audio_file as source:
            audio_input = recognizer.record(source)
            text = recognizer.recognize_google(audio_input)
            return JsonResponse({'status': 'success', 'text': text})
        
    except sr.UnknownValueError:
        return JsonResponse({'status': 'error', 'message': 'Could not understand audio'})
    except sr.RequestError as e:
        return JsonResponse({'status': 'error', 'message': f'API request failed: {str(e)}'})
    except Exception as e:
        print(f"Error in speech_to_text: {str(e)}")  # Debug log
        return JsonResponse({'status': 'error', 'message': f'Unexpected error: {str(e)}'})
