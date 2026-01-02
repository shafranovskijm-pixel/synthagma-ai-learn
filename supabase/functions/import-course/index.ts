import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
function splitIntoSections(sourceHtml: string, maxChars: number = 6000): Array<{title: string, html: string}> {
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
      if (textLength > maxChars * 1.5) {
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

// Extract text from HTML
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse DOCX using simple XML extraction (basic implementation)
async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    // DOCX is a ZIP file, we need to extract document.xml
    // Using a simple approach - extract text from the XML
    const uint8 = new Uint8Array(buffer);
    
    // Find the document.xml content (simple approach)
    // In a real implementation, you'd use a proper ZIP library
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(uint8);
    
    // Try to find XML content (basic extraction)
    const docMatch = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (docMatch) {
      const texts = docMatch.map(m => {
        const textMatch = m.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return textMatch ? textMatch[1] : '';
      });
      return texts.join(' ');
    }
    
    // Fallback - just decode as text
    return decoder.decode(uint8);
  } catch (e) {
    console.error('DOCX parse error:', e);
    throw new Error('Не удалось распарсить DOCX файл');
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
      // DOCX file - extract text content
      const buffer = await file.arrayBuffer();
      const text = await parseDocx(buffer);
      sourceHtml = txtToHtml(text);
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
    const sections = splitIntoSections(sourceHtml, 6000);

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
