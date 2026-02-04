import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2, Sparkles, UploadCloud, X, Camera, Image as ImageIcon,
  CheckCircle2, AlertTriangle, XCircle, AlertOctagon, Activity,
  ClipboardCheck, MousePointerClick, FileDown, Sun, Moon,
  History, Trash2, Clock, ChevronRight, AlertCircle, SwitchCamera
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { jsPDF } from "jspdf";
import ImageComparisonSlider from './components/ImageComparisonSlider';

// ==========================================
// CONFIGURACIÓN
// ==========================================

// 🔑 La API KEY ahora se carga desde variables de entorno (Vercel / .env)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ==========================================
// SERVICIOS (IA Y UTILIDADES)
// ==========================================

const SYSTEM_PROMPT = `
Actúa como un Experto Senior en Control de Calidad de Impresión y Pre-impresión. Tu trabajo es comparar visualmente dos imágenes que te proporcionaré:
IMAGEN A (Referencia/Original): El archivo de diseño digital aprobado.
IMAGEN B (Muestra Impresa): Una fotografía de la impresión física.

Tu objetivo: Detectar discrepancias críticas y sutiles para validar la producción.

Debes analizar los siguientes puntos:
1. Textos: Verifica que no falten letras, que no haya errores tipográficos, y que las fuentes sean idénticas.
2. Color: Compara la tonalidad general. Advierte si está deslavada, saturada o con dominantes (magenta/cian). Sé tolerante con la luz de la foto, pero estricto con el tinte.
3. Layout/Composición: Verifica posiciones y cortes.
4. Defectos de Impresión: Busca manchas, fantasmas, repinte, fuera de registro.

Formato de Salida (JSON):
Responde SIEMPRE en formato JSON estricto:
{
"estado": "APROBADO" | "RECHAZADO" | "ADVERTENCIA",
"nivel_confianza": (número del 1 al 100),
"diferencias_detectadas": [lista de strings],
"comentario_tecnico": "Resumen breve",
"acciones_sugeridas": "Acciones concretas"
}
`;

// Helper para convertir imagen a Base64 (para persistencia y PDF)
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// Helper para preparar imagen para Gemini
const fileToPart = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Función principal de análisis
const analyzePrintQuality = async (originalFile, sampleFile) => {
  try {
    if (!API_KEY || API_KEY.includes("TU_API_KEY")) {
      throw new Error("Falta la API Key. Configúrala en Vercel (Variables de Entorno) o en el archivo .env");
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    // Usamos la versión específica 001 que es más robusta
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const originalPart = await fileToPart(originalFile);
    const samplePart = await fileToPart(sampleFile);

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      "IMAGEN A (Referencia):",
      originalPart,
      "IMAGEN B (Muestra Impresa):",
      samplePart
    ]);

    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("No response from AI");

    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error analyzing images:", error);
    throw error;
  }
};

// ==========================================
// COMPONENTES UI
// ==========================================

