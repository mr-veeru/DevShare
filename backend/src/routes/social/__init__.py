"""
Social Interactions Package Initialization
"""

from .likes import likes_ns
from .comments import comments_ns
from .replies import replies_ns

__all__ = ["likes_ns", "comments_ns", "replies_ns"]
