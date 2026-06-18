import { Component, inject, signal, ViewEncapsulation, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { AiService } from '../../services/ai.service';
import { DashboardComponent } from '../dashboard/dashboard.component';
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
  imports: [CommonModule, FormsModule, DashboardComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  private projectService = inject(ProjectService);
  private aiService = inject(AiService);

  selectedProject = this.projectService.selectedProject;
  
  messages = signal<ChatMessage[]>([]);
  question = '';
  isLoading = signal(false);

  constructor() {
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
