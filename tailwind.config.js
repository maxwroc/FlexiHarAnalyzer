module.exports = {
    content: ['./src/**/*.{js,ts,jsx,tsx}'],
    plugins: [require('daisyui')],
    daisyui: {
        themes: [
            {
                "custom": {
                    "primary": "#336aff",
                    "primary-content": "#cfdce7",

                    "secondary": "#10b981",
                    "secondary-content": "#000d06",
                              
                    "accent": "#1d4ed8",
                    "accent-content": "#cfdefb",
                              
                    "neutral": "#2a323c",
                    "neutral-content": "#e0e1e4",
                              
                    "base-100": "#1d232a",
                    "base-200": "#1d232a",
                    "base-300": "#1d232a",
                    "base-content": "#d2d8ee",
                              
                    "info": "#0000ff",
                    "info-content": "#c6dbff",

                    "success": "#00ff64",
                    "success-content": "#001603",
                              
                    "warning": "#fde047",
                    "warning-content": "#161202",
                              
                    "error": "#e11d48",
                    "error-content": "#ffd8d9",
                }
            }
        ],
    }
};