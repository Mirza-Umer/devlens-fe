import { Component, inject, signal, ViewEncapsulation, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { AiService } from '../../services/ai.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  filesUsed?: string[];
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="chat-container">
      <div class="chat-header glass-panel">
        <h2 *ngIf="selectedProject()">Project: {{ selectedProject()?.name }}</h2>
        <h2 *ngIf="!selectedProject()" class="text-muted">Select a project to start chatting</h2>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <div *ngIf="messages().length === 0 && selectedProject()" class="empty-state">
          <h3>How can I help you with {{ selectedProject()?.name }}?</h3>
          <p>Ask me to explain the codebase, find where a feature is implemented, or how to use a specific service.</p>
        </div>

        <div *ngFor="let msg of messages()" class="message-wrapper" [class.user]="msg.role === 'user'">
          <div class="message" [class.user-message]="msg.role === 'user'" [class.ai-message]="msg.role === 'ai'">
            <div class="avatar">{{ msg.role === 'user' ? 'U' : 'AI' }}</div>
            <div class="message-content">
              <div *ngIf="msg.role === 'user'">{{ msg.content }}</div>
              <div *ngIf="msg.role === 'ai'" class="markdown-body" [innerHTML]="msg.content"></div>
              
              <div *ngIf="msg.filesUsed && msg.filesUsed.length > 0" class="files-used-section">
                <h4>Files referenced:</h4>
                <div class="files-list">
                  <span class="file-chip" *ngFor="let file of msg.filesUsed">{{ file }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div *ngIf="isLoading()" class="message-wrapper">
          <div class="message ai-message loading-indicator">
            <div class="avatar">AI</div>
            <div class="message-content">
              <div class="typing-dots"><span>.</span><span>.</span><span>.</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area glass-panel" *ngIf="selectedProject()">
        <form (submit)="sendMessage($event)" class="input-form">
          <input 
            type="text" 
            class="input-field chat-input" 
            [(ngModel)]="question" 
            name="question" 
            placeholder="Ask about your codebase..." 
            autocomplete="off"
            [disabled]="isLoading()">
          <button type="submit" class="btn btn-primary send-btn" [disabled]="!question.trim() || isLoading()">
            Send
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
      background: var(--bg-primary);
    }
    .chat-header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border-color);
      z-index: 10;
    }
    .chat-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
    }
    .text-muted {
      color: var(--text-muted);
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .empty-state {
      margin: auto;
      text-align: center;
      color: var(--text-secondary);
      max-width: 500px;
    }
    .empty-state h3 {
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }
    .message-wrapper {
      display: flex;
      width: 100%;
    }
    .message-wrapper.user {
      justify-content: flex-end;
    }
    .message {
      display: flex;
      gap: 1rem;
      max-width: 80%;
      padding: 1.25rem;
      border-radius: 12px;
      animation: fadeIn 0.3s ease-in-out;
    }
    .user-message {
      background: var(--accent-primary);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .ai-message {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-bottom-left-radius: 4px;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
      flex-shrink: 0;
    }
    .message-content {
      flex: 1;
      overflow: hidden;
    }
    .files-used-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .files-used-section h4 {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .files-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .file-chip {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: monospace;
      color: var(--text-secondary);
    }
    .chat-input-area {
      padding: 1.5rem 2rem;
      border-top: 1px solid var(--border-color);
    }
    .input-form {
      display: flex;
      gap: 1rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .chat-input {
      flex: 1;
      padding: 1rem 1.25rem;
      font-size: 1rem;
      border-radius: 24px;
    }
    .send-btn {
      padding: 0 1.5rem;
      border-radius: 24px;
      font-weight: 600;
    }
    
    .typing-dots span {
      animation: blink 1.4s infinite both;
      font-size: 1.5rem;
      line-height: 1;
    }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes blink {
      0% { opacity: 0.2; }
      20% { opacity: 1; }
      100% { opacity: 0.2; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ChatComponent {
  private projectService = inject(ProjectService);
  private aiService = inject(AiService);

  selectedProject = this.projectService.selectedProject;
  
  messages = signal<ChatMessage[]>([]);
  question = '';
  isLoading = signal(false);

  constructor() {
    // React to selected project changes
    effect(() => {
      const project = this.selectedProject();
      if (project) {
        this.loadHistory(project.id);
      } else {
        this.messages.set([]);
      }
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
              content = DOMPurify.sanitize(rawHtml);
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

  async sendMessage(event: Event) {
    event.preventDefault();
    if (!this.question.trim() || !this.selectedProject() || this.isLoading()) return;

    const userQ = this.question;
    this.messages.update(m => [...m, { role: 'user', content: userQ }]);
    this.question = '';
    this.isLoading.set(true);

    setTimeout(() => this.scrollToBottom(), 100);

    this.aiService.chat(this.selectedProject()!.id, userQ).subscribe({
      next: async (res) => {
        // Parse markdown to HTML securely
        const rawHtml = await marked(res.answer);
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        
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

  scrollToBottom() {
    const el = document.getElementById('chat-messages');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
