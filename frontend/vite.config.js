import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 3000,
        strictPort: false,
        // Allow HMR to work when accessed from other machines
        hmr: {
            host: 'localhost'
        }
    },
    build: {
        // Split the 844 kB single bundle so the first paint only downloads
        // the shell + current route; heavy chart/form libs load on demand.
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit'],
                    'charts': ['chart.js', 'react-chartjs-2'],
                    'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
                    'utils': ['axios', 'date-fns', 'sonner', 'socket.io-client']
                }
            }
        }
    }
});
