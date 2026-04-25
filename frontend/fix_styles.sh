#!/bin/bash
# ============================================================================
# Luminur PE Dashboard - Style Fix Script
# Run this to install Tailwind CSS and required dependencies
# ============================================================================

set -e

echo "🔧 Fixing Luminur styling dependencies..."

# Navigate to frontend directory
cd "$(dirname "$0")"

echo ""
echo "📦 Installing Tailwind CSS and PostCSS..."
npm install -D tailwindcss postcss autoprefixer

echo ""
echo "📦 Installing Lucide React icons..."
npm install lucide-react

echo ""
echo "📦 Installing clsx for conditional classes..."
npm install clsx

echo ""
echo "⚙️  Initializing Tailwind configuration..."
npx tailwindcss init -p

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "📝 Creating Tailwind config..."

# Create tailwind.config.js with proper content paths
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        clinical: {
          safe: '#059669',
          caution: '#d97706',
          danger: '#dc2626',
          muted: '#6b7280',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
EOF

echo ""
echo "📝 Updating index.css with Tailwind directives..."

# Backup existing index.css
if [ -f src/index.css ]; then
  cp src/index.css src/index.css.backup
fi

# Create new index.css with Tailwind
cat > src/index.css << 'EOF'
/* Tailwind CSS Base */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* IBM Plex Sans font for clinical dashboard */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

/* Root reset */
#root {
  min-height: 100vh;
}

/* Custom utility classes */
@layer components {
  .badge-safe {
    @apply bg-emerald-100 text-emerald-800 border border-emerald-200;
  }
  
  .badge-caution {
    @apply bg-amber-100 text-amber-800 border border-amber-200;
  }
  
  .badge-danger {
    @apply bg-red-100 text-red-800 border border-red-200;
  }
  
  .card {
    @apply bg-white rounded-xl shadow-sm border border-slate-200;
  }
  
  .card-header {
    @apply px-4 py-3 border-b border-slate-100;
  }
  
  .card-body {
    @apply p-4;
  }
}
EOF

echo ""
echo "✅ All done! Run 'npm run dev' to start the app."
echo ""
