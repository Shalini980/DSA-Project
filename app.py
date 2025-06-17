import cv2
import logging
import base64
import numpy as np
import os
import time
from flask import Flask, render_template, Response, jsonify, request, send_from_directory
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("eye_tracker.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("proctor_shield")

app = Flask(__name__, static_folder='.')
CORS(app)

# Initialize detection models
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Global variables for eye tracking
previous_eye_positions = []
eye_movement_threshold = 10  # pixels
max_history = 5  # number of frames to keep in history
last_eye_detection_time = time.time()
eye_tracking_calibrated = False

class EyeTracker:
    def __init__(self):
        self.previous_positions = []
        self.movement_threshold = 10
        self.max_history = 5
        self.calibrated = False
        self.baseline_position = None
        self.movement_detected = False
        self.last_movement_time = time.time()

eye_tracker = EyeTracker()

def detect_eye_movement(current_eyes, previous_eyes):
    """Detect if there's significant eye movement between frames"""
    if not previous_eyes or not current_eyes:
        return False, 0
    
    # Calculate movement for each eye
    movements = []
    
    for i, curr_eye in enumerate(current_eyes):
        if i < len(previous_eyes):
            prev_eye = previous_eyes[i]
            # Calculate center of each eye
            curr_center = (curr_eye[0] + curr_eye[2]//2, curr_eye[1] + curr_eye[3]//2)
            prev_center = (prev_eye[0] + prev_eye[2]//2, prev_eye[1] + prev_eye[3]//2)
            
            # Calculate distance moved
            distance = np.sqrt((curr_center[0] - prev_center[0])**2 + 
                             (curr_center[1] - prev_center[1])**2)
            movements.append(distance)
    
    if movements:
        max_movement = max(movements)
        return max_movement > eye_tracker.movement_threshold, max_movement
    
    return False, 0

def calculate_eye_direction(eyes, face_region):
    """Calculate approximate eye gaze direction based on eye position within face"""
    if not eyes or len(eyes) < 2:
        return "unknown"
    
    face_width = face_region[2]
    face_center_x = face_region[0] + face_width // 2
    
    # Get average eye position
    avg_eye_x = sum(eye[0] + eye[2]//2 for eye in eyes) / len(eyes)
    
    # Determine direction based on eye position relative to face center
    relative_position = (avg_eye_x - face_center_x) / face_width
    
    if relative_position < -0.1:
        return "left"
    elif relative_position > 0.1:
        return "right"
    else:
        return "center"

@app.route('/')
def index():
    """Serve the main page"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (js, css, etc)"""
    return send_from_directory('.', path)

@app.route('/process_frame', methods=['POST'])
def process_frame():
    """Process frame from frontend and return face count and eye tracking data"""
    try:
        # Get the image data from the request
        img_data = request.json.get('image')
        if not img_data:
            return jsonify({"error": "No image data received"}), 400

        # Remove the data URL prefix and decode base64
        img_data = img_data.split(',')[1]
        img_bytes = base64.b64decode(img_data)
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        # Convert to grayscale for detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        face_count = len(faces)
        eye_data = {
            "eyes_detected": 0,
            "movement_detected": False,
            "movement_magnitude": 0,
            "eye_direction": "unknown",
            "tracking_status": "inactive"
        }

        # Process eye detection if faces are found
        if face_count > 0:
            current_eyes = []
            
            for (x, y, w, h) in faces:
                # Region of interest for eyes (upper half of face)
                roi_gray = gray[y:y + h//2, x:x + w]
                
                # Detect eyes in the face region
                eyes = eye_cascade.detectMultiScale(
                    roi_gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(10, 10)
                )
                
                # Convert eye coordinates to global coordinates
                for (ex, ey, ew, eh) in eyes:
                    global_eye = (x + ex, y + ey, ew, eh)
                    current_eyes.append(global_eye)
            
            eye_data["eyes_detected"] = len(current_eyes)
            
            # Track eye movement if we have current and previous eye positions
            if current_eyes:
                eye_data["tracking_status"] = "active"
                
                # Calculate eye direction
                if faces.any():
                    eye_data["eye_direction"] = calculate_eye_direction(current_eyes, faces[0])
                
                # Check for movement
                if eye_tracker.previous_positions:
                    movement_detected, movement_magnitude = detect_eye_movement(
                        current_eyes, eye_tracker.previous_positions
                    )
                    
                    eye_data["movement_detected"] = movement_detected
                    eye_data["movement_magnitude"] = round(movement_magnitude, 2)
                    
                    if movement_detected:
                        eye_tracker.last_movement_time = time.time()
                        logger.info(f"Eye movement detected: {movement_magnitude} pixels, direction: {eye_data['eye_direction']}")
                
                # Update eye tracking history
                eye_tracker.previous_positions = current_eyes[-eye_tracker.max_history:]
                
                # Set baseline if not calibrated
                if not eye_tracker.calibrated and len(current_eyes) >= 2:
                    eye_tracker.baseline_position = current_eyes
                    eye_tracker.calibrated = True
                    logger.info("Eye tracking calibrated")

        logger.info(f"Detected {face_count} faces, {eye_data['eyes_detected']} eyes")

        return jsonify({
            "face_count": face_count,
            "eye_data": eye_data
        })

    except Exception as e:
        logger.error(f"Error processing frame: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/reset_eye_tracking', methods=['POST'])
def reset_eye_tracking():
    """Reset eye tracking calibration"""
    try:
        global eye_tracker
        eye_tracker.previous_positions = []
        eye_tracker.calibrated = False
        eye_tracker.baseline_position = None
        logger.info("Eye tracking reset")
        return jsonify({"status": "Eye tracking reset successfully"})
    except Exception as e:
        logger.error(f"Error resetting eye tracking: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_logs')
def get_logs():
    """Return the most recent logs"""
    try:
        with open("eye_tracker.log", "r") as log_file:
            logs = log_file.readlines()
            recent_logs = logs[-10:] if len(logs) > 10 else logs
            return jsonify({"logs": recent_logs})
    except Exception as e:
        logger.error(f"Error reading logs: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Run app
if __name__ == '__main__':
    # Create log file if it doesn't exist
    if not os.path.exists('eye_tracker.log'):
        open('eye_tracker.log', 'a').close()
    
    logger.info("Starting Eye Tracking Server...")
    # Run Flask app
    app.run(debug=True)