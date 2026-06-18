import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout.component';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: '', 
    component: MainLayoutComponent, 
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];
