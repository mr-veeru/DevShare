"""
Entry point for the Flask application.
This file initializes and runs the Flask application.
"""
from app import create_app

# Create the Flask application instance
app = create_app()

if __name__ == '__main__':
    # Run the application in debug mode when executed directly
    app.run(debug=True) 