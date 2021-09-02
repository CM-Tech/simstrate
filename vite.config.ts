import { defineConfig } from 'vite'

export default defineConfig({
    esbuild:{
        target:["chrome92"]
    },
    base: "./"
})