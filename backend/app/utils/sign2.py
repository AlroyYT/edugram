from django.shortcuts import render
from django.conf import settings
from django.contrib.staticfiles import finders
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import nltk
import logging
from config import FRONTEND_URL

logger = logging.getLogger(__name__)
nltk.download('punkt_tab')
nltk.download('averaged_perceptron_tagger_eng')
nltk.download('wordnet')

@csrf_exempt
@require_http_methods(["GET", "POST"])
def animation_view(request):
	"""
	View function to handle text-to-animation conversion for sign language.
	Processes text input and returns appropriate animations for each word.
	"""
	# Add CORS headers to response
	def add_cors_headers(response):
		response["Access-Control-Allow-Origin"] = FRONTEND_URL
		response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
		response["Access-Control-Allow-Headers"] = "Content-Type"
		return response

	# Handle preflight OPTIONS request
	if request.method == "OPTIONS":
		response = JsonResponse({})
		return add_cors_headers(response)

	try:
		logger.info(f"Received {request.method} request to animation_view")
		
		if request.method == 'POST':
			text = request.POST.get('sen')
			logger.info(f"Received text: {text}")
			
			if not text:
				response = JsonResponse({'error': 'No text provided'}, status=400)
				return add_cors_headers(response)

			text = text.lower()

			# Tokenizing
			words = word_tokenize(text)
			tagged = nltk.pos_tag(words)
			logger.info(f"Tokenized words: {words}")

			# Detect tense
			tense = {
				"future": len([word for word in tagged if word[1] == "MD"]),
				"present": len([word for word in tagged if word[1] in ["VBP", "VBZ", "VBG"]]),
				"past": len([word for word in tagged if word[1] in ["VBD", "VBN"]]),
				"present_continuous": len([word for word in tagged if word[1] == "VBG"]),
			}

			# Stopwords list
			stop_words = set(["mightn't", 're', 'wasn', 'wouldn', 'be', 'has', 'that', 'does', 'shouldn', 'do', "you've", 'off', 'for',
						  "didn't", 'm', 'ain', 'haven', "weren't", 'are', "she's", "wasn't", 'its', "haven't", "wouldn't", 'don',
						  'weren', 's', "you'd", "don't", 'doesn', "hadn't", 'is', 'was', "that'll", "should've", 'a', 'then', 'the',
						  'mustn', 'i', 'nor', 'as', "it's", "needn't", 'd', 'am', 'have', 'hasn', 'o', "aren't", "you'll", "couldn't",
						  "you're", "mustn't", 'didn', "doesn't", 'll', 'an', 'hadn', 'whom', 'y', "hasn't", 'itself', 'couldn',
						  'needn', "shan't", 'isn', 'been', 'such', 'shan', "shouldn't", 'aren', 'being', 'were', 'did', 'ma', 't',
						  'having', 'mightn', 've', "isn't", "won't", "guys"])

			# Lemmatization
			lr = WordNetLemmatizer()
			filtered_text = []
			for w, p in zip(words, tagged):
				if w not in stop_words:
					if p[1] in ['VBG', 'VBD', 'VBZ', 'VBN', 'NN']:
						filtered_text.append(lr.lemmatize(w, pos='v'))
					elif p[1] in ['JJ', 'JJR', 'JJS', 'RBR', 'RBS']:
						filtered_text.append(lr.lemmatize(w, pos='a'))
					else:
						filtered_text.append(lr.lemmatize(w))

			# Pronoun replacement and tense-based prefix
			words = ['Me' if w.lower() == 'i' else w for w in filtered_text]
			probable_tense = max(tense, key=tense.get)

			if probable_tense == "past" and tense["past"] >= 1:
				words = ["Before"] + words
			elif probable_tense == "future" and tense["future"] >= 1:
				if "Will" not in words:
					words = ["Will"] + words
			elif probable_tense == "present" and tense["present_continuous"] >= 1:
				words = ["Now"] + words

			# Final animation data list
			final_words = []

			for w in words:
				mp4_found = finders.find(f'animations/mp4/{w}.mp4')
				webp_found = finders.find(f'animations/webp/{w}.webp')
				logger.info(f"Looking for animations for word '{w}': MP4={mp4_found}, WebP={webp_found}")

				if mp4_found:
					final_words.append({'word': w, 'format': 'mp4'})
				elif webp_found:
					final_words.append({'word': w, 'format': 'webp'})
				else:
					# If not found, check letter by letter
					for c in w:
						letter_mp4 = finders.find(f'animations/mp4/{c}.mp4')
						letter_webp = finders.find(f'animations/webp/{c}.webp')
						if letter_mp4:
							final_words.append({'word': c, 'format': 'mp4'})
						elif letter_webp:
							final_words.append({'word': c, 'format': 'webp'})
						else:
							final_words.append({'word': c, 'format': 'none'})

			response = JsonResponse({
				'words': final_words,
				'text': text
			})
			return add_cors_headers(response)

		response = JsonResponse({'error': 'Method not allowed'}, status=405)
		return add_cors_headers(response)

	except Exception as e:
		logger.error(f"Error in animation_view: {str(e)}")
		response = JsonResponse({
			'error': 'An error occurred while processing the text'
		}, status=500)
		return add_cors_headers(response)
