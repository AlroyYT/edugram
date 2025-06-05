from typing import List, Dict
import fitz
import pdfplumber
import docx
from sentence_transformers import SentenceTransformer
import torch
import google.generativeai as genai
import re
import json
from django.conf import settings

class OptimizedMCQGenerator:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.similarity_model = SentenceTransformer('all-MiniLM-L6-v2', device=self.device)
        
        # Initialize Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("models/gemini-2.0-flash")

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        try:
            text_chunks = []
            with fitz.open(pdf_path) as pdf:
                for page in pdf:
                    text_chunks.append(page.get_text("text"))
            text = "\n".join(text_chunks)
            
            if not text.strip() or len(text) < 100:
                with pdfplumber.open(pdf_path) as pdf:
                    text = '\n'.join([page.extract_text() for page in pdf.pages])
            
            return text
        except Exception as e:
            raise Exception(f"PDF extraction failed: {str(e)}")

    def preprocess_text(self, text: str) -> List[str]:
        text = re.sub(r'\s+', ' ', text)
        text = text.replace('\n', ' ')
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 20]
        chunks = []
        current_chunk = []
        
        for sentence in sentences:
            current_chunk.append(sentence)
            if len(' '.join(current_chunk)) > 500:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                
        if current_chunk:
            chunks.append(' '.join(current_chunk))
            
        return chunks

    def generate_mcqs_from_text(self, text: str, num_questions: int = 10) -> List[Dict]:
        try:
            chunks = self.preprocess_text(text)
            
            if not chunks:
                raise ValueError("No suitable content found in the text")
            
            prompt = f"""
            Create {num_questions} multiple choice questions based on this text. Format your response as a valid JSON array of objects.
            Each object must have exactly these fields:
            - "question": the question text
            - "options": array of 4 strings for the choices
            - "correct_answer": the correct option (must match one of the options exactly)
            - "explanation": brief explanation of the correct answer

            Text: {text[:8000]}

            Response must be a valid JSON array like this example:
            [
                {{
                    "question": "What is the capital of France?",
                    "options": ["London", "Paris", "Berlin", "Madrid"],
                    "correct_answer": "Paris",
                    "explanation": "Paris is the capital city of France."
                }},
                ...
            ]
            """
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Try to extract JSON if response is wrapped in code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].strip()
            
            try:
                mcqs = json.loads(response_text)
            except json.JSONDecodeError:
                # Fallback - try to fix common JSON issues
                response_text = response_text.replace("'", '"')
                response_text = re.sub(r',\s*}', '}', response_text)
                response_text = re.sub(r',\s*]', ']', response_text)
                mcqs = json.loads(response_text)
            
            # Validate and format MCQs
            formatted_mcqs = []
            for mcq in mcqs:
                if all(key in mcq for key in ['question', 'options', 'correct_answer', 'explanation']):
                    # Ensure we have exactly 4 options
                    while len(mcq['options']) < 4:
                        mcq['options'].append("None of the above")
                    mcq['options'] = mcq['options'][:4]
                    
                    formatted_mcqs.append({
                        'question': mcq['question'].strip(),
                        'options': [opt.strip() for opt in mcq['options']],
                        'correct_answer': mcq['correct_answer'].strip(),
                        'explanation': mcq['explanation'].strip()
                    })
            
            if not formatted_mcqs:
                raise ValueError("Failed to generate valid questions")
            
            return formatted_mcqs[:num_questions]
            
        except Exception as e:
            raise Exception(f"MCQ generation failed: {str(e)}")

    @staticmethod
    def format_mcq_for_display(mcq: Dict) -> str:
        options = mcq['options']
        formatted_options = [f"{chr(65+i)}. {opt}" for i, opt in enumerate(options)]
        correct_index = options.index(mcq['correct_answer'])
        
        return f"""
Question: {mcq['question']}

{chr(10).join(formatted_options)}

Correct Answer: {chr(65+correct_index)}
Explanation: {mcq['explanation']}
"""