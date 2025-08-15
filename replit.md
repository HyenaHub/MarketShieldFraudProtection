# MarketShield Chrome Extension

## Overview

MarketShield is a Chrome browser extension designed to provide real-time fraud detection and protection for Facebook Marketplace users. The extension automatically analyzes marketplace listings as users browse, identifying potential fraudulent content and displaying warning overlays to help users make informed purchasing decisions. It operates as a content script that monitors the Facebook Marketplace DOM, extracts listing data, and communicates with a backend API service hosted on Replit for fraud analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Chrome Extension Architecture
The extension follows the standard Chrome Extension Manifest V3 architecture with a service worker background script, content scripts, and a popup interface. The background service worker (`background.js`) handles cross-tab messaging and API communication, while content scripts (`content-script.js`) monitor the Facebook Marketplace DOM for listing data extraction and fraud detection overlay injection.

### Content Script Implementation
Uses a class-based approach with `MarketplaceMonitor` that initializes DOM observers to detect new marketplace listings. Employs mutation observers to continuously scan for dynamically loaded content typical of modern social media platforms. The DOM utility system (`dom-utils.js`) provides robust selector strategies to handle Facebook's frequently changing CSS selectors.

### API Communication Layer
Implements a rate-limited API communication system through the `MarketShieldAPI` class that queues requests to prevent overwhelming the backend service. Uses Chrome's storage API for caching settings and maintaining state across browser sessions. All API calls are proxied through the background script to maintain security boundaries.

### User Interface Components
Features a popup interface built with vanilla HTML/CSS/JavaScript that provides real-time statistics, settings management, and extension status controls. Uses CSS overlays injected into the marketplace pages to display fraud warnings with different severity levels (high, medium, low) indicated by color coding.

### Data Flow Architecture
Follows a unidirectional data flow where content scripts extract listing information, send it to the background script, which then communicates with the external API for fraud analysis. Results flow back through the same path to update the DOM with appropriate warning overlays.

## External Dependencies

### Backend API Service
Integrates with a Replit-hosted fraud detection service at `https://marketshieldfraudprotection.replit.app` for analyzing marketplace listings. The API handles the core fraud detection logic and returns risk assessments for listings.

### Chrome Extension APIs
Utilizes Chrome's `activeTab`, `storage`, `scripting`, and `tabs` permissions for DOM access, data persistence, and cross-tab communication. Implements Chrome's runtime messaging system for communication between content scripts, background script, and popup.

### Facebook Marketplace Integration
Designed specifically for Facebook Marketplace with host permissions for `facebook.com` and `marketplace.facebook.com` domains. Uses multiple CSS selector strategies to handle Facebook's dynamic DOM structure and frequent UI changes.

### Browser Storage
Leverages Chrome's local storage API for persisting user settings, caching API responses, and maintaining extension state across browser sessions.
