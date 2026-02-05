/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			screens: {
				'mobile': '768px',     // Breakpoint para móviles (celulares)
				'xl-custom': '1428px', // Breakpoint personalizado para cambios responsive
			},
		},
	},
	plugins: [],
} 