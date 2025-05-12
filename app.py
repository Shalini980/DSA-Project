import cv2
import logging
import base64
import numpy as np
import os
from flask import Flask, render_template, Response, jsonify, request, send_from_directory
from flask_cors import CORS  # Added for cross-origin requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("face_counter.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("proctor_shield")

app = Flask(__name__, static_folder='.')
CORS(app)  # Enable CORS for all routes

# Initialize face detection model
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

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
    """Process frame from frontend and return face count"""
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

        # Convert to grayscale for face detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        face_count = len(faces)
        logger.info(f"Detected {face_count} faces in the frame")

        return jsonify({"face_count": face_count})

    except Exception as e:
        logger.error(f"Error processing frame: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_logs')
def get_logs():
    """Return the most recent logs"""
    try:
        with open("face_counter.log", "r") as log_file:
            logs = log_file.readlines()
            recent_logs = logs[-10:] if len(logs) > 10 else logs
            return jsonify({"logs": recent_logs})
    except Exception as e:
        logger.error(f"Error reading logs: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Run app
if __name__ == '__main__':
    # Create log file if it doesn't exist
    if not os.path.exists('face_counter.log'):
        open('face_counter.log', 'a').close()
        
    # Run Flask app
    app.run(debug=True)