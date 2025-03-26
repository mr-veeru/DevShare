"""
Firebase service module.
This module provides a set of utility functions for interacting with Firestore database.
These functions handle common database operations such as getting, creating, updating, 
and deleting documents, as well as querying collections.
"""
from firebase_admin import firestore
from typing import Dict, Any, List, Optional, Iterator, Union

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
        data = doc.to_dict()
        data['id'] = doc.id  # Add id to returned data for convenience
        return data
    return None

def create_document(collection: str, data: Dict[str, Any], doc_id: str = None) -> str:
    """
    Create a new document in Firestore.
    
    Args:
        collection: Name of the collection
        data: Dictionary containing document data
        doc_id: Optional ID for the document. If None, an auto-generated ID is used.
        
    Returns:
        String containing the ID of the created document
    """
    if doc_id:
        doc_ref = db.collection(collection).document(doc_id)
        doc_ref.set(data)
        return doc_id
    else:
        doc_ref = db.collection(collection).document()
        doc_ref.set(data)
        return doc_ref.id

def update_document(collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
    """
    Update a document in Firestore.
    
    Args:
        collection: Name of the collection
        doc_id: Document identifier
        data: Dictionary containing the fields to update
        
    Returns:
        Boolean indicating if update was successful
    """
    try:
        doc_ref = db.collection(collection).document(doc_id)
        doc_ref.update(data)
        return True
    except Exception:
        return False

def delete_document(collection: str, doc_id: str) -> bool:
    """
    Delete a document from Firestore.
    
    Args:
        collection: Name of the collection
        doc_id: Document identifier
        
    Returns:
        Boolean indicating if deletion was successful
    """
    try:
        doc_ref = db.collection(collection).document(doc_id)
        doc_ref.delete()
        return True
    except Exception:
        return False

def query_documents(
    collection: str, 
    filters: List[tuple] = None, 
    order_by: str = None, 
    direction: str = 'DESCENDING',
    limit_count: int = None
) -> List[Dict[str, Any]]:
    """
    Query documents in Firestore with multiple filters and options.
    
    Args:
        collection: Name of the collection
        filters: Optional list of (field, operator, value) tuples
        order_by: Optional field to order results by
        direction: Sort direction ('ASCENDING' or 'DESCENDING')
        limit_count: Optional maximum number of results
        
    Returns:
        List of document dictionaries with their IDs
    """
    query = db.collection(collection)
    
    # Apply filters if provided
    if filters:
        for field, operator, value in filters:
            query = query.where(field, operator, value)
    
    # Apply ordering if provided
    if order_by:
        dir_constant = firestore.Query.DESCENDING if direction == 'DESCENDING' else firestore.Query.ASCENDING
        query = query.order_by(order_by, direction=dir_constant)
    
    # Apply limit if provided
    if limit_count:
        query = query.limit(limit_count)
    
    # Execute query and format results
    results = []
    for doc in query.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        results.append(data)
    
    return results 