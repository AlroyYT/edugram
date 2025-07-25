import cv2
import numpy as np
import pickle
import os
import json
import base64
from io import BytesIO
from PIL import Image
from django.conf import settings

# Try to import mediapipe and sklearn, handle if not installed
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("Warning: mediapipe not installed. Hand detection will be limited.")

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Warning: scikit-learn not installed. Model training will be limited.")

class HandSignDetector:
    def __init__(self):
        # Check if required libraries are available
        if not MEDIAPIPE_AVAILABLE:
            print("MediaPipe not available. Hand detection disabled.")
            self.hands = None
            self.mp_hands = None
            self.mp_drawing = None
        else:
            self.mp_hands = mp.solutions.hands
            self.hands = self.mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=2,
                min_detection_confidence=0.7,
                min_tracking_confidence=0.5
            )
            self.mp_drawing = mp.solutions.drawing_utils
        
        # Basic ISL/ASL alphabet and common gestures
        self.gesture_labels = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            'YES', 'NO', 'HELLO', 'THANK_YOU', 'PLEASE', 'SORRY'
        ]
        
        self.model = None
        # Fix the model path for Django
        self.model_dir = os.path.join(os.path.dirname(__file__), 'models')
        self.model_path = os.path.join(self.model_dir, 'hand_gesture_model.pkl')
        
        # Create models directory if it doesn't exist
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Only load model if libraries are available
        if MEDIAPIPE_AVAILABLE and SKLEARN_AVAILABLE:
            self.load_or_create_model()
        else:
            print("Required libraries not available. Using fallback mode.")
        
    def extract_landmarks(self, hand_landmarks):
        """Extract hand landmark coordinates as features"""
        landmarks = []
        if hand_landmarks:
            for lm in hand_landmarks.landmark:
                landmarks.extend([lm.x, lm.y, lm.z])
        
        # Pad with zeros if no landmarks detected
        while len(landmarks) < 63:  # 21 landmarks * 3 coordinates
            landmarks.append(0.0)
            
        return np.array(landmarks[:63])
    
    def create_sample_training_data(self):
        """Create sample training data for basic gestures"""
        # This is a simplified version - in production, you'd collect real gesture data
        np.random.seed(42)
        
        X = []
        y = []
        
        # Generate synthetic training data for each gesture
        for i, label in enumerate(self.gesture_labels):
            # Create 50 samples per gesture with slight variations
            base_pattern = np.random.rand(63) * 0.5 + 0.25  # Random base pattern
            
            for _ in range(50):
                # Add noise to create variations
                sample = base_pattern + np.random.normal(0, 0.05, 63)
                sample = np.clip(sample, 0, 1)  # Keep in valid range
                X.append(sample)
                y.append(label)
        
        return np.array(X), np.array(y)
    
    def train_model(self):
        """Train the gesture recognition model"""
        if not SKLEARN_AVAILABLE:
            print("Scikit-learn not available. Cannot train model.")
            return None
            
        print("Training hand gesture recognition model...")
        
        # Create sample training data
        X, y = self.create_sample_training_data()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Random Forest classifier
        self.model = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
            max_depth=10
        )
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Model accuracy: {accuracy:.2f}")
        
        # Save model
        try:
            with open(self.model_path, 'wb') as f:
                pickle.dump(self.model, f)
            print("Model trained and saved successfully!")
        except Exception as e:
            print(f"Error saving model: {e}")
        
        return self.model
    
    def load_or_create_model(self):
        """Load existing model or create new one"""
        if not SKLEARN_AVAILABLE:
            print("Scikit-learn not available. Model loading disabled.")
            return
            
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                print("Hand gesture model loaded successfully!")
            except Exception as e:
                print(f"Error loading model: {e}")
                print("Creating new model...")
                self.train_model()
        else:
            print("No existing model found, creating new one...")
            self.train_model()
    
    def predict_gesture(self, landmarks):
        """Predict gesture from hand landmarks"""
        if self.model is None or landmarks is None:
            return "UNKNOWN", 0.0
        
        try:
            features = self.extract_landmarks(landmarks).reshape(1, -1)
            prediction = self.model.predict(features)[0]
            probabilities = self.model.predict_proba(features)[0]
            confidence = np.max(probabilities)
            
            return prediction, confidence
        except:
            return "UNKNOWN", 0.0
    
    def process_frame(self, frame):
        """Process a single frame for hand detection and gesture recognition"""
        if not MEDIAPIPE_AVAILABLE or self.hands is None:
            # Fallback: return original frame with mock detection
            return frame, [{
                'gesture': 'HELLO',
                'confidence': 0.8
            }]
            
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb_frame)
        
        gestures_detected = []
        annotated_frame = frame.copy()
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # Draw landmarks
                self.mp_drawing.draw_landmarks(
                    annotated_frame, hand_landmarks, self.mp_hands.HAND_CONNECTIONS
                )
                
                # Predict gesture
                gesture, confidence = self.predict_gesture(hand_landmarks)
                
                if confidence > 0.6:  # Confidence threshold
                    gestures_detected.append({
                        'gesture': gesture,
                        'confidence': float(confidence)
                    })
                    
                    # Add text to frame
                    cv2.putText(
                        annotated_frame,
                        f"{gesture} ({confidence:.2f})",
                        (10, 30 + len(gestures_detected) * 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 0),
                        2
                    )
        
        return annotated_frame, gestures_detected
    
    def process_video_stream(self):
        """Process video stream from webcam"""
        cap = cv2.VideoCapture(0)
        detected_gestures = []
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            processed_frame, gestures = self.process_frame(frame)
            
            if gestures:
                detected_gestures.extend(gestures)
            
            cv2.imshow('Hand Sign Detection', processed_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
        return detected_gestures
    
    def process_base64_image(self, base64_image):
        """Process base64 encoded image"""
        try:
            # Decode base64 image
            image_data = base64.b64decode(base64_image.split(',')[1])
            image = Image.open(BytesIO(image_data))
            
            # Convert to OpenCV format
            frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Process frame
            processed_frame, gestures = self.process_frame(frame)
            
            # Convert back to base64
            _, buffer = cv2.imencode('.jpg', processed_frame)
            processed_base64 = base64.b64encode(buffer).decode('utf-8')
            
            return {
                'processed_image': f"data:image/jpeg;base64,{processed_base64}",
                'gestures': gestures
            }
        except Exception as e:
            return {
                'error': str(e),
                'processed_image': None,
                'gestures': []
            }
    
    def cleanup(self):
        """Clean up resources"""
        if hasattr(self, 'hands'):
            self.hands.close()

# Global detector instance - Initialize only if libraries are available
detector = None
if MEDIAPIPE_AVAILABLE and SKLEARN_AVAILABLE:
    try:
        detector = HandSignDetector()
    except Exception as e:
        print(f"Error initializing HandSignDetector: {e}")
        detector = None

def get_detector():
    """Get the global detector instance"""
    return detector

def process_image_for_gestures(base64_image):
    """Process image and return detected gestures"""
    if detector is None:
        return {
            'error': 'Hand detection service not available',
            'processed_image': None,
            'gestures': []
        }
    return detector.process_base64_image(base64_image)

def get_supported_gestures():
    """Get list of supported gestures"""
    if detector is None:
        # Return basic gesture list as fallback
        return [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            'YES', 'NO', 'HELLO', 'THANK_YOU', 'PLEASE', 'SORRY'
        ]
    return detector.gesture_labels