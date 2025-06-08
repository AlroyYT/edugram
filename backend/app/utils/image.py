import base64
import io
from PIL import Image
import requests
import json
from django.conf import settings


class ImageProcessor:
    def __init__(self):
        self.api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY must be set in Django settings")
        
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
    
    def encode_image_to_base64(self, image_file):
        """Convert uploaded image file to base64 string"""
        try:
            # Reset file pointer to beginning
            image_file.seek(0)
            
            # Open and process the image
            image = Image.open(image_file)
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            # Resize if too large
            max_size = (1024, 1024)
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG', quality=85)
            img_byte_arr = img_byte_arr.getvalue()
            
            # Encode to base64
            return base64.b64encode(img_byte_arr).decode('utf-8')
        
        except Exception as e:
            raise ValueError(f"Error processing image: {str(e)}")
    
    def analyze_image(self, image_file):
        """Analyze image using Gemini API"""
        try:
            # Reset file pointer
            image_file.seek(0)
            
            # Encode image
            base64_image = self.encode_image_to_base64(image_file)
            
            # Prepare request payload
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": "Please analyze this image and provide a detailed description in 4-5 sentences. Focus on the main subject, setting, colors, mood, and any notable details or activities happening in the image. Be descriptive and engaging."
                            },
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": base64_image
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 300
                }
            }
            
            # Make request to Gemini API
            response = requests.post(
                self.api_url,
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'candidates' in result and len(result['candidates']) > 0:
                    content = result['candidates'][0].get('content', {})
                    parts = content.get('parts', [])
                    if parts and 'text' in parts[0]:
                        return {
                            'success': True,
                            'description': parts[0]['text'].strip()
                        }
                
                return {
                    'success': False,
                    'error': 'No valid response from Gemini API'
                }
            else:
                return {
                    'success': False,
                    'error': f'API request failed: {response.status_code} - {response.text}'
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timed out. Please try again.'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error analyzing image: {str(e)}'
            }