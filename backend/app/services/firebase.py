"""
Firebase service module.
This module provides a set of utility functions for interacting with Firestore database.
These functions handle common database operations such as getting, creating, updating, 
and deleting documents, as well as querying collections.
"""
from firebase_admin import firestore
from typing import Dict, Any, List, Optional, Iterator

# Main database client used throughout the application
db = firestore.client()

def get_document(collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a document from Firestore.
    
    Args:
        collection: Name of the collection
        doc_id: Document identifier
        
    Returns:
        Dictionary containing document data or None if document doesn't exist
    """
    doc_ref = db.collection(collection).document(doc_id)
    doc = doc_ref.get()
    if doc.exists:
        return doc.to_dict()
    return None

def create_document(collection: str, data: Dict[str, Any]) -> str:
    """
    Create a new document in Firestore.
    
    Args:
        collection: Name of the collection
        data: Dictionary containing document data
        
    Returns:
        String containing the ID of the created document
    """
    doc_ref = db.collection(collection).document()
    doc_ref.set(data)
    return doc_ref.id

def update_document(collection: str, doc_id: str, data: Dict[str, Any]) -> None:
    """
    Update a document in Firestore.
    
    Args:
        collection: Name of the collection
        doc_id: Document identifier
        data: Dictionary containing the fields to update
    """
    doc_ref = db.collection(collection).document(doc_id)
    doc_ref.update(data)

def delete_document(collection: str, doc_id: str) -> None:
    """
    Delete a document from Firestore.
    
    Args:
        collection: Name of the collection
        doc_id: Document identifier
    """
    doc_ref = db.collection(collection).document(doc_id)
    doc_ref.delete()

def query_documents(collection: str, field: str, operator: str, value: Any) -> Iterator[firestore.DocumentSnapshot]:
    """
    Query documents in Firestore.
    
    Args:
        collection: Name of the collection
        field: Document field to filter on
        operator: Comparison operator (==, >, <, >=, <=, array_contains, in)
        value: Value to compare against
        
    Returns:
        Iterator of DocumentSnapshot objects matching the query
    """
    query = db.collection(collection).where(field, operator, value)
    return query.stream()

def order_documents(collection: str, field: str, direction: str = 'DESCENDING') -> Iterator[firestore.DocumentSnapshot]:
    """
    Order documents in Firestore.
    
    Args:
        collection: Name of the collection
        field: Document field to order by
        direction: Sort direction ('ASCENDING' or 'DESCENDING')
        
    Returns:
        Iterator of DocumentSnapshot objects ordered by the specified field
    """
    query = db.collection(collection).order_by(field, direction=direction)
    return query.stream() 