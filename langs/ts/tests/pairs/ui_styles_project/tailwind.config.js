// The project's own Tailwind v3 configuration (exec/styles.mjs reads it as a literal): a brand colour and a spacing step.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.tsx'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#1f6feb', 600: '#1158c7' },
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
};
