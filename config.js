// ==============================================================================
// HOANG KIM HUE PROJECT - SYSTEM & API CONFIGURATION (config.js)
// ==============================================================================

const SYSTEM_CONFIG = {
    AUTHOR_NAME: "Hoàng Kim Huệ",
    PROJECT_NAME: "Hoang Kim Hue Project - Universal AI Data Analytics Platform",
    API_KEY: "AQ.Ab8RN6IV4VsXRh-yjZBccjHuGqK2bil_6k3FmBEBAX8HEiGCZA",
    MODEL: "gemini-1.5-flash",
    API_ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    ROLE: "Lead AI & Data Intelligence Specialist",
    VERSION: "3.0.0-PROD"
};

// Expose to window for global access
window.SYSTEM_CONFIG = SYSTEM_CONFIG;
