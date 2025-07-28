import random
import json
from difflib import SequenceMatcher
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

# ✅ Predefined static sentences per difficulty level
sentences = {
    "easy": [
        "The cat sat on the mat.",
        "I like to eat apples.",
        "She is my best friend.",
        "We go to school daily.",
        "He runs very fast.",
        "The sun is bright today.",
        "My dog is very cute.",
        "I have a red ball.",
        "The sky is blue.",
        "It is a big tree.",
        "I love my mom.",
        "We play in the park.",
        "The bird can fly.",
        "This is my book.",
        "She has a doll.",
        "He is a good boy.",
        "I am five years old.",
        "It is a rainy day.",
        "We eat lunch at noon.",
        "Dad drives the car.",
        "I brush my teeth.",
        "This is a pencil.",
        "I can jump high.",
        "We sing songs.",
        "The apple is red.",
    ],
    "medium": [
        "The children are playing football in the ground.",
        "My sister baked a chocolate cake yesterday.",
        "We visited the zoo and saw many animals.",
        "She always helps her mother in the kitchen.",
        "The train arrives at the station on time.",
        "He reads a book before sleeping every night.",
        "They are planting trees to save the environment.",
        "We watched a movie at the theater last weekend.",
        "The teacher gave us homework to complete.",
        "Our vacation was exciting and full of adventure.",
        "He participated in the school debate competition.",
        "She danced gracefully on the stage.",
        "My parents bought me a new bicycle.",
        "We are going for a picnic tomorrow.",
        "I enjoy listening to music while studying.",
        "The baby is sleeping in the crib.",
        "They painted the house all by themselves.",
        "He plays the guitar really well.",
        "Our school won the football championship.",
        "I forgot to bring my umbrella today.",
        "They are learning to play chess.",
        "We cleaned our classroom together.",
        "The birds are chirping on the tree.",
        "He took his dog for a walk.",
        "She writes stories in her free time.",
    ],
    "hard": [
        "Despite the heavy downpour, the match continued uninterrupted.",
        "The astronaut explained the complexities of space travel.",
        "She recited a beautiful poem with perfect articulation.",
        "The documentary highlighted the adverse effects of pollution.",
        "He solved the complicated math problem effortlessly.",
        "She spoke confidently during the science presentation.",
        "The orchestra performed a symphony by Beethoven.",
        "A comprehensive analysis was conducted on climate change.",
        "They constructed a sustainable model using recycled materials.",
        "Her pronunciation was flawless throughout the speech.",
        "The wildlife sanctuary houses several endangered species.",
        "The professor elaborated on quantum mechanics.",
        "His enunciation was exceptionally clear and precise.",
        "The mountain expedition required rigorous preparation.",
        "The students debated the ethical implications of AI.",
        "He articulated his opinion with logical reasoning.",
        "The invention revolutionized modern communication.",
        "The linguist analyzed the phonetics of ancient scripts.",
        "She explained the algorithm with remarkable clarity.",
        "The chef demonstrated a sophisticated French recipe.",
        "Their performance displayed exceptional vocal control.",
        "He discussed socio-political reforms in his lecture.",
        "They rehearsed intensively for the national competition.",
        "The speaker emphasized empathy in global leadership.",
        "Her narrative conveyed complex emotions with nuance.",
    ]
}

# ✅ Return a random sentence based on difficulty
def get_static_sentence(difficulty):
    return random.choice(sentences.get(difficulty, sentences["easy"]))

# ✅ Generate a sentence (API endpoint)
@csrf_exempt
def sentence_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed"}, status=405)

    try:
        data = json.loads(request.body)
        difficulty = data.get("difficulty", "easy")
        sentence = get_static_sentence(difficulty)
        return JsonResponse({"sentence": sentence})
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

# ✅ Evaluate similarity between original and spoken sentence
@csrf_exempt
def evaluate_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed"}, status=405)

    try:
        data = json.loads(request.body)
        original = data.get("original", "")
        spoken = data.get("spoken", "")

        matcher = SequenceMatcher(None, original.lower(), spoken.lower())
        similarity = matcher.ratio()

        if similarity >= 0.9:
            result = "Excellent ✅"
        elif similarity >= 0.7:
            result = "Good 👍"
        elif similarity >= 0.4:
            result = "Try Again 👀"
        else:
            result = "Poor ❌"

        return JsonResponse({"result": result})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
