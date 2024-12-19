import fitz  # PyMuPDF
from transformers import pipeline
import os
from pptx import Presentation  # For extracting text from PPTX
import pdfplumber  # For handling complex PDFs

class FlashcardGenerator:
    def __init__(self):
        self.qa_generator = pipeline("text2text-generation", model="valhalla/t5-small-qa-qg-hl")
    
    def extract_text_from_pdf(self, file_path):
        try:
            pdf_document = fitz.open(file_path)
            text = ""
            for page_num in range(pdf_document.page_count):
                page = pdf_document.load_page(page_num)
                text += page.get_text("text")
            pdf_document.close()

            if not text:
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        text += page.extract_text()
            return text.strip()
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
            return ""

    def extract_text_from_pptx(self, file_path):
        try:
            presentation = Presentation(file_path)
            text = ""
            for slide in presentation.slides:
                for shape in slide.shapes:
                    if hasattr(shape, 'text'):
                        text += shape.text + "\n"
            return text.strip()
        except Exception as e:
            print(f"Error extracting text from PPTX: {e}")
            return ""

    def extract_text_from_file(self, file_path):
        _, ext = os.path.splitext(file_path)
        if ext.lower() == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif ext.lower() == '.pptx':
            return self.extract_text_from_pptx(file_path)
        else:
            print(f"Unsupported file type: {ext}")
            return ""

    def preprocess_text(self, text):
        if not text:
            return []
        sentences = [sent.strip() for sent in text.replace('\n', ' ').split('.') if len(sent.strip()) > 5]
        return sentences

    def generate_flashcards(self, text, num_flashcards=10):
        sentences = self.preprocess_text(text)
        if not sentences:
            return []

        # Shuffle sentences to ensure variety
        import random
        random.shuffle(sentences)

        flashcards = []
        for sentence in sentences[:num_flashcards]:
            try:
                qa_output = self.qa_generator(f"generate question: {sentence}", max_length=100, num_return_sequences=1)
                if qa_output and len(qa_output) > 0:
                    question = qa_output[0]['generated_text'].strip()
                    flashcards.append({
                        "question": question,
                        "answer": sentence
                    })
            except Exception as e:
                print(f"Error generating flashcard for sentence '{sentence}': {e}")
                continue

        return flashcards
