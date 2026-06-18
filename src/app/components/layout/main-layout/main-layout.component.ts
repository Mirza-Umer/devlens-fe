import { Component } from '@angular/core';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { ChatComponent } from '../../chat/chat.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [SidebarComponent, ChatComponent],
  template: `
    <div class="app-layout">
      <app-sidebar></app-sidebar>
      <main class="main-content">
        <app-chat></app-chat>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--surface-0, #0a0a0a);
      color: var(--text-color, #ffffff);
    }
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
    }
  `]
})
export class MainLayoutComponent {}