// --- HEADER ---
const Header = ({ darkMode, toggleDarkMode }) => {
  return (
    <header className="bg-white dark:bg-slate-950 border-b border-orange-100 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <div className="flex items-center gap-8">
            <div className="h-20 w-auto text-slate-900 dark:text-white transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 445.41 237.71" className="h-full w-auto">
                <g>
                  <path fill="currentColor" d="M201.77,211.05h1.74l7.49,16.56h-2l-1.93-4.34h-8.95l-1.95,4.34h-1.9l7.49-16.56h0ZM206.35,221.59l-3.73-8.38-3.76,8.38h7.49,0Z" />
                  <path fill="currentColor" d="M221.28,211.16h7c1.88,0,3.36.54,4.3,1.46.68.71,1.06,1.57,1.06,2.63v.05c0,2.14-1.31,3.24-2.61,3.8,1.95.59,3.52,1.71,3.52,3.97v.05c0,2.82-2.37,4.49-5.96,4.49h-7.3v-16.44h0ZM231.76,215.51c0-1.62-1.29-2.68-3.64-2.68h-5v5.66h4.86c2.23,0,3.78-1.01,3.78-2.94v-.05h0ZM228.3,220.14h-5.19v5.8h5.52c2.49,0,4.04-1.1,4.04-2.94v-.05c0-1.79-1.5-2.82-4.37-2.82h0Z" />
                  <path fill="currentColor" d="M237.18,221.57v-.05c0-3.5,2.46-6.32,5.82-6.32,3.59,0,5.66,2.87,5.66,6.41,0,.24,0,.38-.02.59h-9.63c.26,2.63,2.11,4.11,4.27,4.11,1.67,0,2.84-.68,3.83-1.71l1.13,1.01c-1.22,1.36-2.7,2.28-5,2.28-3.33,0-6.06-2.56-6.06-6.32h0ZM246.83,220.86c-.19-2.21-1.46-4.13-3.88-4.13-2.11,0-3.71,1.76-3.95,4.13h7.83Z" />
                  <path fill="currentColor" d="M251.08,221.59v-.05c0-3.43,2.68-6.34,6.34-6.34s6.32,2.87,6.32,6.29v.05c0,3.43-2.7,6.34-6.36,6.34s-6.29-2.87-6.29-6.29h-.01ZM261.88,221.59v-.05c0-2.61-1.95-4.74-4.51-4.74s-4.44,2.14-4.44,4.7v.05c0,2.61,1.93,4.72,4.49,4.72s4.46-2.11,4.46-4.67h0Z" />
                  <path fill="currentColor" d="M267,215.46h1.81v2.11c.8-1.32,2.07-2.37,4.16-2.37,2.94,0,4.65,1.97,4.65,4.86v7.54h-1.81v-7.09c0-2.25-1.22-3.66-3.36-3.66s-3.64,1.53-3.64,3.8v6.95h-1.81v-12.14Z" />
                  <path fill="currentColor" d="M282.1,224.39v-7.33h-1.69v-1.6h1.69v-3.66h1.81v3.66h3.85v1.6h-3.85v7.09c0,1.48.82,2.02,2.04,2.02.61,0,1.13-.12,1.76-.42v1.55c-.63.33-1.31.52-2.18.52-1.95,0-3.43-.96-3.43-3.43h0Z" />
                  <path fill="currentColor" d="M290.03,224.08v-.05c0-2.56,2.11-3.92,5.19-3.92,1.55,0,2.65.21,3.73.52v-.42c0-2.18-1.34-3.31-3.62-3.31-1.43,0-2.56.38-3.69.89l-.54-1.48c1.34-.61,2.65-1.01,4.42-1.01s3.03.45,3.92,1.34c.82.82,1.24,2,1.24,3.55v7.42h-1.74v-1.83c-.85,1.1-2.25,2.09-4.39,2.09-2.25,0-4.53-1.29-4.53-3.78h0ZM298.98,223.14v-1.17c-.89-.26-2.09-.52-3.57-.52-2.28,0-3.55.99-3.55,2.51v.05c0,1.53,1.41,2.42,3.05,2.42,2.23,0,4.06-1.36,4.06-3.29h.01Z" />
                  <path fill="currentColor" d="M304.41,229.72l.82-1.41c1.39,1.01,2.94,1.55,4.67,1.55,2.68,0,4.42-1.48,4.42-4.32v-1.43c-1.06,1.41-2.54,2.56-4.77,2.56-2.91,0-5.71-2.18-5.71-5.68v-.05c0-3.55,2.82-5.73,5.71-5.73,2.28,0,3.76,1.13,4.74,2.44v-2.18h1.81v10.03c0,1.88-.56,3.31-1.55,4.3-1.08,1.08-2.7,1.62-4.63,1.62s-3.9-.56-5.52-1.69h0ZM314.36,220.96v-.05c0-2.49-2.16-4.11-4.46-4.11s-4.2,1.6-4.2,4.09v.05c0,2.44,1.95,4.13,4.2,4.13s4.46-1.67,4.46-4.11Z" />
                  <path fill="currentColor" d="M326.76,219.43v-.05c0-4.65,3.48-8.5,8.31-8.5,2.98,0,4.77,1.06,6.41,2.61l-1.27,1.36c-1.39-1.32-2.94-2.25-5.17-2.25-3.64,0-6.36,2.96-6.36,6.74v.05c0,3.8,2.75,6.79,6.36,6.79,2.25,0,3.73-.87,5.31-2.37l1.22,1.2c-1.71,1.74-3.59,2.89-6.58,2.89-4.74,0-8.24-3.73-8.24-8.45v-.02Z" />
                  <path fill="currentColor" d="M343.62,221.59v-.05c0-3.43,2.68-6.34,6.34-6.34s6.32,2.87,6.32,6.29v.05c0,3.43-2.7,6.34-6.36,6.34s-6.29-2.87-6.29-6.29h-.01ZM354.42,221.59v-.05c0-2.61-1.95-4.74-4.51-4.74s-4.44,2.14-4.44,4.7v.05c0,2.61,1.93,4.72,4.49,4.72s4.46-2.11,4.46-4.67h0Z" />
                  <path fill="currentColor" d="M359.54,215.46h1.81v2.04c.8-1.2,1.88-2.3,3.92-2.3s3.24,1.06,3.9,2.42c.87-1.34,2.16-2.42,4.27-2.42,2.79,0,4.51,1.88,4.51,4.88v7.51h-1.81v-7.09c0-2.35-1.17-3.66-3.15-3.66-1.83,0-3.36,1.36-3.36,3.76v7h-1.78v-7.14c0-2.28-1.2-3.62-3.12-3.62s-3.38,1.6-3.38,3.83v6.93h-1.81v-12.14h0Z" />
                  <path fill="currentColor" d="M381.8,215.46h1.81v2.44c.99-1.46,2.42-2.7,4.65-2.7,2.91,0,5.8,2.3,5.8,6.29v.05c0,3.97-2.86,6.32-5.8,6.32-2.25,0-3.71-1.22-4.65-2.58v6.08h-1.81v-15.9h0ZM392.2,221.57v-.05c0-2.87-1.97-4.7-4.27-4.7s-4.39,1.9-4.39,4.67v.05c0,2.82,2.14,4.7,4.39,4.7s4.27-1.74,4.27-4.67Z" />
                  <path fill="currentColor" d="M396.47,224.08v-.05c0-2.56,2.11-3.92,5.19-3.92,1.55,0,2.65.21,3.73.52v-.42c0-2.18-1.34-3.31-3.62-3.31-1.43,0-2.56.38-3.69.89l-.54-1.48c1.34-.61,2.65-1.01,4.42-1.01s3.03.45,3.92,1.34c.82.82,1.24,2,1.24,3.55v7.42h-1.74v-1.83c-.85,1.1-2.25,2.09-4.39,2.09-2.25,0-4.53-1.29-4.53-3.78h0ZM405.42,223.14v-1.17c-.89-.26-2.09-.52-3.57-.52-2.28,0-3.55.99-3.55,2.51v.05c0,1.53,1.41,2.42,3.05,2.42,2.23,0,4.06-1.36,4.06-3.29h.01Z" />
                  <path fill="currentColor" d="M410.98,215.46h1.81v2.11c.8-1.32,2.07-2.37,4.16-2.37,2.94,0,4.65,1.97,4.65,4.86v7.54h-1.81v-7.09c0-2.25-1.22-3.66-3.36-3.66s-3.64,1.53-3.64,3.8v6.95h-1.81v-12.14Z" />
                  <path fill="currentColor" d="M434.18,215.46h1.93l-5.1,12.54c-1.03,2.51-2.21,3.43-4.04,3.43-1.01,0-1.76-.21-2.58-.61l.61-1.43c.59.3,1.13.45,1.9.45,1.08,0,1.76-.56,2.49-2.28l-5.52-12.09h2l4.41,10.12,3.9-10.12h0Z" />
                </g>
                <g>
                  <path fill="#ef7d00" d="M312.16,3.22c-52.77,0-95.56,42.79-95.56,95.56s42.79,95.56,95.56,95.56v-3.19c-51.01,0-92.38-41.37-92.38-92.38S261.15,6.4,312.16,6.4v-3.19h0Z" />
                  <path fill="currentColor" d="M101.92,3.22C49.15,3.22,6.35,46.01,6.35,98.78s42.79,95.56,95.56,95.56,95.56-42.79,95.56-95.56S154.69,3.22,101.92,3.22ZM82.59,137.01c-7.81,0-11.25-5.46-13.67-9.31-2.47-4.18-5.08-8.62-7.83-13.4-2-3.49-2.28-5.71-2.28-9.7v-9.92h10.17c4.68-.01,9.27-4.1,9.28-9.01,0-4.61-4.23-8.36-9.81-8.36h-13.82v52.68c0,3.86-3.16,7.03-7.03,7.03h-15.19V60.55h40.04c16.36,0,25.95,11.68,26.2,23.54.22,10.01-6.02,20.16-17.59,23.51l18.53,29.4h-17.01.01ZM156.19,137.01c-7.81,0-11.25-5.46-13.67-9.31-2.47-4.18-5.09-8.62-7.83-13.4-2-3.49-2.28-5.71-2.28-9.7v-9.92h10.17c4.68-.01,9.28-4.1,9.28-9,0-4.61-4.23-8.36-9.81-8.36h-13.82v52.68c0,3.86-3.16,7.03-7.03,7.03h-15.19V60.55h40.04c16.36,0,25.95,11.68,26.2,23.54.22,10.01-6.02,20.15-17.59,23.51l18.53,29.4h-17.01,0Z" />
                  <path fill="#ec6608" d="M430.5,108.13c0-.5-.14-.91-.43-1.23-.28-.32-.65-.58-1.11-.8-.46-.21-.99-.4-1.6-.56-.6-.16-1.23-.32-1.88-.47-.83-.23-1.63-.48-2.4-.78-.76-.3-1.44-.69-2.02-1.17-.58-.47-1.05-1.08-1.39-1.81-.34-.73-.52-1.62-.52-2.67,0-1.3.23-2.42.7-3.37.47-.95,1.09-1.74,1.88-2.37.79-.62,1.71-1.08,2.76-1.39,1.05-.3,2.15-.45,3.32-.45,1.42,0,2.75.11,4,.34,1.24.24,2.37.53,3.38.9v4.63c-.53-.18-1.08-.34-1.67-.49-.58-.16-1.17-.29-1.77-.4-.61-.11-1.2-.2-1.79-.28-.59-.07-1.15-.11-1.68-.11-.67,0-1.24.07-1.7.2-.46.12-.84.29-1.13.52-.29.21-.49.46-.62.75-.12.28-.19.57-.19.87,0,.53.14.97.42,1.3.28.34.67.61,1.16.81.5.21,1.02.38,1.56.52s1.07.27,1.58.4c.8.19,1.6.42,2.4.7.8.27,1.52.65,2.16,1.14.64.48,1.16,1.11,1.57,1.89.4.78.61,1.77.61,2.96,0,1.31-.25,2.46-.75,3.43-.49.97-1.19,1.79-2.07,2.43-.88.65-1.95,1.13-3.19,1.44-1.24.31-2.6.47-4.09.47s-2.79-.11-3.97-.34c-1.18-.24-2.15-.52-2.92-.88v-4.59c1.24.47,2.4.78,3.46.95,1.06.16,2.04.25,2.95.25.7,0,1.36-.06,1.97-.16.61-.11,1.14-.27,1.57-.49.44-.23.79-.51,1.05-.85.25-.34.38-.76.38-1.24M408.89,104.96c-.54-.13-1.16-.25-1.87-.34-.7-.11-1.42-.16-2.14-.16-1.39,0-2.49.27-3.3.83-.81.55-1.21,1.39-1.21,2.53,0,.52.09.98.28,1.38.18.39.43.72.74.97s.67.44,1.09.57c.42.13.85.2,1.32.2.57,0,1.12-.08,1.63-.23.52-.16.98-.34,1.42-.58.43-.23.82-.49,1.16-.78s.64-.57.88-.84v-3.55h0ZM409.34,112.4h-.1c-.32.34-.7.68-1.15,1.03-.44.35-.96.69-1.53,1s-1.21.56-1.92.75c-.7.2-1.47.29-2.28.29-1.11,0-2.13-.17-3.1-.52-.96-.34-1.78-.83-2.46-1.48-.69-.65-1.23-1.43-1.62-2.36-.39-.92-.59-1.94-.59-3.08,0-1.24.23-2.37.69-3.36.45-.99,1.09-1.83,1.9-2.52.82-.69,1.79-1.21,2.93-1.57,1.14-.36,2.39-.54,3.77-.54,1.01,0,1.93.07,2.78.2.84.13,1.59.28,2.23.46v-.94c0-.54-.09-1.06-.28-1.57-.18-.5-.47-.95-.88-1.34s-.94-.7-1.6-.93-1.46-.34-2.4-.34c-1.15,0-2.3.12-3.46.38-1.15.26-2.4.65-3.74,1.15v-4.44c1.17-.51,2.41-.9,3.72-1.17,1.32-.28,2.69-.42,4.13-.43,1.7,0,3.19.2,4.45.62,1.27.42,2.33.99,3.19,1.71.86.73,1.5,1.59,1.92,2.58.43.99.63,2.07.63,3.24v8.75c0,1.54.02,2.86.05,3.96s.07,2.09.1,2.95h-5.13l-.24-2.47h-.01ZM391.98,114.84c-.64.2-1.4.34-2.29.46-.88.11-1.71.16-2.48.16-1.95,0-3.55-.31-4.78-.94-1.24-.64-2.12-1.54-2.63-2.73-.37-.85-.55-2-.55-3.46v-12.04h-4.35v-4.68h4.35v-6.5h5.68v6.5h6.71v4.68h-6.71v11.3c0,.9.14,1.56.41,1.99.47.74,1.43,1.11,2.85,1.11.66,0,1.31-.05,1.96-.16s1.26-.24,1.83-.39v4.7h0ZM363.03,95.49c-.71,0-1.36.13-1.92.39-.56.26-1.04.62-1.45,1.08s-.74.99-.97,1.6c-.24.61-.4,1.25-.47,1.94h9.14c0-.69-.09-1.33-.28-1.94-.18-.61-.46-1.14-.81-1.6-.36-.46-.81-.82-1.35-1.08-.53-.26-1.16-.39-1.88-.39h0ZM365.31,110.89c1.11,0,2.25-.11,3.46-.34,1.2-.23,2.42-.55,3.64-.97v4.54c-.74.32-1.87.62-3.38.92-1.52.29-3.1.43-4.72.43s-3.21-.21-4.69-.63c-1.48-.43-2.77-1.11-3.87-2.06-1.11-.94-1.98-2.17-2.63-3.67-.65-1.51-.97-3.32-.97-5.47s.3-3.95.92-5.54c.61-1.58,1.42-2.89,2.45-3.93,1.02-1.04,2.19-1.82,3.51-2.34s2.68-.78,4.09-.78,2.82.22,4.07.67c1.24.45,2.31,1.15,3.21,2.11.91.96,1.61,2.19,2.11,3.7.51,1.51.76,3.3.76,5.36-.02.8-.04,1.48-.07,2.04h-15.24c.08,1.07.32,1.99.72,2.75.4.75.93,1.38,1.57,1.84.65.47,1.41.82,2.27,1.03s1.8.33,2.81.33h-.02ZM337.58,115.47c-2.33,0-4.27-.39-5.81-1.19-1.54-.79-2.69-1.86-3.48-3.2-.42-.72-.72-1.51-.93-2.37-.2-.86-.29-1.83-.29-2.88v-14.2h5.68v13.6c0,.79.06,1.46.16,2.03.11.57.29,1.06.51,1.47.38.7.93,1.23,1.63,1.57s1.55.52,2.52.52c1.02,0,1.9-.2,2.63-.57.72-.38,1.27-.97,1.64-1.75.37-.75.56-1.8.56-3.14v-13.72h5.68v14.2c0,1.89-.33,3.48-.98,4.78-.37.73-.84,1.4-1.42,2-.59.6-1.28,1.11-2.06,1.54-.79.42-1.69.74-2.69.98-1,.23-2.11.34-3.34.34h0ZM316.59,94.23l.25-2.61h4.99v34.4h-5.68v-9.66c0-.69,0-1.33.02-1.91.02-.59.02-1.04.04-1.36h-.04c-.35.29-.76.57-1.21.85-.46.28-.96.54-1.5.77-.55.23-1.14.42-1.78.55-.64.14-1.32.2-2.04.2-1.24,0-2.44-.22-3.61-.65-1.18-.44-2.23-1.14-3.14-2.09-.92-.95-1.65-2.18-2.21-3.68-.55-1.51-.83-3.28-.83-5.35s.29-3.87.85-5.47c.57-1.6,1.33-2.93,2.27-3.99.94-1.05,2.03-1.85,3.25-2.38,1.23-.53,2.48-.8,3.78-.8,1.39,0,2.64.29,3.75.88,1.11.58,2.03,1.35,2.75,2.31h.09ZM311.05,110.94c.57,0,1.11-.07,1.63-.22.51-.14.98-.33,1.42-.55.43-.23.82-.47,1.16-.74s.63-.54.88-.82v-10.31c-.6-.72-1.32-1.35-2.16-1.88-.85-.54-1.78-.82-2.78-.83-.57,0-1.18.11-1.81.34-.63.23-1.23.65-1.78,1.24-.56.59-1.02,1.41-1.36,2.46-.34,1.05-.52,2.33-.52,3.82,0,1.17.11,2.21.34,3.14.23.92.57,1.7,1.01,2.35.45.65,1.01,1.15,1.67,1.49s1.43.52,2.32.52h-.02ZM289.58,80.13h5.97v6.17h-5.97v-6.17ZM289.72,91.62h5.69v23.25h-5.69v-23.25ZM285.89,114.84c-.64.2-1.4.34-2.29.46-.88.11-1.71.16-2.48.16-1.95,0-3.55-.31-4.78-.94-1.24-.64-2.12-1.54-2.63-2.73-.37-.85-.55-2-.55-3.46v-12.04h-4.35v-4.68h4.35v-6.5h5.68v6.5h6.71v4.68h-6.71v11.3c0,.9.14,1.56.41,1.99.47.74,1.43,1.11,2.85,1.11.66,0,1.31-.05,1.96-.16s1.26-.24,1.83-.39v4.7h0ZM251.14,109.95h15.78v4.92h-21.66v-32.1h20.8v4.92h-14.92v8.29h12.81v4.92h-12.81v9.04h0Z" />
                </g>
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                Sherlock
              </h1>
              <p className="text-sm font-medium text-stone-500 dark:text-stone-400 tracking-wide uppercase -mt-1">
                Control de Calidad
              </p>
            </div>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-stone-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-stone-100 dark:hover:bg-slate-900 transition-all"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

// --- DROPZONE ---
const Dropzone = ({
  label,
  subLabel,
  imagePreview,
  onFileSelect,
  onClear,
  onCameraClick,
  borderColor
}) => {
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    if (file.type.startsWith('image/')) {
      onFileSelect(file);
    } else {
      alert("Por favor sube un archivo de imagen válido.");
    }
  };

  const getBorderClasses = () => {
    if (imagePreview) {
      return 'bg-white dark:bg-neutral-900 border-stone-200 dark:border-neutral-700';
    }
    if (borderColor === 'orange') {
      return 'border-orange-300 dark:border-orange-700 bg-orange-50/30 dark:bg-orange-900/10';
    }
    return 'border-stone-300 dark:border-neutral-700 bg-stone-50/30 dark:bg-neutral-900/20';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
          {label}
        </h3>
        {imagePreview && (
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <X size={14} /> Eliminar
          </button>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative flex-1 flex flex-col items-center justify-center 
          border-2 border-dashed rounded-xl transition-all duration-200
          overflow-hidden min-h-[250px] h-auto
          ${getBorderClasses()}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleInputChange}
        />

        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-contain p-4 bg-checkerboard"
          />
        ) : (
          <div className="text-center p-6 w-full relative z-10">
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 italic px-4">{subLabel}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full px-4">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 shadow-sm hover:bg-stone-50 dark:hover:bg-neutral-700 transition-colors group w-full sm:w-auto"
              >
                <UploadCloud size={20} className={borderColor === 'orange' ? "text-orange-500" : "text-stone-500"} />
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap">Subir Archivo</span>
              </button>

              <button
                onClick={onCameraClick}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-stone-800 dark:bg-white text-white dark:text-stone-900 shadow-sm hover:bg-stone-900 dark:hover:bg-stone-200 transition-colors w-full sm:w-auto"
              >
                <Camera size={20} />
                <span className="text-sm font-medium whitespace-nowrap">Usar Cámara</span>
              </button>
            </div>

            <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">o arrastra la imagen aquí</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- RESULTS ---
const Results = ({ result, referenceImage, sampleImage }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case "APROBADO": return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case "ADVERTENCIA": return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case "RECHAZADO": return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "APROBADO": return <CheckCircle2 size={32} />;
      case "ADVERTENCIA": return <AlertTriangle size={32} />;
      case "RECHAZADO": return <XCircle size={32} />;
      default: return <AlertOctagon size={32} />;
    }
  };

  const chartData = [
    { name: 'Confianza', value: result.nivel_confianza },
    { name: 'Incertidumbre', value: 100 - result.nivel_confianza },
  ];
  const chartColors = result.nivel_confianza > 85 ? ['#16a34a', '#e7e5e4'] : result.nivel_confianza > 60 ? ['#ca8a04', '#e7e5e4'] : ['#dc2626', '#e7e5e4'];

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = 20;

      doc.setFontSize(22);
      doc.setTextColor(239, 125, 0);
      doc.text("Sherlock - Reporte de Calidad", margin, yPos);
      yPos += 15;

      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text(`Estado: ${result.estado}`, margin, yPos);
      doc.setFontSize(11);
      doc.text(`Nivel de Confianza: ${result.nivel_confianza}%`, margin + 100, yPos);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin + 100, yPos - 6);
      yPos += 15;

      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Análisis Técnico", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const splitTech = doc.splitTextToSize(result.comentario_tecnico, pageWidth - (margin * 2));
      doc.text(splitTech, margin, yPos);
      yPos += (splitTech.length * 5) + 10;

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Acciones Sugeridas", margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const splitActions = doc.splitTextToSize(result.acciones_sugeridas, pageWidth - (margin * 2));
      doc.text(splitActions, margin, yPos);
      yPos += (splitActions.length * 5) + 10;

      if (result.diferencias_detectadas.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Discrepancias Detectadas", margin, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        result.diferencias_detectadas.forEach(diff => {
          const splitDiff = doc.splitTextToSize(`• ${diff}`, pageWidth - (margin * 2));
          doc.text(splitDiff, margin, yPos);
          yPos += (splitDiff.length * 5) + 2;
        });
        yPos += 10;
      }

      doc.addPage();
      yPos = 20;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Evidencia Visual", margin, yPos);
      yPos += 10;

      const imgWidth = (pageWidth - (margin * 3)) / 2;
      const imgHeight = 100;

      if (referenceImage) {
        doc.setFontSize(10);
        doc.text("Referencia (Archivo)", margin, yPos);
        if (referenceImage.startsWith('data:')) {
          doc.addImage(referenceImage, 'JPEG', margin, yPos + 5, imgWidth, imgHeight, undefined, 'FAST');
        }
      }

      if (sampleImage) {
        doc.setFontSize(10);
        doc.text("Muestra (Foto)", margin + imgWidth + margin, yPos);
        if (sampleImage.startsWith('data:')) {
          doc.addImage(sampleImage, 'JPEG', margin + imgWidth + margin, yPos + 5, imgWidth, imgHeight, undefined, 'FAST');
        }
      }

      doc.save(`sherlock-report-${Date.now()}.pdf`);

    } catch (e) {
      console.error("PDF generation failed", e);
      alert("Hubo un error generando el PDF. Revisa la consola.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`p-6 rounded-xl border-2 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-300 ${getStatusColor(result.estado)}`}>
        <div className="flex items-center gap-4 w-full md:w-auto">
          {getStatusIcon(result.estado)}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider opacity-80">Estado de Calidad</p>
            <h2 className="text-3xl font-extrabold tracking-tight">{result.estado}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-20 w-20 relative hidden sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={35}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index]} />
                  ))}
                </Pie>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold fill-current">
                  {result.nivel_confianza}%
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <button
            onClick={generatePDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg border border-current transition-colors text-sm font-bold whitespace-nowrap"
          >
            {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {isGeneratingPdf ? "Generando..." : "Descargar Reporte"}
          </button>
        </div>
      </div>

      {/* COMPARATIVA VISUAL */}
      {referenceImage && sampleImage && (
        <div className="animate-fade-in delay-100">
          <ImageComparisonSlider
            beforeImage={referenceImage}
            afterImage={sampleImage}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-stone-200 dark:border-neutral-800 p-6 transition-colors duration-300">
          <div className="flex items-center gap-2 mb-4 text-stone-800 dark:text-stone-100">
            <Activity className="text-orange-600 dark:text-orange-400" size={20} />
            <h3 className="font-bold text-lg">Análisis Técnico</h3>
          </div>
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
            {result.comentario_tecnico}
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-stone-200 dark:border-neutral-800 p-6 transition-colors duration-300">
          <div className="flex items-center gap-2 mb-4 text-stone-800 dark:text-stone-100">
            <ClipboardCheck className="text-stone-600 dark:text-stone-400" size={20} />
            <h3 className="font-bold text-lg">Acciones Sugeridas</h3>
          </div>
          <p className="text-stone-600 dark:text-stone-400 font-medium">
            {result.acciones_sugeridas}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-stone-200 dark:border-neutral-800 overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-stone-100 dark:border-neutral-800 flex items-center gap-2">
          <MousePointerClick className="text-orange-500" size={20} />
          <h3 className="font-bold text-lg text-stone-800 dark:text-stone-100">Detalle de Discrepancias</h3>
        </div>

        {result.diferencias_detectadas.length > 0 ? (
          <ul className="divide-y divide-stone-100 dark:divide-neutral-800">
            {result.diferencias_detectadas.map((diff, idx) => (
              <li key={idx} className="p-4 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors flex items-start gap-3">
                <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-red-500" />
                <span className="text-stone-700 dark:text-stone-300">{diff}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-stone-500 dark:text-stone-400">
            <CheckCircle2 size={48} className="mx-auto text-green-400 mb-3" />
            <p>No se detectaron discrepancias significativas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- HISTORY LIST ---
const HistoryList = ({
  history,
  onSelect,
  onClear,
  selectedId
}) => {
  if (history.length === 0) {
    return null;
  }

  const formatDate = (timestamp) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "APROBADO": return <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />;
      case "ADVERTENCIA": return <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />;
      case "RECHAZADO": return <XCircle size={16} className="text-red-600 dark:text-red-400" />;
      default: return <AlertOctagon size={16} className="text-stone-600 dark:text-stone-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "APROBADO": return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case "ADVERTENCIA": return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case "RECHAZADO": return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300';
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-neutral-800 transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-800 dark:text-white flex items-center gap-2">
          <History size={20} />
          Historial
        </h2>
        <button
          onClick={onClear}
          className="text-xs text-stone-500 hover:text-red-500 dark:text-stone-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
          title="Borrar historial"
        >
          <Trash2 size={14} />
          Limpiar
        </button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`
              group p-3 rounded-xl border cursor-pointer transition-all duration-200 relative
              ${selectedId === item.id
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 ring-1 ring-orange-200 dark:ring-orange-800'
                : 'bg-white dark:bg-neutral-900 border-stone-100 dark:border-neutral-800 hover:border-stone-300 dark:hover:border-neutral-700 hover:bg-stone-50 dark:hover:bg-neutral-800/50'
              }
            `}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(item.estado)}`}>
                {getStatusIcon(item.estado)}
                {item.estado}
              </div>
              <span className="text-xs text-stone-400 font-medium flex items-center gap-1">
                <Clock size={12} />
                {formatDate(item.timestamp)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-stone-600 dark:text-stone-400 line-clamp-1">
                Confianza: <span className="font-semibold text-stone-900 dark:text-stone-200">{item.nivel_confianza}%</span>
              </div>
              <ChevronRight
                size={16}
                className={`text-stone-300 dark:text-stone-600 transition-transform duration-200 ${selectedId === item.id ? 'text-orange-500 dark:text-orange-400 rotate-90' : 'group-hover:translate-x-1'}`}
              />
            </div>

            {selectedId === item.id && (
              <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-900/30 text-xs space-y-3 animate-fade-in">

                <div>
                  <h4 className="font-bold text-stone-700 dark:text-stone-300 mb-1">Análisis Técnico</h4>
                  <p className="text-stone-600 dark:text-stone-400 leading-relaxed bg-white/50 dark:bg-neutral-800/50 p-2 rounded-lg border border-stone-100 dark:border-neutral-700/50">
                    {item.comentario_tecnico}
                  </p>
                </div>

                {item.diferencias_detectadas.length > 0 && (
                  <div>
                    <h4 className="font-bold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1">
                      <AlertCircle size={12} className="text-red-500" />
                      Discrepancias ({item.diferencias_detectadas.length})
                    </h4>
                    <ul className="space-y-1.5 bg-red-50/50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                      {item.diferencias_detectadas.slice(0, 3).map((diff, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-stone-700 dark:text-stone-300">
                          <span className="mt-1 w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                          <span className="leading-tight">{diff}</span>
                        </li>
                      ))}
                      {item.diferencias_detectadas.length > 3 && (
                        <li className="text-[10px] text-stone-500 dark:text-stone-400 pl-2.5 italic">
                          + {item.diferencias_detectadas.length - 3} más (ver panel principal)
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-stone-700 dark:text-stone-300 mb-1">Acciones Sugeridas</h4>
                  <p className="text-stone-600 dark:text-stone-400 leading-relaxed italic bg-white/50 dark:bg-neutral-800/50 p-2 rounded-lg border-l-2 border-orange-400 dark:border-orange-600 shadow-sm">
                    {item.acciones_sugeridas}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- CAMERA MODAL ---
const CameraModal = ({ isOpen, onClose, onCapture, label }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const elementWidth = video.offsetWidth;
      const elementHeight = video.offsetHeight;

      const scaleX = videoWidth / elementWidth;
      const scaleY = videoHeight / elementHeight;

      const cropWidth = videoWidth * 0.7;
      const cropHeight = videoHeight * 0.6;
      const startX = (videoWidth - cropWidth) / 2;
      const startY = (videoHeight - cropHeight) / 2;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      context.drawImage(
        video,
        startX, startY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="relative z-10 bg-black/50 p-4 flex justify-between items-center text-white">
        <h3 className="font-semibold">Fotografiar: {label}</h3>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {error ? (
          <div className="text-white p-4 text-center">
            <p>{error}</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-stone-700 rounded">Cerrar</button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-[50px] border-black/60 pointer-events-none flex items-center justify-center">
              <div className="w-full h-full border-2 border-orange-500 relative box-content shadow-[0_0_0_999px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-orange-500 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-orange-500 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-orange-500 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-orange-500 -mb-1 -mr-1"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full whitespace-nowrap">
                  Encuadra la etiqueta aquí
                </div>
              </div>
            </div>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="relative z-10 bg-black/80 p-8 pb-12 flex justify-around items-center">
        <button
          onClick={toggleCamera}
          className="p-3 rounded-full bg-stone-800 text-white hover:bg-stone-700 transition-colors"
        >
          <SwitchCamera size={24} />
        </button>

        <button
          onClick={handleCapture}
          className="p-1 rounded-full border-4 border-white transition-transform active:scale-95"
        >
          <div className="w-16 h-16 bg-white rounded-full border-4 border-black"></div>
        </button>

        <div className="w-12"></div>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (APP)
// ==========================================

export default function App() {
  const [referenceImage, setReferenceImage] = useState({ file: null, preview: null });
  const [sampleImage, setSampleImage] = useState({ file: null, preview: null });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeCameraTarget, setActiveCameraTarget] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const savedHistory = localStorage.getItem('printguard_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleFileSelect = (type, file) => {
    const preview = URL.createObjectURL(file);
    if (type === 'reference') {
      setReferenceImage({ file, preview });
    } else {
      setSampleImage({ file, preview });
    }
    setResult(null);
    setSelectedHistoryId(null);
    setError(null);
  };

  const openCamera = (type) => {
    setActiveCameraTarget(type);
    setIsCameraOpen(true);
  };

  const handleCameraCapture = (file) => {
    if (activeCameraTarget) {
      handleFileSelect(activeCameraTarget, file);
    }
    setIsCameraOpen(false);
    setActiveCameraTarget(null);
  };

  const clearImage = (type) => {
    if (type === 'reference') {
      setReferenceImage({ file: null, preview: null });
    } else {
      setSampleImage({ file: null, preview: null });
    }
    setResult(null);
    setSelectedHistoryId(null);
  };

  const addToHistory = async (newResult) => {
    if (!referenceImage.file || !sampleImage.file) return;

    const refBase64 = await fileToBase64(referenceImage.file);
    const sampleBase64 = await fileToBase64(sampleImage.file);

    const newItem = {
      ...newResult,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      referenceImageBase64: refBase64,
      sampleImageBase64: sampleBase64
    };

    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    setSelectedHistoryId(newItem.id);
    localStorage.setItem('printguard_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
      setHistory([]);
      localStorage.removeItem('printguard_history');
      if (selectedHistoryId) {
        setResult(null);
        setSelectedHistoryId(null);
      }
    }
  };

  const handleHistorySelect = (item) => {
    setResult(item);
    setSelectedHistoryId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalysis = async () => {
    if (!referenceImage.file || !sampleImage.file) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setSelectedHistoryId(null);

    try {
      const data = await analyzePrintQuality(referenceImage.file, sampleImage.file);
      setResult(data);
      await addToHistory(data);
    } catch (err) {
      setError("Hubo un error procesando las imágenes. Por favor verifica tu API Key e intenta nuevamente.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = referenceImage.file !== null && sampleImage.file !== null && !isAnalyzing;

  const currentDisplayReference = selectedHistoryId
    ? history.find(h => h.id === selectedHistoryId)?.referenceImageBase64
    : referenceImage.preview;

  const currentDisplaySample = selectedHistoryId
    ? history.find(h => h.id === selectedHistoryId)?.sampleImageBase64
    : sampleImage.preview;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-neutral-950 transition-colors duration-300 font-sans">
      <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl shadow-sm border border-stone-200 dark:border-neutral-800 transition-colors duration-300">
              <h2 className="text-lg font-bold text-stone-800 dark:text-white mb-4">Carga de Archivos</h2>
              <div className="space-y-6">
                <Dropzone
                  label="Imagen A (Referencia)"
                  subLabel="Archivo digital"
                  imagePreview={currentDisplayReference || referenceImage.preview}
                  onFileSelect={(f) => handleFileSelect('reference', f)}
                  onClear={() => clearImage('reference')}
                  onCameraClick={() => openCamera('reference')}
                  borderColor="orange"
                />
                <Dropzone
                  label="Imagen B (Muestra)"
                  subLabel="Impresión física"
                  imagePreview={currentDisplaySample || sampleImage.preview}
                  onFileSelect={(f) => handleFileSelect('sample', f)}
                  onClear={() => clearImage('sample')}
                  onCameraClick={() => openCamera('sample')}
                  borderColor="stone"
                />
              </div>

              <div className="mt-6">
                <button
                  onClick={handleAnalysis}
                  disabled={!canAnalyze}
                  className={`
                    w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3
                    ${canAnalyze
                      ? 'bg-gradient-to-r from-orange-500 to-orange-700 text-white hover:shadow-orange-500/25 transform hover:-translate-y-0.5'
                      : 'bg-stone-200 dark:bg-neutral-800 text-stone-400 dark:text-neutral-600 cursor-not-allowed shadow-none'}
                  `}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} /> Analizar Calidad
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}
            </div>

            <HistoryList
              history={history}
              onSelect={handleHistorySelect}
              onClear={clearHistory}
              selectedId={selectedHistoryId}
            />
          </div>

          <div className="lg:col-span-7">
            {result ? (
              <div className="animate-fade-in">
                {selectedHistoryId && (
                  <div className="mb-4 flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-300">
                    <span>Visualizando análisis histórico</span>
                    <span className="font-mono text-xs opacity-75">
                      {new Date(history.find(h => h.id === selectedHistoryId)?.timestamp || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                <Results
                  result={result}
                  referenceImage={currentDisplayReference}
                  sampleImage={currentDisplaySample}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-stone-200 dark:border-neutral-800 border-dashed min-h-[400px] lg:min-h-[600px] transition-colors duration-300">
                <div className="w-24 h-24 bg-stone-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 transition-colors duration-300">
                  <Sparkles className="text-stone-300 dark:text-neutral-600" size={40} />
                </div>
                <h3 className="text-xl font-bold text-stone-700 dark:text-stone-200 mb-3">Esperando Análisis</h3>
                <p className="text-stone-500 dark:text-stone-400 max-w-lg mx-auto leading-relaxed text-base px-4">
                  Sube el archivo de referencia y la foto de la muestra para comenzar el control de calidad asistido por IA.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-neutral-900 border-t border-stone-200 dark:border-neutral-800 py-6 mt-auto transition-colors duration-300">
        <div className="container mx-auto px-4 text-center text-stone-400 text-sm">
          &copy; {new Date().getFullYear()} Sherlock. Powered by Gemini 1.5 Flash.
          <span className="block text-xs mt-1 text-stone-300">
            Key: ...{API_KEY ? API_KEY.slice(-4) : "NONE"}
          </span>
        </div>
      </footer>

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        label={activeCameraTarget === 'reference' ? 'Imagen de Referencia' : 'Muestra Impresa'}
      />
    </div>
  );
}