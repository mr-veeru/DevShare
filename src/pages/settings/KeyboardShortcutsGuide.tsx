/**
 * @fileoverview Keyboard Shortcuts Guide Component
 * Provides comprehensive documentation of keyboard shortcuts and navigation
 * for users who prefer or require keyboard-based interaction.
 */

import React from 'react';
import './KeyboardShortcutsGuide.css';

interface ShortcutCategory {
  name: string;
  shortcuts: {
    key: string;
    description: string;
  }[];
}

const KeyboardShortcutsGuide: React.FC = () => {
  const shortcuts: ShortcutCategory[] = [
    {
      name: 'General Navigation',
      shortcuts: [
        { key: 'Tab', description: 'Move to next focusable element' },
        { key: 'Shift + Tab', description: 'Move to previous focusable element' },
        { key: 'Enter / Space', description: 'Activate button or link' },
        { key: 'Escape', description: 'Close dialog, dropdown, or cancel current operation' },
        { key: 'c', description: 'Focus on comment input field (when available)' }
      ]
    },
    {
      name: 'Comment Section',
      shortcuts: [
        { key: 'Enter', description: 'Submit comment or reply (when text field is focused)' },
        { key: 'Shift + Enter', description: 'Add a line break in comment or reply' },
        { key: 'Escape', description: 'Cancel editing or replying' },
        { key: 'Enter / Space', description: 'Like/unlike comment (when like button is focused)' },
        { key: 'Enter / Space', description: 'Show/hide replies (when toggle is focused)' }
      ]
    },
    {
      name: 'Dialogs & Menus',
      shortcuts: [
        { key: 'Escape', description: 'Close active dialog or menu' },
        { key: 'Tab', description: 'Navigate through dialog options' },
        { key: 'Enter', description: 'Confirm dialog action' },
        { key: 'Escape', description: 'Cancel dialog' }
      ]
    },
    {
      name: 'Content Navigation',
      shortcuts: [
        { key: 'Tab', description: 'Navigate through post content' },
        { key: 'Enter / Space', description: 'Toggle expansion of post content' },
        { key: 'Enter / Space', description: 'Show more/less comments' }
      ]
    }
  ];

  return (
    <div className="keyboard-shortcuts-container">
      <h1>Keyboard Navigation Guide</h1>
      <p className="intro-text">
        DevShare is fully accessible via keyboard navigation. This guide outlines keyboard shortcuts and
        navigation patterns to help users who prefer or require keyboard-based interaction.
      </p>

      {shortcuts.map((category) => (
        <div key={category.name} className="shortcut-category">
          <h2>{category.name}</h2>
          <table className="shortcuts-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {category.shortcuts.map((shortcut, index) => (
                <tr key={index}>
                  <td className="key-column">
                    {shortcut.key.split('+').map((k, i, arr) => (
                      <React.Fragment key={i}>
                        <kbd>{k.trim()}</kbd>
                        {i < arr.length - 1 && ' + '}
                      </React.Fragment>
                    ))}
                  </td>
                  <td>{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="aria-info">
        <h2>Screen Reader Support</h2>
        <p>
          DevShare is optimized for screen reader compatibility with appropriate ARIA labels, 
          landmark regions, and semantic HTML. Interactive elements like buttons and forms are
          properly labeled for screen reader users.
        </p>
      </div>
    </div>
  );
};

export default KeyboardShortcutsGuide; 