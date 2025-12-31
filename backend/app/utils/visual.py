# app/utils/visual.py

import os
import re
import google.generativeai as genai

from django.conf import settings

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")

def clean_and_validate_mindmap(text: str) -> str:
    """Clean and validate the mindmap output"""
    # Remove markdown code fences
    text = re.sub(r'```mermaid\n?', '', text)
    text = re.sub(r'```\n?', '', text)
    text = text.strip()
    
    # Split into lines
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # Skip empty lines
        if not line.strip():
            continue
            
        # Clean the line but preserve indentation
        leading_spaces = len(line) - len(line.lstrip())
        content = line.strip()
        
        # Remove any special characters that might cause syntax errors
        # Keep only alphanumeric, spaces, hyphens, and underscores
        content = re.sub(r'[^\w\s\-]', '', content)
        
        # Reconstruct line with proper indentation (multiples of 2)
        if content.lower() == 'mindmap':
            cleaned_lines.append('mindmap')
        elif content:
            # Ensure indentation is multiple of 2
            proper_indent = (leading_spaces // 2) * 2
            cleaned_lines.append(' ' * proper_indent + content)
    
    # Ensure first line is "mindmap"
    if not cleaned_lines or cleaned_lines[0].strip().lower() != 'mindmap':
        cleaned_lines.insert(0, 'mindmap')
    
    result = '\n'.join(cleaned_lines)
    return result

def generate_mind_map(text: str) -> str:
    """
    Takes textbook/chapter text and returns clean Mermaid mindmap code
    """

    prompt = f"""
You are a Mermaid.js mindmap generator. Create an educational mind map.

STRICT OUTPUT RULES:
1. First line: mindmap
2. Use 2 spaces for each level of indentation
3. No special characters (only letters, numbers, spaces, hyphens)
4. No punctuation marks
5. Each node on its own line
6. Short labels (2-4 words)
7. Maximum 4 levels deep
8. Create 4-6 main branches with 2-3 sub-items each

EXACT FORMAT:
mindmap
  Main Topic
    Subtopic One
      Detail A
      Detail B
    Subtopic Two
      Detail C
      Detail D

Content to map:
{text[:2000]}

Generate mindmap code now (no explanations):"""

    try:
        response = model.generate_content(prompt)
        raw_output = response.text.strip()
        
        # Clean and validate
        mindmap_code = clean_and_validate_mindmap(raw_output)
        
        # Final validation - ensure it has content
        lines = mindmap_code.split('\n')
        if len(lines) < 3:
            # Fallback to simple structure
            return generate_simple_fallback(text)
        
        return mindmap_code
        
    except Exception as e:
        print(f"Error generating mindmap: {e}")
        return generate_simple_fallback(text)

def generate_simple_fallback(text: str) -> str:
    """
    Generate a simple fallback mindmap when AI fails
    """
    # Extract first few words as topic
    words = text.split()[:3]
    topic = ' '.join(words) if words else "Main Topic"
    
    return f"""mindmap
  {topic}
    Key Concept 1
      Detail A
      Detail B
    Key Concept 2
      Detail C
      Detail D
    Key Concept 3
      Detail E
      Detail F"""