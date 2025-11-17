import { Component, HostListener, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header-menu',
  standalone: true,
  templateUrl: './header-menu.component.html',
  styleUrls: ['./header-menu.component.css'],
  imports: [CommonModule, RouterModule]
})
export class HeaderMenuComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // Sidebar
  collapsed = signal<boolean>(false);

  // Usuario
  userNombre: string = 'Usuario';
  userRol: string = 'Usuario';

  /** URL cruda que venga del usuario (foto_url o fotoUrl) */
  private fotoUrlCruda: string | null = null;

  /** Fallback inline para evitar 404 y parpadeo */
  private readonly DEFAULT_AVATAR =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#41b883"/>
            <stop offset="1" stop-color="#5fd3a8"/>
          </linearGradient>
        </defs>
        <rect width="96" height="96" rx="16" fill="#0b111a"/>
        <circle cx="48" cy="38" r="18" fill="url(#g)"/>
        <rect x="18" y="60" width="60" height="22" rx="11" fill="url(#g)" opacity="0.7"/>
      </svg>
    `);

  /** URL efectiva que usan los <img> */
  currentFotoUrl: string = this.DEFAULT_AVATAR;

  /** Evita cambiar src múltiples veces en onerror */
  private fallbackApplied = false;

  // Swipe
  private touchStartX = 0;
  private touchStartY = 0;
  private swiping = false;

  ngOnInit(): void {
    // ===== Header offset global (para que nada se pegue) =====
    document.body.classList.add('has-topbar');
    // Sincroniza la variable --topbar-h con la altura real del header
    this.updateTopbarVar();

    // Estado sidebar
    const raw = localStorage.getItem('sidebar_collapsed');
    if (raw === '1') this.collapsed.set(true);
    this.applyBodyClasses();

    // Datos de usuario
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

      this.userNombre =
        [usuario?.nombre, usuario?.apellido]
          .filter(Boolean)
          .join(' ')
          .trim() || usuario?.nombre || 'Usuario';

      this.userRol = usuario?.rol || 'Usuario';

      // Acepta foto_url o fotoUrl
      const fotoCandidata = (usuario?.foto_url || usuario?.fotoUrl || '').toString().trim();
      this.fotoUrlCruda = fotoCandidata || null;

      if (this.fotoUrlCruda) {
        this.currentFotoUrl = this.fotoUrlCruda; // usa foto del usuario
      } else {
        this.currentFotoUrl = this.DEFAULT_AVATAR; // fallback inline
      }
    } catch (e) {
      console.warn('⚠️ Error al cargar usuario:', e);
      this.currentFotoUrl = this.DEFAULT_AVATAR;
    }
  }

  ngOnDestroy(): void {
    // Limpieza por si el componente se desmonta
    document.body.classList.remove('has-topbar');
  }

  /** Calcula y fija --topbar-h según la altura real del header */
  private updateTopbarVar(): void {
    // Espera al paint para tener altura correcta
    requestAnimationFrame(() => {
      const header = document.querySelector<HTMLElement>('header.topbar-glass');
      if (header) {
        const h = header.offsetHeight;
        document.documentElement.style.setProperty('--topbar-h', `${h}px`);
      }
    });
  }

  /** Recalcula en cambios de tamaño (rotación móvil, etc.) */
  @HostListener('window:resize')
  onResize(): void {
    this.updateTopbarVar();
  }

  /** Fallback robusto: solo aplica una vez y cambia a data-URL */
  onImgError(ev: Event) {
    if (this.fallbackApplied) return;
    this.fallbackApplied = true;
    const img = ev.target as HTMLImageElement;
    img.src = this.DEFAULT_AVATAR;
    this.currentFotoUrl = this.DEFAULT_AVATAR;
  }

  // ===== Sidebar =====
  toggleSidebar(): void {
    const isNowCollapsed = !this.collapsed();
    this.collapsed.set(isNowCollapsed);
    localStorage.setItem('sidebar_collapsed', isNowCollapsed ? '1' : '0');
    this.applyBodyClasses();
  }

  private applyBodyClasses(): void {
    document.body.classList.add('has-sidebar');
    if (this.collapsed()) document.body.classList.add('sidebar-compact');
    else document.body.classList.remove('sidebar-compact');
  }

  // ===== Navegación =====
  goToProfile(): void {
    const rolLower = (this.userRol || '').toLowerCase();
    let path = '/perfil';
    if (rolLower.includes('entrenador')) path = '/entrenador/perfil';
    this.router.navigate([path]);
  }

  goHome(): void {
    const rolLower = (this.userRol || '').toLowerCase();
    let path = '/cliente';
    if (rolLower.includes('entrenador')) path = '/entrenador/home';
    this.router.navigate([path]);
  }

  // ===== Swipe =====
  @HostListener('touchstart', ['$event'])
  onTouchStart(ev: TouchEvent): void {
    if (!ev.touches || ev.touches.length !== 1) return;
    const t = ev.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.swiping = this.touchStartX < 30 || !this.collapsed();
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(ev: TouchEvent): void {
    if (!this.swiping) return;
    const t = ev.touches[0];
    const dx = Math.abs(t.clientX - this.touchStartX);
    const dy = Math.abs(t.clientY - this.touchStartY);
    if (dx > 12 && dy < 20) ev.preventDefault();
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(ev: TouchEvent): void {
    if (!this.swiping) return;
    const ch = ev.changedTouches?.[0];
    if (!ch) return;
    const dx = ch.clientX - this.touchStartX;
    if (!this.collapsed() && dx < -50) this.toggleSidebar();
    if (this.collapsed() && this.touchStartX < 30 && dx > 50) this.toggleSidebar();
    this.swiping = false;
  }

  goToNuevaConversacion(): void {
  this.router.navigate(['/mensajes/nueva']);
}

}
