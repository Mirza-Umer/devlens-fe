import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SidebarComponent, ChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
