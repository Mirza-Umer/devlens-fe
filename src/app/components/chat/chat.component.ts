import { 
  Component, 
  inject, 
  signal, 
  ViewEncapsulation, 
  effect, 
  ViewChild, 
  ElementRef, 
  HostListener 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../../services/project.service';
import { AiService } from '../../services/ai.service';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { environment } from '../../../environments/environment';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  filesUsed?: string[];
}

interface ActiveFilePreview {
  name: string;
  path: string;
  content: string;
  lineCount: number;
  loading: boolean;
  copied: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  private projectService = inject(ProjectService);
  private aiService = inject(AiService);
  private http = inject(HttpClient);

  @ViewChild('chatTextarea') chatTextarea?: ElementRef<HTMLTextAreaElement>;

  selectedProject = this.projectService.selectedProject;
  
  messages = signal<ChatMessage[]>([]);
  question = '';
  isLoading = signal(false);

  // Active file preview drawer state
  activePreviewFile = signal<ActiveFilePreview | null>(null);

  // Starter prompts in empty state
  starterPrompts = [
    {
      badge: 'Architecture',
      title: 'Explain the core system architecture and directory flow'
    },
    {
      badge: 'Auth & Security',
      title: 'Where and how is user authentication handled?'
    },
    {
      badge: 'Endpoints',
      title: 'List the main backend API endpoints and controllers'
    },
    {
      badge: 'Database',
      title: 'Show database models, schemas, and relation entities'
    }
  ];

  constructor() {
    this.configureMarked();

    effect(() => {
      const project = this.selectedProject();
      if (project) {
        this.loadHistory(project.id);
      } else {
        this.messages.set([]);
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.activePreviewFile()) {
      this.closeFilePreview();
    }
  }

  private configureMarked() {
    marked.use({
      renderer: {
        code(token: any) {
          const rawText = token.text || '';
          const rawLang = (token.lang || '').trim().toLowerCase();
          const validLang = rawLang && hljs.getLanguage(rawLang) ? rawLang : undefined;
          
          let highlighted = '';
          try {
            highlighted = validLang
              ? hljs.highlight(rawText, { language: validLang, ignoreIllegals: true }).value
              : hljs.highlightAuto(rawText).value;
          } catch {
            highlighted = rawText
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
          }

          const displayLang = (validLang || rawLang || 'code').toUpperCase();

          return `<div class="code-block-wrapper">
            <div class="code-header">
              <span class="code-lang">${displayLang}</span>
              <button type="button" class="copy-code-btn" aria-label="Copy code">
                <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span class="copy-label">Copy</span>
              </button>
            </div>
            <pre><code class="hljs ${validLang ? 'language-' + validLang : ''}">${highlighted}</code></pre>
          </div>`;
        }
      }
    });
  }

  private sanitizeMarkdown(html: string): string {
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ['button', 'svg', 'path', 'rect', 'line', 'polyline', 'polygon', 'circle', 'span'],
      ADD_ATTR: [
        'aria-label',
        'viewBox',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'd',
        'x',
        'y',
        'width',
        'height',
        'rx',
        'ry',
        'points',
        'cx',
        'cy',
        'r',
        'class'
      ]
    });
  }

  loadHistory(projectId: number) {
    this.isLoading.set(true);
    this.messages.set([]);
    this.aiService.getHistory(projectId).subscribe({
      next: async (history) => {
        const parsedMessages = await Promise.all(
          history.map(async (msg) => {
            let content = msg.content;
            if (msg.role === 'ai') {
              const rawHtml = await marked(content);
              content = this.sanitizeMarkdown(rawHtml);
            }
            return {
              role: msg.role,
              content,
              filesUsed: msg.filesUsed || []
            };
          })
        );
        this.messages.set(parsedMessages);
        this.isLoading.set(false);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error('Failed to load history', err);
        this.isLoading.set(false);
      }
    });
  }

