import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as mammoth from "https://esm.sh/mammoth@1.6.0";
import * as JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert plain text to HTML paragraphs
function txtToHtml(text: string): string {
  const escapeHtml = (s: string) => 
    s.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&#039;');
  
  const parts = text.split(/\n\s*\n/).filter(p => p.trim());
  return parts.map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`).join('\n');
}

// Split HTML content into sections based on headings or paragraph count
function splitIntoSections(sourceHtml: string, maxChars: number = 8000): Array<{title: string, html: string}> {
  // Check for headings h1-h3
  const headingRegex = /<h[1-3][^>]*>/i;
  
  if (headingRegex.test(sourceHtml)) {
    // Split by headings
    const chunks = sourceHtml.split(/(?=<h[1-3][^>]*>)/i).filter(c => c.trim());
    const sections: Array<{title: string, html: string}> = [];
    let buffer = '';
    let title: string | null = null;

    const flush = () => {
      if (buffer.trim()) {
        sections.push({ title: title || 'Раздел', html: buffer });
      }
      buffer = '';
      title = null;
    };

    for (const chunk of chunks) {
      const match = chunk.match(/<h([1-3])[^>]*>(.*?)<\/h\1>/is);
      if (match && buffer.trim()) {
        flush();
      }
      if (match) {
        const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
        title = rawTitle || 'Раздел';
        buffer += chunk;
      } else {
        buffer += chunk;
      }

      // Check text length without tags
      const textLength = buffer.replace(/<[^>]+>/g, '').length;
      if (textLength > maxChars * 1.6) {
        flush();
      }
    }
    flush();
    return sections;
  }

  // No headings - split by paragraphs
  const paras = sourceHtml.split(/(?<=<\/p>)/i).filter(p => p.trim());
  const sections: Array<{title: string, html: string}> = [];
  let buffer = '';
  let idx = 1;

  for (const p of paras) {
    const combinedLength = (buffer + p).replace(/<[^>]+>/g, '').length;
    if (combinedLength > maxChars && buffer.trim()) {
      sections.push({ title: `Раздел ${idx}`, html: buffer });
      idx++;
      buffer = p;
    } else {
      buffer += p;
    }
  }

  if (buffer.trim()) {
    sections.push({ title: `Раздел ${idx}`, html: buffer });
  }

  return sections;
}

// Parse DOCX using mammoth (preserves styles, tables, images)
async function parseDocxWithMammoth(buffer: ArrayBuffer): Promise<string> {
  try {
    console.log('Parsing DOCX with mammoth, buffer size:', buffer.byteLength);
    
    // Convert image to base64 inline
    const convertImage = mammoth.images.imgElement((image: any) => {
      return image.read("base64").then((imageData: string) => {
        const contentType = image.contentType || 'image/png';
        return {
          src: `data:${contentType};base64,${imageData}`
        };
      });
    });

    const result = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        convertImage: convertImage,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Заголовок 1'] => h1:fresh",
          "p[style-name='Заголовок 2'] => h2:fresh",
          "p[style-name='Заголовок 3'] => h3:fresh",
          "b => strong",
          "i => em",
          "u => u",
        ]
      }
    );

    let html = (result.value || '').trim();
    
    // Add classes to tables for styling
    html = html.replace(/<table>/g, '<table class="min-w-full text-sm border border-border">');
    html = html.replace(/<td>/g, '<td class="border border-border px-3 py-2">');
    html = html.replace(/<th>/g, '<th class="border border-border px-3 py-2 bg-muted font-semibold">');
    
    // Add classes to images
    html = html.replace(/<img([^>]+)>/g, '<img$1 class="rounded-lg max-w-full my-3">');

    console.log('Mammoth conversion complete, messages:', result.messages);
    
    return html;
  } catch (e) {
    console.error('Mammoth parse error:', e);
    throw new Error('Не удалось распарсить DOCX файл: ' + (e as Error).message);
  }
}

// Fallback DOCX parser using JSZip
async function parseDocxFallback(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml')?.async('string');
    
    if (!docXml) {
      throw new Error('Не найден document.xml в DOCX');
    }
    
    // Extract text content and basic formatting
    let html = '';
    
    // Process paragraphs
    const paragraphs = docXml.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/g) || [];
    
    for (const para of paragraphs) {
      // Check for heading style
      const styleMatch = para.match(/<w:pStyle w:val="([^"]+)"/);
      const style = styleMatch ? styleMatch[1] : '';
      
      // Extract text runs
      const runs = para.match(/<w:r[^>]*>[\s\S]*?<\/w:r>/g) || [];
      let paraContent = '';
      
      for (const run of runs) {
        const textMatches = run.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        for (const t of textMatches) {
          const textMatch = t.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
          if (textMatch) {
            let text = textMatch[1];
            
            // Check for bold
            if (run.includes('<w:b') || run.includes('<w:b/>')) {
              text = `<strong>${text}</strong>`;
            }
            // Check for italic
            if (run.includes('<w:i') || run.includes('<w:i/>')) {
              text = `<em>${text}</em>`;
            }
            
            paraContent += text;
          }
        }
      }
      
      if (paraContent.trim()) {
        // Determine tag based on style
        if (style.includes('Heading1') || style.includes('Заголовок1') || style === 'Title') {
          html += `<h1>${paraContent}</h1>\n`;
        } else if (style.includes('Heading2') || style.includes('Заголовок2')) {
          html += `<h2>${paraContent}</h2>\n`;
        } else if (style.includes('Heading3') || style.includes('Заголовок3')) {
          html += `<h3>${paraContent}</h3>\n`;
        } else {
          html += `<p>${paraContent}</p>\n`;
        }
      }
    }
    
    return html;
  } catch (e) {
    console.error('JSZip fallback error:', e);
    throw e;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ожидается multipart/form-data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'Файл не загружен' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileName = file.name.toLowerCase();
    let sourceHtml = '';
    let courseTitle = file.name.replace(/\.[^.]+$/, '');

    console.log(`Processing file: ${fileName}, size: ${file.size}`);

    if (fileName.endsWith('.txt')) {
      // Plain text file
      const text = await file.text();
      sourceHtml = txtToHtml(text);
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      // HTML file - extract body content
      let html = await file.text();
      
      // Extract body content if present
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        html = bodyMatch[1];
      }
      
      // Extract title if present
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      if (titleMatch) {
        courseTitle = titleMatch[1].trim() || courseTitle;
      }
      
      sourceHtml = html;
    } else if (fileName.endsWith('.docx')) {
      // DOCX file - use mammoth for full HTML conversion with styles, tables, images
      const buffer = await file.arrayBuffer();
      
      try {
        sourceHtml = await parseDocxWithMammoth(buffer);
      } catch (mammothError) {
        console.log('Mammoth failed, trying fallback:', mammothError);
        sourceHtml = await parseDocxFallback(buffer);
      }
    } else if (fileName.endsWith('.doc')) {
      // Old DOC format - try to extract text
      const text = await file.text();
      // Filter out binary garbage
      const cleanText = text.replace(/[^\x20-\x7E\u0400-\u04FF\n\r\t]/g, ' ').replace(/\s+/g, ' ');
      sourceHtml = txtToHtml(cleanText);
    } else if (fileName.endsWith('.pdf')) {
      // PDF - return message that we need additional processing
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'PDF файлы требуют дополнительной обработки. Пожалуйста, сконвертируйте в DOCX или TXT.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Неподдерживаемый формат файла. Поддерживаются: .docx, .doc, .txt, .html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Split into sections/lessons
    const sections = splitIntoSections(sourceHtml, 8000);

    console.log(`Parsed ${sections.length} sections from file`);

    // Convert sections to lessons format
    const lessons = sections.map((section, index) => ({
      id: crypto.randomUUID(),
      type: 'text',
      title: section.title,
      content: section.html,
      order_index: index,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        courseTitle,
        lessons,
        sectionsCount: sections.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Ошибка обработки файла' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
