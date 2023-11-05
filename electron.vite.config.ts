import { defineConfig } from "electron-vite";
import * as path from "path";

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                external: ["@electron-toolkit/utils"],
            },
        },
    },
    renderer: {
        build: {
            rollupOptions: {
                input: {
                    editor: path.resolve(__dirname, "src/renderer/editor.html"),
                },
            },
        },
        esbuild: {
            pure: ["console.log"],
        },
    },
});