  // Keyboard shortcut handler for multi-line textarea
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Shift + Enter -> Allow default newline insertion, then resize
        setTimeout(() => this.resizeTextarea(), 0);
      } else {
        // Plain Enter -> Submit message
        event.preventDefault();
        this.submitMessage();
      }
    }
  }

  onInput() {
    this.resizeTextarea();
  }

  resizeTextarea() {
    const textarea = this.chatTextarea?.nativeElement;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 42), 180);
    textarea.style.height = `${newHeight}px`;
  }

  resetTextareaHeight() {
    const textarea = this.chatTextarea?.nativeElement;
    if (!textarea) return;
    textarea.style.height = '42px';
  }

  selectPrompt(promptText: string) {
    this.question = promptText;
    this.submitMessage();
  }

  sendMessage(event?: Event) {
    if (event) event.preventDefault();
    this.submitMessage();
  }

  async submitMessage() {
    if (!this.question.trim() || !this.selectedProject() || this.isLoading()) return;

    const userQ = this.question.trim();
    this.messages.update(m => [...m, { role: 'user', content: userQ }]);
    this.question = '';
    this.resetTextareaHeight();
    this.isLoading.set(true);

    setTimeout(() => this.scrollToBottom(), 100);

    this.aiService.chat(this.selectedProject()!.id, userQ).subscribe({
      next: async (res) => {
        const rawHtml = await marked(res.answer);
        const cleanHtml = this.sanitizeMarkdown(rawHtml);
        
        this.messages.update(m => [...m, { 
          role: 'ai', 
          content: cleanHtml,
          filesUsed: res.filesUsed
        }]);
        this.isLoading.set(false);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        console.error('Chat error', err);
        this.messages.update(m => [...m, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }]);
        this.isLoading.set(false);
      }
    });
  }

  // Event delegation to handle "Copy Code" clicks on dynamically rendered markdown
  handleMessageAreaClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const copyBtn = target.closest('.copy-code-btn') as HTMLButtonElement | null;
    if (!copyBtn) return;

    const codeWrapper = copyBtn.closest('.code-block-wrapper');
    const codeEl = codeWrapper?.querySelector('code');
    const codeText = codeEl?.textContent || '';
    if (!codeText) return;

    navigator.clipboard.writeText(codeText).then(() => {
      copyBtn.classList.add('copied');
      const label = copyBtn.querySelector('.copy-label');
      if (label) label.textContent = 'Copied!';

      setTimeout(() => {
        copyBtn.classList.remove('copied');
        if (label) label.textContent = 'Copy';
      }, 2000);
    });
  }

  // Map file extension to visually distinctive tag colors
  getFileTypeInfo(filePath: string): { ext: string; color: string; bg: string } {
    const ext = (filePath.split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'ts':
        return { ext: 'TS', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'js':
        return { ext: 'JS', color: '#facc15', bg: 'rgba(234, 179, 8, 0.15)' };
      case 'html':
        return { ext: 'HTML', color: '#fb923c', bg: 'rgba(249, 115, 22, 0.15)' };
      case 'css':
      case 'scss':
        return { ext: 'CSS', color: '#f472b6', bg: 'rgba(236, 72, 153, 0.15)' };
      case 'json':
        return { ext: 'JSON', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'py':
        return { ext: 'PY', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'md':
        return { ext: 'MD', color: '#cbd5e1', bg: 'rgba(203, 213, 225, 0.15)' };
      case 'sql':
        return { ext: 'SQL', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' };
      default:
        return { ext: ext.toUpperCase() || 'FILE', color: '#94a3b8', bg: 'rgba(255, 255, 255, 0.08)' };
    }
  }

  // Open the file preview drawer for a citation
  openFilePreview(filePath: string) {
    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    const project = this.selectedProject();

    this.activePreviewFile.set({
      name: fileName,
      path: filePath,
      content: '',
      lineCount: 0,
      loading: true,
      copied: false
    });

    if (!project) return;

    this.http.get<any[]>(`${environment.apiUrl}/files/search?projectId=${project.id}&q=${encodeURIComponent(fileName)}`).subscribe({
      next: (results) => {
        const match = results?.find(f => f.path.includes(filePath) || filePath.includes(f.path)) || results?.[0];
        const content = match?.content || '// Full content preview is not stored in the indexing cache for this file.\n// You can reference the file directly at the path indicated above.';
        const lines = content.split('\n').length;
        
        this.activePreviewFile.update(curr => curr ? {
          ...curr,
          content,
          lineCount: lines,
          loading: false
        } : null);
      },
      error: () => {
        this.activePreviewFile.update(curr => curr ? {
          ...curr,
          content: '// Unable to fetch file preview from server.\n// Use the copy path button above to open it locally.',
          lineCount: 1,
          loading: false
        } : null);
      }
    });
  }

  closeFilePreview() {
    this.activePreviewFile.set(null);
  }

  copyPreviewPath() {
    const current = this.activePreviewFile();
    if (!current) return;
    navigator.clipboard.writeText(current.path).then(() => {
      this.activePreviewFile.update(curr => curr ? { ...curr, copied: true } : null);
      setTimeout(() => {
        this.activePreviewFile.update(curr => curr ? { ...curr, copied: false } : null);
      }, 2000);
    });
  }

  scrollToBottom() {
    const el = document.getElementById('chat-messages');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
