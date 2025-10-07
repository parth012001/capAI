/// <reference types="vite/client" />

// Declare module for importing HTML files as raw strings
declare module '*.html?raw' {
  const content: string;
  export default content;
}
