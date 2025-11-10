import logging
from logging.handlers import TimedRotatingFileHandler
import os
import sys

# Create logs directory if not exists
if not os.path.exists("logs"):
    os.makedirs("logs")

# Logger name
logger = logging.getLogger("devshare")
logger.setLevel(logging.INFO)  # Can change to DEBUG, WARNING, etc.

# Clear any existing handlers to avoid duplicates
logger.handlers.clear()

# Log file path with daily rotation
log_file = "logs/devshare.log"

# Custom TimedRotatingFileHandler that handles Windows file locking issues
class WindowsSafeTimedRotatingFileHandler(TimedRotatingFileHandler):
    def doRollover(self):
        """
        Override doRollover to handle Windows file locking issues gracefully
        """
        try:
            super().doRollover()
        except (OSError, PermissionError) as e:
            # If rollover fails due to file locking, just continue with current file
            # This prevents the application from crashing on Windows
            print(f"Log rollover failed (non-critical): {e}", file=sys.stderr)
            pass

# TimedRotatingFileHandler configuration
# when='midnight' → rotate at midnight
# interval=1 → every 1 day
# backupCount=7 → keep only 7 days of logs
handler = WindowsSafeTimedRotatingFileHandler(
    log_file,
    when="midnight",
    interval=1,
    backupCount=7,
    encoding="utf-8",
    delay=True,  # Delay file creation until first log
    utc=False,   # Use local time for rotation
)

# Log file name will include date automatically by handler using suffix
handler.suffix = "%Y-%m-%d.log"

# Log format
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)

# Add handler to logger
logger.addHandler(handler)

# Optional: also log to console
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)